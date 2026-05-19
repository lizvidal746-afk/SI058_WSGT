// ============================================================
// scripts/carnet.js
// Ejecución aislada: solo endpoint Carnet/consulta
// Uso: powershell -File tools/run-k6.ps1 scripts/carnet.js
// Escenarios: k6 run -e SCENARIO=smoke scripts/carnet.js
// ============================================================

import { sleep } from 'k6';
import { consultaCarnet }    from '../lib/requests/carnet.js';
import { getScenario }       from '../lib/scenarios.js';
import { summaryTrendStats } from '../config/thresholds.js';
import { getCarnetUser }     from '../lib/users.js';
import { TAGS, cloudOptions, LOCAL_IPS } from '../config/env.js';
import { buildHandleSummary } from '../lib/summary.js';

const SCENARIO_NAME = __ENV.SCENARIO || 'smoke';
const selectedScenario = getScenario(SCENARIO_NAME);

if (!selectedScenario || selectedScenario.error) {
  throw new Error(`Escenario inválido: '${SCENARIO_NAME}'. Opciones: smoke, load, stress, spike, soak, cp01, cp02, cp03, collapse, multi_ip_audit`);
}

const thresholdByScenario = {
  smoke: {
    'http_req_failed': ['rate<0.01'],
    'http_req_duration': ['p(95)<1500'],
    'http_req_duration{endpoint:carnet_consulta}': ['p(95)<1500'],
    'checks': ['rate>0.99'],
  },
  multi_ip_audit: {
    'http_req_failed': ['rate<0.01'],
    'http_req_duration': ['p(95)<1500'],
    'http_req_duration{endpoint:carnet_consulta}': ['p(95)<1500'],
    'checks': ['rate>0.99'],
  },
  load: {
    'http_req_failed': ['rate<0.01'],
    'http_req_duration': ['p(95)<1500', 'p(99)<2500'],
    'http_req_duration{endpoint:carnet_consulta}': ['p(95)<1500'],
    'checks': ['rate>0.99'],
    'apdex_score': ['avg>0.90'],
  },
  cp02: {
    'http_req_failed': ['rate<0.01'],
    'http_req_duration': ['p(95)<1500', 'p(99)<2500'],
    'http_req_duration{endpoint:carnet_consulta}': ['p(95)<1500'],
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
  tags: Object.assign({ test_type: 'performance', endpoint_focus: 'carnet', scenario_active: SCENARIO_NAME }, TAGS),
  cloud: cloudOptions(`carnet-${SCENARIO_NAME}`),
};

// Inyectar thresholds dinámicos por IP para forzar a k6 a exportar sub-métricas en el JSON final
if (LOCAL_IPS && LOCAL_IPS.length > 1) {
  LOCAL_IPS.forEach(ip => {
    options.thresholds[`http_req_duration{source_ip:${ip}}`] = ['p(95)>0'];
    options.thresholds[`http_req_failed{source_ip:${ip}}`]   = ['rate>=0']; 
    options.thresholds[`ttfb_ms{source_ip:${ip}}`]           = ['p(95)>=0'];
    options.thresholds[`http_req_blocked{source_ip:${ip}}`]  = ['avg>=0'];
    options.thresholds[`http_req_tls_handshaking{source_ip:${ip}}`] = ['avg>=0'];
  });
}

// Inyectar thresholds dinámicos para recolectar códigos HTTP comunes
// (Solo los que ocurran realmente se mostrarán en los reportes)
const observedStatuses = [200, 201, 301, 302, 304, 400, 401, 403, 404, 429, 500, 502, 503, 504];
observedStatuses.forEach(st => {
  options.thresholds[`http_reqs{status:${st}}`] = ['count>=0'];
});

export default function () {
  consultaCarnet(getCarnetUser());

  const defaultThink = ['load', 'soak', 'stress', 'spike'].includes(SCENARIO_NAME) ? 1 : 0;
  const thinkTime = parseFloat(__ENV.K6_THINK_TIME_SECONDS || String(defaultThink));
  if (thinkTime > 0 && !['cp03', 'collapse'].includes(SCENARIO_NAME)) {
    sleep(thinkTime);
  }
}

export function teardown() {
  console.log(`[TEARDOWN] Carnet · Escenario: ${SCENARIO_NAME}`);
}

export const handleSummary = buildHandleSummary(`carnet-${SCENARIO_NAME}`, {
  ipMode:   (LOCAL_IPS && LOCAL_IPS.length > 1) ? 'multi' : 'single',
  sourceIp: (LOCAL_IPS && LOCAL_IPS.length > 1) ? 'auto' : (__ENV.SUNEDU_IP_1 || __ENV.K6_SOURCE_IP || 'auto'),
  localIps: LOCAL_IPS,
});
