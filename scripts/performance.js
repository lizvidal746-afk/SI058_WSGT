// ============================================================
// scripts/performance.js
// Script Maestro de Rendimiento SI058 - Modular e Inteligente
// Uso: k6 run -e SCENARIO=smoke scripts/performance.js
// Escenarios: smoke, load, stress, spike, soak, cp01, cp02, cp03, collapse
// ============================================================

import { sleep } from 'k6';
import { consultaCarnet }       from '../lib/requests/carnet.js';
import { consultaGrados }       from '../lib/requests/grados.js';
import { solicitarRecuperacion } from '../lib/requests/clienteResetToken.js';
import { getScenario }          from '../lib/scenarios.js';
import { summaryTrendStats }    from '../config/thresholds.js';
import { getCarnetUser, getGradosUser, getResetUser } from '../lib/users.js';
import { TAGS, cloudOptions, LOCAL_IPS }   from '../config/env.js';
import { buildHandleSummary }   from '../lib/summary.js';

// 1. CONFIGURACIÓN DINÁMICA
// ------------------------------------------------------------
const SCENARIO_NAME = __ENV.SCENARIO;

if (!SCENARIO_NAME) {
  throw new Error("ERROR: Debe especificar un escenario. Ejemplo: k6 run -e SCENARIO=smoke scripts/performance.js");
}

const selectedScenario = getScenario(SCENARIO_NAME);

// Validación de escenario existente en la factory
if (Object.keys(selectedScenario).length === 0 || selectedScenario.error) {
  throw new Error(`ERROR: El escenario '${SCENARIO_NAME}' no es válido. Opciones: smoke, load, stress, spike, soak, cp01, cp02, cp03, collapse`);
}

const thresholdByScenario = {
  smoke: {
    'http_req_failed': ['rate<0.01'],
    'http_req_duration': ['p(95)<1500'],
    'http_req_duration{endpoint:carnet_consulta}': ['p(95)<1500'],
    'http_req_duration{endpoint:grados_consulta}': ['p(95)<1500'],
    'checks': ['rate>0.99'],
  },
  load: {
    'http_req_failed': ['rate<0.01'],
    'http_req_duration': ['p(95)<1500', 'p(99)<2500'],
    'http_req_duration{endpoint:carnet_consulta}': ['p(95)<1500'],
    'http_req_duration{endpoint:grados_consulta}': ['p(95)<1500'],
    'checks': ['rate>0.99'],
    'apdex_score': ['avg>0.90'],
  },
  soak: {
    'http_req_failed': ['rate<0.01'],
    'http_req_duration': ['p(95)<1800', 'p(99)<3000'],
    'checks': ['rate>0.99'],
    'apdex_score': ['avg>0.90'],
  },
  stress: {
    'http_req_failed': ['rate<0.10'],
    'http_req_duration': ['p(95)<3000'],
    'checks': ['rate>0.90'],
  },
  spike: {
    'http_req_failed': ['rate<0.15'],
    'http_req_duration': ['p(95)<3500'],
    'checks': ['rate>0.85'],
  },
  cp01: {
    'http_req_duration': [{ threshold: 'p(95)<3000', abortOnFail: false }],
    'http_req_failed': [{ threshold: 'rate<0.25', abortOnFail: false }],
    'checks': [{ threshold: 'rate>0.75', abortOnFail: false }],
    'rate_limited_requests': [{ threshold: 'count>=0', abortOnFail: false }],
  },
  cp02: {
    'http_req_failed': ['rate<0.01'],
    'http_req_duration': ['p(95)<1500', 'p(99)<2500'],
    'checks': ['rate>0.99'],
    'apdex_score': ['avg>0.90'],
  },
  cp03: {
    'http_req_duration': [{ threshold: 'p(95)<5000', abortOnFail: false }],
    'http_req_failed': [{ threshold: 'rate<0.30', abortOnFail: false }],
    'checks': [{ threshold: 'rate>0.70', abortOnFail: false }],
  },
  collapse: {
    'http_req_duration': [{ threshold: 'p(95)<8000', abortOnFail: false }],
    'http_req_failed': [{ threshold: 'rate<0.60', abortOnFail: false }],
    'checks': [{ threshold: 'rate>0.40', abortOnFail: false }],
  },
};

export const options = {
  scenarios: selectedScenario,
  thresholds: thresholdByScenario[SCENARIO_NAME] || thresholdByScenario.stress,
  summaryTrendStats,
  tags: Object.assign({ 
    test_type: 'performance', 
    scenario_active: SCENARIO_NAME 
  }, TAGS),
  cloud: cloudOptions(`perf-${SCENARIO_NAME}`),
};

// Inyectar thresholds dinámicos por IP para que k6 genere métricas por IP en el JSON
if (LOCAL_IPS && LOCAL_IPS.length > 1) {
  LOCAL_IPS.forEach(ip => {
    options.thresholds[`http_req_duration{source_ip:${ip}}`] = ['p(95)>=0'];
    options.thresholds[`http_req_failed{source_ip:${ip}}`]   = ['rate>=0']; 
    options.thresholds[`ttfb_ms{source_ip:${ip}}`]           = ['p(95)>=0'];
  });
}

const observedStatuses = [200, 201, 301, 302, 304, 400, 401, 403, 404, 429, 500, 502, 503, 504];
observedStatuses.forEach(st => {
  options.thresholds[`http_reqs{status:${st}}`] = ['count>=0'];
});

// 2. FUNCIÓN PRINCIPAL (LÓGICA DE NEGOCIO)
// ------------------------------------------------------------
export default function () {
  const FOCUS = __ENV.FOCUS || 'mix';
  const carnetRatio = Math.min(Math.max(parseFloat(__ENV.MIX_CARNET_RATIO || '0.70'), 0), 1);

  if (FOCUS === 'carnet') {
    consultaCarnet(getCarnetUser());
  } 
  else if (FOCUS === 'grados') {
    consultaGrados(getGradosUser());
  } 
  else if (FOCUS === 'reset') {
    solicitarRecuperacion(getResetUser());
  } 
  else {
    if (Math.random() < carnetRatio) {
      consultaCarnet(getCarnetUser());
    } else {
      consultaGrados(getGradosUser());
    }
  }

  const defaultThink = ['load', 'soak', 'stress', 'spike'].includes(SCENARIO_NAME) ? 1 : 0;
  const thinkTime = parseFloat(__ENV.K6_THINK_TIME_SECONDS || String(defaultThink));
  if (thinkTime > 0 && !['cp03', 'collapse'].includes(SCENARIO_NAME)) {
    sleep(thinkTime);
  }
}

// 3. REPORTE FINAL Y CIERRE (TEARDOWN)
// ------------------------------------------------------------
export function teardown(data) {
  console.log(`[TEARDOWN] Finalizando prueba SI058 - Escenario: ${SCENARIO_NAME}`);
  console.log(`[INFO] Las sesiones y sockets han sido cerrados. Validar limpieza de tokens en BD si aplica.`);
}

export const handleSummary = buildHandleSummary(`perf-${SCENARIO_NAME}`, {
  ipMode: (LOCAL_IPS && LOCAL_IPS.length > 1) ? 'multi' : 'single',
  sourceIp: (LOCAL_IPS && LOCAL_IPS.length > 1) ? 'auto' : (__ENV.SUNEDU_IP_1 || __ENV.K6_SOURCE_IP || 'auto'),
  localIps: LOCAL_IPS,
});
