import { cloudOptions, LOCAL_IPS, TAGS } from '../config/env.js';
import { OBSERVABLE_STATUS_CODES } from '../config/status-codes.js';
import { summaryTrendStats } from '../config/thresholds.js';
import { getScenario } from './scenarios.js';
import { buildHandleSummary } from './summary.js';

// Centralización de todos los thresholds por escenario que estaban repetidos.
export const COMMON_THRESHOLDS = {
  smoke: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500'],
    'http_req_duration{endpoint:carnet_consulta}': ['p(95)<1500'],
    'http_req_duration{endpoint:grados_consulta}': ['p(95)<1500'],
    checks: ['rate>0.99'],
  },
  multi_ip_audit: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500'],
    'http_req_duration{endpoint:carnet_consulta}': ['p(95)<1500'],
    'http_req_duration{endpoint:grados_consulta}': ['p(95)<1500'],
    checks: ['rate>0.99'],
  },
  load: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500', 'p(99)<2500'],
    'http_req_duration{endpoint:carnet_consulta}': ['p(95)<1500'],
    'http_req_duration{endpoint:grados_consulta}': ['p(95)<1500'],
    checks: ['rate>0.99'],
    apdex_score: ['avg>0.90'],
  },
  cp02: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500', 'p(99)<2500'],
    'http_req_duration{endpoint:carnet_consulta}': ['p(95)<1500'],
    'http_req_duration{endpoint:grados_consulta}': ['p(95)<1500'],
    checks: ['rate>0.99'],
    apdex_score: ['avg>0.90'],
  },
  soak: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1800', 'p(99)<3000'],
    checks: ['rate>0.99'],
    apdex_score: ['avg>0.90'],
  },
  stress: {
    http_req_failed: ['rate<0.10'],
    http_req_duration: ['p(95)<3000'],
    checks: ['rate>0.90'],
  },
  spike: {
    http_req_failed: ['rate<0.15'],
    http_req_duration: ['p(95)<3500'],
    checks: ['rate>0.85'],
  },
  cp01: {
    http_req_duration: [{ threshold: 'p(95)<3000', abortOnFail: false }],
    http_req_failed: [{ threshold: 'rate<0.25', abortOnFail: false }],
    checks: [{ threshold: 'rate>0.75', abortOnFail: false }],
    rate_limited_requests: [{ threshold: 'count>=0', abortOnFail: false }],
  },
  cp03: {
    http_req_duration: [{ threshold: 'p(95)<5000', abortOnFail: false }],
    http_req_failed: [{ threshold: 'rate<0.30', abortOnFail: false }],
    checks: [{ threshold: 'rate>0.70', abortOnFail: false }],
  },
  collapse: {
    http_req_duration: [{ threshold: 'p(95)<8000', abortOnFail: false }],
    http_req_failed: [{ threshold: 'rate<0.60', abortOnFail: false }],
    checks: [{ threshold: 'rate>0.40', abortOnFail: false }],
  },
};

/**
 * Construye el objeto `options` para k6 centralizando toda la lógica.
 *
 * @param {string} endpointName - El nombre del endpoint ('carnet', 'grados', 'perf')
 * @returns {object} Opciones de k6 y metadatos adicionales
 */
export function buildK6Options(endpointName) {
  const SCENARIO_NAME = __ENV.SCENARIO || 'smoke';
  const selectedScenario = getScenario(SCENARIO_NAME);

  if (!selectedScenario || selectedScenario.error) {
    throw new Error(
      `Escenario inválido: '${SCENARIO_NAME}'. Opciones: smoke, load, stress, spike, soak, cp01, cp02, cp03, collapse, multi_ip_audit`,
    );
  }

  // Base options
  const options = {
    scenarios: selectedScenario,
    thresholds: Object.assign({}, COMMON_THRESHOLDS[SCENARIO_NAME] || COMMON_THRESHOLDS.stress),
    summaryTrendStats,
    tags: Object.assign(
      {
        test_type: 'performance',
        endpoint_focus: endpointName,
        scenario_active: SCENARIO_NAME,
      },
      TAGS,
    ),
    cloud: cloudOptions(`${endpointName}-${SCENARIO_NAME}`),
  };

  // Inyectar thresholds dinámicos por IP
  if (LOCAL_IPS && LOCAL_IPS.length > 1) {
    LOCAL_IPS.forEach((ip) => {
      options.thresholds[`http_req_duration{source_ip:${ip}}`] = ['p(95)>=0'];
      options.thresholds[`http_req_failed{source_ip:${ip}}`] = ['rate>=0'];
      options.thresholds[`ttfb_ms{source_ip:${ip}}`] = ['p(95)>=0'];
      options.thresholds[`http_req_blocked{source_ip:${ip}}`] = ['avg>=0'];
      options.thresholds[`http_req_tls_handshaking{source_ip:${ip}}`] = ['avg>=0'];
    });
  }

  // Inyectar thresholds de status codes observables
  OBSERVABLE_STATUS_CODES.forEach((st) => {
    options.thresholds[`http_reqs{status:${st}}`] = ['count>=0'];
  });

  return {
    options,
    SCENARIO_NAME,
    handleSummary: buildHandleSummary(`${endpointName}-${SCENARIO_NAME}`, {
      ipMode: LOCAL_IPS && LOCAL_IPS.length > 1 ? 'multi' : 'single',
      sourceIp: LOCAL_IPS && LOCAL_IPS.length > 1 ? 'auto' : __ENV.SUNEDU_IP_1 || __ENV.K6_SOURCE_IP || 'auto',
      localIps: LOCAL_IPS,
    }),
  };
}

/**
 * Devuelve el tiempo de think time apropiado para el escenario.
 */
export function getThinkTime(scenarioName) {
  const defaultThink = ['load', 'soak', 'stress', 'spike'].includes(scenarioName) ? 1 : 0;
  return parseFloat(__ENV.K6_THINK_TIME_SECONDS || String(defaultThink));
}
