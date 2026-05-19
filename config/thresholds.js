// ============================================================
// config/thresholds.js
// Umbrales (SLOs) alineados a normas internacionales:
//
// - ISO/IEC 25010:2011  Eficiencia de desempeno -> Comportamiento temporal
// - ISO/IEC 25023:2016  Metricas de calidad (tiempo de respuesta, tasa de fallos)
// - ISTQB CTFL-PT 2018  Performance Testing (smoke/load/stress/breakpoint)
// - Google SRE          Golden Signals (Latency, Traffic, Errors, Saturation)
//
// Filosofia: el promedio MIENTE. Se priorizan percentiles (p95, p99) que
// reflejan la experiencia real del peor 5% de usuarios.
// ============================================================

export const thresholds = {

  // ----------------------------------------------------------
  // SMOKE - Validacion basica de humo. Debe pasar SIEMPRE.
  // Objetivo: detectar errores triviales antes de cargar.
  // ----------------------------------------------------------
  smoke: {
    'http_req_duration':                              ['p(95)<1500'],
    'http_req_duration{endpoint:carnet_consulta}':    ['p(95)<1500'],
    'http_req_duration{endpoint:grados_consulta}':    ['p(95)<1500'],
    'http_req_failed':                               ['rate<0.01'],
    'http_req_failed{endpoint:carnet_consulta}':      ['rate<0.01'],
    'http_req_failed{endpoint:grados_consulta}':      ['rate<0.01'],
    'checks':                                        ['rate>0.99'],
  },

  // ----------------------------------------------------------
  // LOAD - Carga esperada de produccion (operacion normal).
  // ISO 25010: el sistema debe sostener esta carga sin degradar.
  // ----------------------------------------------------------
  load: {
    'http_req_duration':                              ['p(95)<800', 'p(99)<1500', 'avg<500'],
    'http_req_duration{endpoint:carnet_consulta}':    ['p(95)<800'],
    'http_req_duration{endpoint:grados_consulta}':    ['p(95)<800'],
    'http_req_duration{expected:true}':               ['p(95)<800'],
    'http_req_failed':                               ['rate<0.01'],
    'http_req_failed{endpoint:carnet_consulta}':      ['rate<0.01'],
    'http_req_failed{endpoint:grados_consulta}':      ['rate<0.01'],
    'http_req_waiting':                              ['p(95)<700'],
    'checks':                                        ['rate>0.99'],
    'rate_limited_requests':                         ['count<5'],
    'iteration_duration':                            ['p(95)<5000'],
  },

  // ----------------------------------------------------------
  // STRESS - Mas alla del nominal. Se ESPERA degradacion controlada.
  // ----------------------------------------------------------
  stress: {
    'http_req_duration':                              ['p(95)<2000', 'p(99)<5000'],
    'http_req_duration{endpoint:carnet_consulta}':    ['p(95)<2000'],
    'http_req_duration{endpoint:grados_consulta}':    ['p(95)<2000'],
    'http_req_failed':                               ['rate<0.10'],
    'http_req_failed{endpoint:carnet_consulta}':      ['rate<0.10'],
    'http_req_failed{endpoint:grados_consulta}':      ['rate<0.10'],
    'checks':                                        ['rate>0.90'],
  },

  // ----------------------------------------------------------
  // BREAKPOINT - Buscar el punto de quiebre. NO se aborta el test.
  // Los thresholds aqui son "abortOnFail: false" para no cortar.
  // ----------------------------------------------------------
  breakpoint: {
    'http_req_duration': [{ threshold: 'p(95)<3000', abortOnFail: false }],
    'http_req_failed':   [{ threshold: 'rate<0.25',  abortOnFail: false }],
    'checks':            [{ threshold: 'rate>0.80',  abortOnFail: false }],
  },

  // ----------------------------------------------------------
  // SPIKE - Pico repentino (Black Friday, viralizacion, ataque).
  // ----------------------------------------------------------
  spike: {
    'http_req_duration': ['p(95)<3000'],
    'http_req_failed':   ['rate<0.15'],
    'checks':            ['rate>0.85'],
  },
};

// ----------------------------------------------------------
// Stats que se mostraran en el summary final (mas que solo avg).
// Justificacion: el promedio oculta outliers. p99 y stddev los exponen.
// ----------------------------------------------------------
export const summaryTrendStats = ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)', 'count'];
