// ============================================================
// lib/summary.js
// Reporte local profesional sin dependencias remotas.
// Mantiene el HTML autocontenido para redes corporativas/proxy.
// ============================================================
import { SUNEDU_LOGO_B64 } from './logo.js';

const ENDPOINTS = [
  { tag: 'carnet_consulta', label: 'CARNET / CONSULTA', title: 'Carnet' },
  { tag: 'grados_consulta', label: 'GRADOS / CONSULTA', title: 'Grados' },
  { tag: 'reset_solicitar', label: 'RESET / SOLICITAR', title: 'Reset' },
  { tag: 'reset_cambiar', label: 'RESET / CAMBIAR', title: 'Reset' },
];

const SLO = {
  p95: 1500,
  p99: 2000,
  errorRate: 0.01,
  apdex: 0.90,
  checks: 0.99,
  session: 0.99,
  tls: 50,
};

function values(metric) { return metric ? (metric.values || metric) : {}; }
function num(v, fallback = 0) { return (v == null || Number.isNaN(v)) ? fallback : v; }
function fmtMs(v) { return (v == null || Number.isNaN(v)) ? '-' : `${Math.round(v)}ms`; }
function fmtPct(v) { return (v == null || Number.isNaN(v)) ? '-' : `${(v * 100).toFixed(2)}%`; }
function fmtFixed(v, digits = 3) { return (v == null || Number.isNaN(v)) ? '-' : Number(v).toFixed(digits); }
function fmtRate(v) { return (v == null || Number.isNaN(v)) ? '-' : `${Number(v).toFixed(2)}/s`; }
function fmtMb(v) { return (v == null || Number.isNaN(v)) ? '-' : `${(Number(v) / 1048576).toFixed(2)} MB`; }
function fmtMbRate(v) { return (v == null || Number.isNaN(v)) ? '-' : `${(Number(v) / 1048576).toFixed(2)} MB/s`; }
function passIcon(pass) { return pass ? 'OK' : 'REVISAR'; }
function passColor(pass) { return pass ? '#1b5e20' : '#bf360c'; }
function passMark(pass) { return pass ? '&#10004;' : '&#9888;'; }
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function faviconHref() {
  return SUNEDU_LOGO_B64 || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22%3E%3Crect width=%2264%22 height=%2264%22 rx=%2212%22 fill=%22%235b21b6%22/%3E%3Ctext x=%2212%22 y=%2240%22 font-family=%22Arial%22 font-size=%2223%22 font-weight=%22700%22 fill=%22white%22%3Ek6%3C/text%3E%3C/svg%3E';
}

function metric(data, name) {
  return values(data.metrics[name]);
}

function countMetric(data, name) {
  return num(metric(data, name).count, 0);
}

function rateMetric(data, name) {
  const m = metric(data, name);
  return num(m.rate ?? m.value, 0);
}

function limaDate() {
  return new Date().toLocaleString('es-PE', { timeZone: 'America/Lima', hour12: false });
}

function limaTimestampForFile() {
  // Peru is UTC-5 and has no daylight saving time. Avoid Intl here so k6
  // can generate stable filenames even in restricted runtimes.
  const lima = new Date(Date.now() - (5 * 60 * 60 * 1000));
  return lima.toISOString().replace(/T/, '_').replace(/[:.]/g, '-').slice(0, 19);
}

function scenarioName(testName) {
  return (__ENV.SCENARIO || String(testName).split('-').slice(1).join('-') || 'smoke').toLowerCase();
}

function endpointSummaries(data) {
  return ENDPOINTS.map(ep => {
    const dur = metric(data, `http_req_duration{endpoint:${ep.tag}}`);
    const fail = metric(data, `http_req_failed{endpoint:${ep.tag}}`);
    if (!dur.count) return null;
    const errorRate = fail.rate ?? fail.value ?? 0;
    return {
      ...ep,
      reqs: dur.count || 0,
      avg: dur.avg,
      p50: dur.med,
      p90: dur['p(90)'],
      p95: dur['p(95)'],
      p99: dur['p(99)'],
      max: dur.max,
      errorRate,
      sloPass: num(dur['p(95)'], 0) < SLO.p95 && errorRate < SLO.errorRate,
    };
  }).filter(Boolean);
}

function collectChecks(group, out) {
  if (!group) return;
  if (Array.isArray(group.checks)) {
    group.checks.forEach(c => {
      out.push({
        name: c.name || '',
        path: group.path || group.name || '',
        passes: c.passes || 0,
        fails: c.fails || 0,
      });
    });
  } else if (group.checks) {
    Object.keys(group.checks).forEach(key => {
      const c = group.checks[key];
      out.push({
        name: c.name || key,
        path: group.path || group.name || '',
        passes: c.passes || 0,
        fails: c.fails || 0,
      });
    });
  }
  if (group.groups) {
    Object.keys(group.groups).forEach(k => collectChecks(group.groups[k], out));
  }
}

function allChecks(data) {
  const checks = [];
  collectChecks(data.root_group, checks);
  return checks;
}

function endpointCheckStats(checks, ep) {
  const relevant = checks.filter(c => {
    const haystack = `${c.path} ${c.name}`.toLowerCase();
    return haystack.includes(ep.title.toLowerCase()) || haystack.includes(ep.tag.replace('_', '/'));
  });

  const success = relevant
    .filter(c => c.name.includes('[HTTP 200] Success: true'))
    .reduce((sum, c) => sum + c.passes, 0);
  const business = relevant
    .filter(c => c.name.includes('Success: false') || c.name.includes('Límite') || c.name.includes('Limite'))
    .reduce((sum, c) => sum + c.passes + c.fails, 0);
  const gateway429 = relevant
    .filter(c => c.name.includes('[HTTP 429]'))
    .reduce((sum, c) => sum + c.passes + c.fails, 0);
  const unexpected = relevant
    .filter(c => !c.name.includes('[HTTP 200] Success: true') && !c.name.includes('Success: false') && !c.name.includes('[HTTP 429]'))
    .reduce((sum, c) => sum + c.fails, 0);

  return { success, business, gateway429, unexpected };
}

function activeIps(data, localIps) {
  return (localIps || [])
    .map(ip => {
      const dur = metric(data, `http_req_duration{source_ip:${ip}}`);
      const fail = metric(data, `http_req_failed{source_ip:${ip}}`);
      const ttfb = metric(data, `ttfb_ms{source_ip:${ip}}`);
      if (!dur.count) return null;
      return {
        ip,
        reqs: dur.count,
        avg: dur.avg,
        p95: dur['p(95)'],
        p99: dur['p(99)'],
        errorRate: fail.rate ?? fail.value ?? 0,
        ttfb: ttfb.avg,
      };
    })
    .filter(Boolean);
}

function detectedSourceIp(opts, ips) {
  if (ips.length === 1) return ips[0].ip;
  if (opts.sourceIp && opts.sourceIp !== 'auto') return opts.sourceIp;
  return ips.length ? ips.map(x => x.ip).join(', ') : 'auto';
}

function executionMode(testName, opts, ips, endpoints) {
  const scenario = scenarioName(testName);
  if (scenario === 'smoke') {
    return {
      title: 'SMOKE 1-IP (Baseline mínimo)',
      mode: '1-IP Baseline',
      description: 'Esta ejecución usó 1 VU / 1 IP de origen (validación rápida de funcionalidad).',
      hint: 'Para pruebas multi-IP, use los comandos específicos por servicio o el escenario CP02.',
    };
  }
  if (scenario === 'multi_ip_audit') {
    return {
      title: 'AUDITORÍA MULTI-IP',
      mode: 'Multi-IP Audit',
      description: `Esta ejecución validó trazabilidad por IP con ${ips.length || 'N'} IP(s) de origen y ${endpoints.length || 'N'} endpoint(s).`,
      hint: 'Revise que cada IP esperada tenga métricas y sin pérdida de evidencia.',
    };
  }
  return {
    title: `${scenario.toUpperCase()} (${opts.ipMode === 'multi' ? 'Multi-IP' : 'Single-IP'})`,
    mode: opts.ipMode === 'multi' ? 'Multi-IP' : 'Single-IP',
    description: 'Ejecución de rendimiento con métricas agregadas por endpoint, SLO e indicadores SRE.',
    hint: 'Cruce estos resultados con monitoreo de API, gateway y base de datos antes de concluir causa raíz.',
  };
}

function firstEndpointUrl(endpoints) {
  if (!endpoints.length) return '-';
  const ep = endpoints[0].tag === 'carnet_consulta' ? 'Carnet' : endpoints[0].tag === 'grados_consulta' ? 'Grados' : '';
  return ep ? `${__ENV.BASE_URL || 'https://serviciosgytapiqa.sunedu.gob.pe'}/api/${ep}/consulta` : '-';
}

function buildBusinessDistribution(data, endpoints, checks) {
  if (!endpoints.length) {
    return '<div class="empty">Sin métricas por endpoint para distribución HTTP.</div>';
  }

  return endpoints.map(ep => {
    const stats = endpointCheckStats(checks, ep);
    const success = stats.success || (endpoints.length === 1 ? countMetric(data, 'http_reqs{status:200}') : 0);
    const gateway429 = stats.gateway429 || (endpoints.length === 1 ? countMetric(data, 'http_reqs{status:429}') : 0);
    const unexpected = stats.unexpected || (endpoints.length === 1
      ? [400, 401, 403, 404, 500, 502, 503, 504].reduce((sum, st) => sum + countMetric(data, `http_reqs{status:${st}}`), 0)
      : 0);

    return `<div class="http-card">
      <div class="http-card-title">${escapeHtml(ep.label)}</div>
      <table class="compact">
        <tr class="ok-row"><td>&#10004; HTTP 200 - Éxito</td><td>${success}</td></tr>
        <tr><td>&#9888; HTTP 200 - Límite negocio</td><td>${stats.business}</td></tr>
        <tr><td>HTTP 429 - Rate Limit Gateway</td><td>${gateway429}</td></tr>
        <tr><td>&#10060; HTTP 4xx/5xx - Error servidor</td><td>${unexpected}</td></tr>
      </table>
    </div>`;
  }).join('');
}

function buildEndpointDashboard(endpoints) {
  const rows = endpoints.map(ep => `<tr>
    <td class="left strong">${escapeHtml(ep.label)}</td>
    <td>${ep.reqs}</td>
    <td>${fmtMs(ep.avg)}</td>
    <td>${fmtMs(ep.p50)}</td>
    <td>${fmtMs(ep.p90)}</td>
    <td class="slo-cell">${fmtMs(ep.p95)}</td>
    <td>${fmtMs(ep.p99)}</td>
    <td>${fmtPct(ep.errorRate)}</td>
    <td style="color:${passColor(ep.sloPass)};font-weight:700">${passMark(ep.sloPass)} ${passIcon(ep.sloPass)}</td>
  </tr>`).join('');

  return `<table>
    <thead>
      <tr>
        <th class="left">Endpoint</th><th>Reqs</th><th>avg</th><th>p50</th><th>p90</th><th class="slo-head">p95 * SLO</th><th>p99</th><th>Error %</th><th>Estado SLO</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="9" class="empty">Sin métricas por endpoint</td></tr>'}</tbody>
  </table>`;
}

function buildMasterDashboard(data) {
  const dur = metric(data, 'http_req_duration');
  const fail = metric(data, 'http_req_failed');
  const checks = metric(data, 'checks');
  const reqs = metric(data, 'http_reqs');
  const ttfb = metric(data, 'http_req_waiting');
  const blocked = metric(data, 'http_req_blocked');
  const tls = metric(data, 'http_req_tls_handshaking');
  const apdex = metric(data, 'apdex_score');
  const session = metric(data, 'session_success_rate');

  const p95Pass = num(dur['p(95)'], Infinity) < SLO.p95;
  const p99Pass = num(dur['p(99)'], Infinity) < SLO.p99;
  const errorPass = (fail.rate ?? fail.value ?? 0) < SLO.errorRate;
  const apdexPass = num(apdex.avg, 0) >= SLO.apdex;
  const checksPass = (checks.rate ?? checks.value ?? 0) >= SLO.checks;
  const sessionPass = (session.rate ?? session.value ?? 0) >= SLO.session;

  return `<table class="master">
    <tr>
      <th>Categoría</th><th>Total<br>Reqs</th><th>Promedio<br>(avg)</th><th>Mediana<br>(p50)</th><th>p90</th><th class="slo-head">p95 *<br>SLO</th><th>p99<br>(Cola)</th><th>Tasa<br>Errores</th><th>TTFB<br>(Server)</th><th>Bloqueo<br>Red</th><th>Seguridad<br>TLS</th><th>APDEX<br>Score</th><th>Checks<br>OK</th><th>Sesión<br>Éxito</th>
    </tr>
    <tr>
      <td class="left strong">VALOR</td><td>${reqs.count || 0}</td><td>${fmtMs(dur.avg)}</td><td>${fmtMs(dur.med)}</td><td>${fmtMs(dur['p(90)'])}</td><td class="slo-cell">${fmtMs(dur['p(95)'])}</td><td>${fmtMs(dur['p(99)'])}</td><td>${fmtPct(fail.rate ?? fail.value ?? 0)}</td><td>${fmtMs(ttfb.avg)}</td><td>${fmtMs(blocked.avg)}</td><td>${fmtMs(tls.avg)}</td><td>${fmtFixed(apdex.avg)}</td><td>${fmtPct(checks.rate ?? checks.value ?? 0)}</td><td>${fmtPct(session.rate ?? session.value ?? 0)}</td>
    </tr>
    <tr>
      <td class="left strong">UMBRAL</td><td>-</td><td>Ref.</td><td>Ref.</td><td>Ref.</td><td>&lt; ${SLO.p95} ms</td><td>&lt; ${SLO.p99} ms</td><td>&lt; ${fmtPct(SLO.errorRate)}</td><td>Server</td><td>Net</td><td>&lt; ${SLO.tls} ms</td><td>&gt; ${fmtFixed(SLO.apdex, 2)}</td><td>&gt; ${fmtPct(SLO.checks)}</td><td>&gt; ${fmtPct(SLO.session)}</td>
    </tr>
    <tr>
      <td class="left strong">ESTADO</td><td class="dot">●</td><td class="dot">●</td><td class="dot">●</td><td class="dot">●</td><td style="color:${passColor(p95Pass)}">${passMark(p95Pass)} ${passIcon(p95Pass)}</td><td style="color:${passColor(p99Pass)}">${passMark(p99Pass)} ${passIcon(p99Pass)}</td><td style="color:${passColor(errorPass)}">${passMark(errorPass)} ${passIcon(errorPass)}</td><td>Info</td><td>Info</td><td>Info</td><td style="color:${passColor(apdexPass)}">${passMark(apdexPass)} ${passIcon(apdexPass)}</td><td style="color:${passColor(checksPass)}">${passMark(checksPass)} ${passIcon(checksPass)}</td><td style="color:${passColor(sessionPass)}">${passMark(sessionPass)} ${passIcon(sessionPass)}</td>
    </tr>
  </table>`;
}

function buildIpTable(ips) {
  if (!ips.length) return '<div class="empty">Sin métricas por IP. Para smoke single-IP puede ser esperado si K6_LOCAL_IPS no está definido.</div>';
  return `<table>
    <thead><tr><th class="left">IP</th><th>Reqs</th><th>Avg</th><th>p95</th><th>p99</th><th>Error %</th><th>TTFB avg</th></tr></thead>
    <tbody>${ips.map(ip => `<tr>
      <td class="left strong">${escapeHtml(ip.ip)}</td>
      <td>${ip.reqs}</td>
      <td>${fmtMs(ip.avg)}</td>
      <td>${fmtMs(ip.p95)}</td>
      <td>${fmtMs(ip.p99)}</td>
      <td>${fmtPct(ip.errorRate)}</td>
      <td>${fmtMs(ip.ttfb)}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

function buildChecksTable(checks) {
  if (!checks.length) return '<div class="empty">Sin checks funcionales registrados.</div>';
  return `<table>
    <thead><tr><th class="left">Grupo</th><th class="left">Check</th><th>OK</th><th>Fail</th></tr></thead>
    <tbody>${checks.slice(0, 500).map(c => `<tr>
      <td class="left mono">${escapeHtml(c.path)}</td>
      <td class="left">${escapeHtml(c.name)}</td>
      <td>${c.passes}</td>
      <td>${c.fails}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

function buildLegend() {
  return `<details class="section" open>
    <summary>Leyenda de Métricas - Por qué cada indicador importa más que el promedio</summary>
    <div class="note">El promedio puede ocultar picos: una sola respuesta de 10s eleva el avg aunque el 99% responda en milisegundos. Los percentiles p50, p90, p95 y p99 revelan la experiencia real de los usuarios.</div>
    <table>
      <thead><tr><th class="left">Métrica</th><th class="left">Qué mide</th><th class="left">Por qué importa / Criterio de evaluación</th><th>Umbral</th><th>Estándar</th></tr></thead>
      <tbody>
        <tr><td class="left mono strong">p(50) - Mediana</td><td class="left">El 50% de usuarios recibe respuesta en este tiempo o menos.</td><td class="left">Más honesto que el promedio para el usuario típico.</td><td>-</td><td>ISO/IEC 25023</td></tr>
        <tr><td class="left mono strong">p(90)</td><td class="left">El 90% de usuarios recibe respuesta en este tiempo o menos.</td><td class="left">Señal temprana de degradación antes del p99.</td><td>-</td><td>ISTQB PT</td></tr>
        <tr><td class="left mono strong">p(95) * SLO Principal</td><td class="left">El 95% de usuarios recibe respuesta en este tiempo o menos.</td><td class="left">Indicador clave para SLA/SLO; si supera 1500ms, 1 de cada 20 usuarios ya percibe degradación.</td><td>&lt; 1500 ms</td><td>Google SRE</td></tr>
        <tr><td class="left mono strong">p(99) - Cola larga</td><td class="left">El 1% peor de respuestas.</td><td class="left">Detecta timeouts y comportamientos extremos que el promedio oculta.</td><td>&lt; 2000 ms</td><td>ISTQB PT</td></tr>
        <tr><td class="left mono strong">avg - Promedio</td><td class="left">Suma de todos los tiempos dividida entre el número de requests.</td><td class="left">Engañoso como métrica principal: un solo outlier puede elevar el avg aunque p95 sea aceptable.</td><td>Secundario</td><td>ISO/IEC 25024</td></tr>
        <tr><td class="left mono strong">Error rate</td><td class="left">Porcentaje de requests HTTP fallidos.</td><td class="left">Mide fiabilidad; debe permanecer bajo antes de escalar carga.</td><td>&lt; 1%</td><td>SRE Errors</td></tr>
        <tr><td class="left mono strong">http_req_waiting (TTFB)</td><td class="left">Tiempo hasta el primer byte.</td><td class="left">Revela carga real del backend: BD, lógica de negocio y colas internas.</td><td>-</td><td>Google SRE</td></tr>
        <tr><td class="left mono strong">http_req_blocked</td><td class="left">Tiempo esperando conexión TCP disponible.</td><td class="left">Alto indica saturación de conexiones en cliente, gateway o balanceador.</td><td>-</td><td>ISO/IEC 25023</td></tr>
        <tr><td class="left mono strong">http_req_tls_handshaking</td><td class="left">Tiempo de negociación TLS/SSL.</td><td class="left">Alto puede indicar certificados, CPU saturada o configuración TLS incorrecta.</td><td>-</td><td>ISO/IEC 25010</td></tr>
        <tr><td class="left mono strong">APDEX Score</td><td class="left">Satisfacción de usuario en escala 0 a 1.</td><td class="left">Resume experiencia: 1.0 excelente, &gt;0.90 recomendado para baseline.</td><td>&gt; 0.90</td><td>Apdex / ISO</td></tr>
        <tr><td class="left mono strong">checks</td><td class="left">Validaciones funcionales sobre cuerpo y estado de respuesta.</td><td class="left">Confirma que el servicio responde correctamente, no solo rápido.</td><td>&gt; 99%</td><td>ISTQB PT</td></tr>
        <tr><td class="left mono strong">session_success_rate</td><td class="left">Porcentaje de sesiones completas sin error funcional.</td><td class="left">Indicador de disponibilidad percibida por el usuario final.</td><td>&gt; 99%</td><td>ISO/IEC 25010</td></tr>
        <tr><td class="left mono strong">source_ip</td><td class="left">IP de origen del VU en esa iteración.</td><td class="left">Confirma participación de IPs y detecta rutas con latencia anómala.</td><td>Todas activas</td><td>ISTQB PT</td></tr>
      </tbody>
    </table>
  </details>`;
}

function buildRecommendation() {
  return `<details class="section recommendation" open>
    <summary>Recomendación Técnica: Migrar a k6 + Grafana Cloud (licencia de pago)</summary>
    <div class="note strong">Las métricas actuales se generan offline por restricciones de red interna SUNEDU. Activar Grafana Cloud k6 aportaría las siguientes capacidades críticas:</div>
    <table>
      <tbody>
        <tr><td class="left strong">Tendencias históricas</td><td class="left">Compara automáticamente p95 de este release contra anteriores y detecta regresiones antes de producción.</td></tr>
        <tr><td class="left strong">Dashboards en tiempo real</td><td class="left">Identifica en qué minuto y bajo cuántos VUs ocurre el quiebre. El reporte offline solo muestra el resultado final.</td></tr>
        <tr><td class="left strong">Colaboración QA/Dev/Infra</td><td class="left">Todos los equipos ven los mismos datos en vivo sin reportes Word/Excel por correo.</td></tr>
        <tr><td class="left strong">Alertas automáticas SLO</td><td class="left">Si p95 supera 1500ms, Grafana puede alertar al equipo sin intervención manual.</td></tr>
        <tr><td class="left strong">Correlación con servidor</td><td class="left">Cruza métricas k6 con CPU/RAM/conexiones BD para identificar el cuello de botella exacto.</td></tr>
      </tbody>
    </table>
    <div class="note" style="font-size:10px;color:#6b5b00">Gestionar con infraestructura SUNEDU la apertura del puerto 443 hacia app.k6.io y prometheus-prod-XX.grafana.net.</div>
  </details>`;
}

function metricDisplayName(name) {
  const labels = {
    http_req_duration: 'http_req_duration (Duración Total)',
    http_req_waiting: 'http_req_waiting (Espera Server)',
    http_req_blocked: 'http_req_blocked (Bloqueo Red)',
    http_req_connecting: 'http_req_connecting (Conexión)',
    http_req_receiving: 'http_req_receiving (Recibiendo)',
    http_req_sending: 'http_req_sending (Enviando)',
    http_req_tls_handshaking: 'http_req_tls_handshaking (Seguridad TLS)',
    iteration_duration: 'iteration_duration (Duración Iteración)',
    apdex_score: 'apdex_score (Satisfacción)',
    ttfb_ms: 'ttfb_ms (TTFB custom)',
  };
  return labels[name] || name;
}

function metricRows(data, type) {
  const metrics = data.metrics || {};
  return Object.keys(data.metrics || {})
    .sort()
    .filter(name => metrics[name] && metrics[name].type === type)
    .map(name => ({ name, v: values(metrics[name]) }));
}

function buildTrendRows(data) {
  const rows = metricRows(data, 'trend')
    .filter(item => !item.name.includes('{source_ip:'))
    .map(item => `<tr>
      <td class="left strong">${escapeHtml(metricDisplayName(item.name))}</td>
      <td>${fmtFixed(item.v.avg, 2)}</td>
      <td>${fmtFixed(item.v.min, 2)}</td>
      <td>${fmtFixed(item.v.med, 2)}</td>
      <td>${fmtFixed(item.v.max, 2)}</td>
      <td>${fmtFixed(item.v['p(90)'], 2)}</td>
      <td>${fmtFixed(item.v['p(95)'], 2)}</td>
      <td>${fmtFixed(item.v['p(99)'], 2)}</td>
      <td>${item.v.count || '-'}</td>
    </tr>`)
    .join('');

  return `<h4>Trends & Times</h4>
    <table>
      <thead><tr><th class="left">Metric</th><th>AVG</th><th>MIN</th><th>MED</th><th>MAX</th><th>P(90)</th><th>P(95)</th><th>P(99)</th><th>COUNT</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="9" class="empty">Sin métricas trend.</td></tr>'}</tbody>
    </table>`;
}

function buildRateCounterRows(data) {
  const rateRows = metricRows(data, 'rate')
    .filter(item => !item.name.includes('{source_ip:') && !item.name.startsWith('http_reqs{status:'))
    .map(item => `<tr>
      <td class="left strong">${escapeHtml(item.name)}</td>
      <td>${fmtPct(item.v.rate ?? item.v.value)}</td>
      <td>${item.v.passes ?? '-'}</td>
      <td>${item.v.fails ?? '-'}</td>
    </tr>`)
    .join('');

  const counterRows = metricRows(data, 'counter').concat(metricRows(data, 'gauge'))
    .filter(item => !item.name.includes('{source_ip:') && !item.name.startsWith('http_reqs{status:'))
    .map(item => `<tr>
      <td class="left strong">${escapeHtml(item.name)}</td>
      <td>${item.v.count ?? item.v.value ?? '-'}</td>
      <td>${fmtFixed(item.v.rate ?? item.v.value, 4)}</td>
      <td>${fmtPct(item.v.rate ?? item.v.value)}</td>
    </tr>`)
    .join('');

  return `<h4>Rates, Counters & Gauges</h4>
    <table>
      <thead><tr><th class="left">Metric</th><th>RATE %</th><th>PASS COUNT</th><th>FAIL COUNT</th></tr></thead>
      <tbody>${rateRows || '<tr><td colspan="4" class="empty">Sin métricas rate.</td></tr>'}</tbody>
    </table>
    <table>
      <thead><tr><th class="left">Metric</th><th>COUNT</th><th>RATE/VALUE</th><th>PCT</th></tr></thead>
      <tbody>${counterRows || '<tr><td colspan="4" class="empty">Sin métricas counter/gauge.</td></tr>'}</tbody>
    </table>`;
}

function buildRunDetails(data, testName, mode, endpoints, ips) {
  const reqs = metric(data, 'http_reqs');
  const iterations = metric(data, 'iterations');
  const vusMax = metric(data, 'vus_max');
  return `<table>
    <tbody>
      <tr><td class="left strong">Run</td><td class="left">${escapeHtml(testName)}</td></tr>
      <tr><td class="left strong">Escenario</td><td class="left">${escapeHtml(scenarioName(testName))}</td></tr>
      <tr><td class="left strong">Modo</td><td class="left">${escapeHtml(mode.mode)}</td></tr>
      <tr><td class="left strong">Endpoints observados</td><td class="left">${escapeHtml(endpoints.map(e => e.label).join(', ') || '-')}</td></tr>
      <tr><td class="left strong">IPs activas</td><td class="left">${escapeHtml(ips.map(ip => ip.ip).join(', ') || '-')}</td></tr>
      <tr><td class="left strong">Total requests</td><td class="left">${reqs.count || 0}</td></tr>
      <tr><td class="left strong">RPS</td><td class="left">${fmtFixed(reqs.rate, 2)}</td></tr>
      <tr><td class="left strong">Iteraciones</td><td class="left">${iterations.count || 0}</td></tr>
      <tr><td class="left strong">VUs max</td><td class="left">${vusMax.max ?? vusMax.value ?? '-'}</td></tr>
    </tbody>
  </table>`;
}

function buildRunDetailCards(data, checks) {
  const reqs = metric(data, 'http_reqs');
  const iterations = metric(data, 'iterations');
  const vus = metric(data, 'vus');
  const vusMax = metric(data, 'vus_max');
  const dataReceived = metric(data, 'data_received');
  const dataSent = metric(data, 'data_sent');
  const passedChecks = checks.reduce((sum, c) => sum + c.passes, 0);
  const failedChecks = checks.reduce((sum, c) => sum + c.fails, 0);

  return `<div class="k6-detail-grid">
    <div class="k6-detail-card">
      <h4>Checks</h4>
      <div><span>Passed</span><strong>${passedChecks}</strong></div>
      <div><span>Failed</span><strong>${failedChecks}</strong></div>
    </div>
    <div class="k6-detail-card">
      <h4>Iterations</h4>
      <div><span>Total</span><strong>${iterations.count || 0}</strong></div>
      <div><span>Rate</span><strong>${fmtRate(iterations.rate)}</strong></div>
    </div>
    <div class="k6-detail-card">
      <h4>Virtual Users</h4>
      <div><span>Min</span><strong>${vus.min ?? vus.value ?? '-'}</strong></div>
      <div><span>Max</span><strong>${vusMax.max ?? vusMax.value ?? '-'}</strong></div>
    </div>
    <div class="k6-detail-card">
      <h4>Requests</h4>
      <div><span>Total</span><strong>${reqs.count || 0}</strong></div>
      <div><span>Rate</span><strong>${fmtRate(reqs.rate)}</strong></div>
    </div>
    <div class="k6-detail-card">
      <h4>Data Received</h4>
      <div><span>Total</span><strong>${fmtMb(dataReceived.count)}</strong></div>
      <div><span>Rate</span><strong>${fmtMbRate(dataReceived.rate)}</strong></div>
    </div>
    <div class="k6-detail-card">
      <h4>Data Sent</h4>
      <div><span>Total</span><strong>${fmtMb(dataSent.count)}</strong></div>
      <div><span>Rate</span><strong>${fmtMbRate(dataSent.rate)}</strong></div>
    </div>
  </div>`;
}

function buildChecksGroups(checks) {
  if (!checks.length) return '<div class="empty">Sin checks funcionales registrados.</div>';

  const byIp = new Map();
  checks.slice(0, 500).forEach(c => {
    const parts = String(c.path || '')
      .split('::')
      .map(part => part.trim())
      .filter(Boolean);
    const ipLabel = parts.find(part => part.toLowerCase().includes('ip de origen')) || 'Sin IP de origen agrupada';
    const groupLabel = parts
      .filter(part => !part.toLowerCase().includes('ip de origen'))
      .join(' / ') || c.path || 'Grupo';

    if (!byIp.has(ipLabel)) byIp.set(ipLabel, new Map());
    const groups = byIp.get(ipLabel);
    if (!groups.has(groupLabel)) groups.set(groupLabel, []);
    groups.get(groupLabel).push(c);
  });

  return `<div class="k6-checks">
    ${Array.from(byIp.entries()).map(([ipLabel, groups], ipIndex) => `<details class="k6-check-ip" ${ipIndex < 2 ? 'open' : ''}>
      <summary>Grupo - ${escapeHtml(ipLabel)}</summary>
      ${Array.from(groups.entries()).map(([groupLabel, groupChecks], groupIndex) => `<details class="k6-check-group" ${groupIndex < 3 ? 'open' : ''}>
        <summary>Grupo - ${escapeHtml(groupLabel)}</summary>
        <table>
          <thead><tr><th class="left">Check Name</th><th>Passes</th><th>Failures</th><th>% Pass</th></tr></thead>
          <tbody>${groupChecks.map(c => {
            const total = (c.passes || 0) + (c.fails || 0);
            const passPct = total ? (c.passes / total) * 100 : 0;
            return `<tr>
              <td class="left">${escapeHtml(c.name)}</td>
              <td class="ok-cell">${c.passes || 0}</td>
              <td>${c.fails || 0}</td>
              <td>${fmtFixed(passPct, 2)}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </details>`).join('')}
    </details>`).join('')}
  </div>`;
}

function buildK6ReporterPanel(data, testName, mode, endpoints, ips, checks) {
  const reqs = metric(data, 'http_reqs');
  const fail = metric(data, 'http_req_failed');
  const failedChecks = checks.reduce((sum, c) => sum + c.fails, 0);
  const thresholds = data.metrics ? Object.values(data.metrics).filter(m => m.thresholds).flatMap(m => m.thresholds || []) : [];
  const breached = thresholds.filter(t => t.ok === false).length;
  const failedReqs = Math.round((reqs.count || 0) * (fail.rate ?? fail.value ?? 0));

  return `<section class="k6-shell">
    <div class="k6-panel">
      <div class="k6-header"><span class="k6-mark">k6</span> SI058 ${escapeHtml(testName)}</div>
      <div class="k6-body">
        <div class="k6-cards">
          <div class="k6-card purple"><div>Total Requests</div><strong>${reqs.count || 0}</strong><span class="k6-card-icon">&#9711;</span></div>
          <div class="k6-card green"><div>Failed Requests</div><strong>${failedReqs}</strong><span class="k6-card-icon">&#10003;</span></div>
          <div class="k6-card green"><div>Breached Thresholds</div><strong>${breached}</strong><span class="k6-card-icon">&#9888;</span></div>
          <div class="k6-card green"><div>Failed Checks</div><strong>${failedChecks}</strong><span class="k6-card-icon">&#9673;</span></div>
        </div>

        <div class="k6-tabs">
          <input id="k6-tab-metrics" name="k6-tabs" type="radio" checked>
          <input id="k6-tab-run" name="k6-tabs" type="radio">
          <input id="k6-tab-checks" name="k6-tabs" type="radio">

          <label class="k6-tab-label tab-label-metrics" for="k6-tab-metrics">Detailed Metrics</label>
          <label class="k6-tab-label tab-label-run" for="k6-tab-run">Test Run Details</label>
          <label class="k6-tab-label tab-label-checks" for="k6-tab-checks">Checks &amp; Groups</label>

          <div class="k6-tab-content content-metrics">
            ${buildTrendRows(data)}
            ${buildRateCounterRows(data)}
          </div>

          <div class="k6-tab-content content-run">
            ${buildRunDetailCards(data, checks)}
            <div class="k6-subtable">${buildRunDetails(data, testName, mode, endpoints, ips)}</div>
            <h4>Desglose por IP de Origen</h4>
            ${buildIpTable(ips)}
          </div>

          <div class="k6-tab-content content-checks">
            ${buildChecksGroups(checks)}
          </div>
        </div>
        <footer>K6 Reporter local - SI058</footer>
      </div>
    </div>
  </section>`;
}

function buildHtml(testName, opts, data) {
  const endpoints = endpointSummaries(data);
  const checks = allChecks(data);
  const ips = activeIps(data, opts.localIps);
  const mode = executionMode(testName, opts, ips, endpoints);
  const sourceIp = detectedSourceIp(opts, ips);
  const ts = limaDate();
  const title = endpoints.length === 1
    ? `SI058 - Web Service ${endpoints[0].title} y Títulos`
    : 'SI058 - Web Service Grados y Títulos';

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SI058 ${escapeHtml(testName)}</title>
  <link rel="icon" href="${faviconHref()}">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; background: #eef0fb; color: #172033; font-size: 12px; }
    .page { padding: 16px; border-top: 3px solid #283593; }
    .hero { background: linear-gradient(135deg,#1a237e,#3949ab); color: #fff; border-radius: 10px; padding: 14px 20px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
    .brand { display: flex; align-items: center; gap: 16px; min-width: 0; }
    .logo-box { background: #fff; border-radius: 8px; padding: 6px 10px; display: flex; align-items: center; }
    .logo-box img { height: 48px; width: auto; display: block; }
    .title { font-size: 15px; font-weight: 700; }
    .sub { font-size: 11px; opacity: .88; margin-top: 3px; }
    .std { text-align: right; font-size: 10px; opacity: .82; line-height: 1.35; white-space: nowrap; }
    .section { background: #fff; border-radius: 8px; border: 1px solid #c5cae9; overflow: hidden; margin-bottom: 14px; }
    .section-title, summary { background: #283593; color: #fff; padding: 9px 16px; font-weight: 700; font-size: 13px; cursor: default; }
    summary { list-style: none; cursor: pointer; position: relative; padding-left: 34px; }
    summary::before { content: "▾"; position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 12px; line-height: 1; }
    details:not([open]) > summary::before { content: "▸"; }
    summary::-webkit-details-marker { display: none; }
    .section-body { padding: 12px 16px; }
    .note { padding: 10px 16px; color: #455; line-height: 1.5; }
    .http-grid { display: flex; flex-wrap: wrap; gap: 14px; padding: 14px; }
    .http-card { flex: 1; min-width: 260px; border: 1px solid #66bb6a; border-radius: 8px; overflow: hidden; background: #f9fbe7; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
    .http-card-title { background: #4527a0; color: #fff; padding: 10px 16px; font-size: .82rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; background: #fff; font-size: 11px; }
    th { background: #1a237e; color: #fff; padding: 9px 12px; border: 1px solid #283593; text-align: center; white-space: nowrap; }
    td { padding: 8px 12px; border: 1px solid #e4e7f4; text-align: center; }
    .compact td { padding: 8px 12px; font-size: .82rem; }
    .compact td:first-child { text-align: left; font-weight: 600; }
    .compact td:last-child { text-align: right; font-weight: 700; }
    .ok-row { background: #e8f5e9; color: #1b5e20; }
    .left { text-align: left; }
    .strong { font-weight: 700; }
    .mono { font-family: Consolas, "Courier New", monospace; }
    .slo-head, .slo-cell { background: #d1d9ff !important; color: #1a237e !important; font-weight: 700; }
    .master th, .master td { font-size: 10px; padding: 5px 6px; }
    .dot { color: #2e7d32; font-size: 16px; }
    .empty { padding: 14px; color: #666; background: #fafafa; }
    .url { margin-top: 4px; font-family: Consolas, "Courier New", monospace; font-size: 11px; color: #1a237e; }
    .recommendation summary { background: #f9a825; color: #3b2600; }
    .recommendation { border-color: #f9a825; background: #fff8e1; }
    .recommendation table tr:nth-child(odd) td { background: #fff3d7; }
    .k6-shell { margin: 14px -16px 0; padding: 22px 0 28px; background: linear-gradient(135deg,#6b6bd6,#7a4ab0); }
    .k6-panel { max-width: 1400px; width: calc(100% - 48px); margin: 0 auto; border-radius: 10px; overflow: hidden; background: #fff; box-shadow: 0 12px 36px rgba(45, 21, 100, .28); }
    .k6-header { background: linear-gradient(135deg,#7c3aed,#5b21b6); color: white; padding: 18px 28px; font-size: 24px; font-weight: 800; display: flex; align-items: center; gap: 12px; }
    .k6-mark { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 30px; background: white; color: #5b21b6; font-weight: 900; border-radius: 4px 14px 4px 4px; font-size: 14px; }
    .k6-body { padding: 22px; }
    .k6-cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 22px; margin-bottom: 24px; }
    .k6-card { position: relative; border-radius: 8px; padding: 22px; color: white; min-height: 110px; box-shadow: 0 6px 14px rgba(0,0,0,.18); text-transform: uppercase; font-weight: 700; overflow: hidden; }
    .k6-card div { opacity: .92; font-size: 12px; }
    .k6-card strong { display: block; margin-top: 10px; font-size: 34px; line-height: 1; }
    .k6-card-icon { position: absolute; right: 22px; top: 24px; opacity: .16; font-size: 56px; line-height: 1; }
    .k6-card.purple { background: linear-gradient(135deg,#6b6bd6,#6d4bb4); }
    .k6-card.green { background: linear-gradient(135deg,#5cc98a,#48bb78); }
    .k6-tabs { position: relative; }
    .k6-tabs > input { position: absolute; opacity: 0; pointer-events: none; }
    .k6-tab-label { display: inline-flex; align-items: center; justify-content: center; min-width: 180px; min-height: 48px; padding: 12px 18px; background: #f8f9ff; color: #67738f; border: 1px solid transparent; border-radius: 8px 8px 0 0; font-weight: 700; font-size: 13px; cursor: pointer; margin-right: 4px; }
    #k6-tab-metrics:checked ~ .tab-label-metrics,
    #k6-tab-run:checked ~ .tab-label-run,
    #k6-tab-checks:checked ~ .tab-label-checks { color: #7c3aed; background: #fff; border-color: #dfe3f5; border-bottom-color: #fff; }
    .k6-tab-content { display: none; border: 1px solid #dfe3f5; border-radius: 0 8px 8px 8px; margin-top: -1px; padding: 20px 22px; overflow-x: auto; min-height: 280px; }
    #k6-tab-metrics:checked ~ .content-metrics,
    #k6-tab-run:checked ~ .content-run,
    #k6-tab-checks:checked ~ .content-checks { display: block; }
    .k6-tab-content h4 { margin: 12px 0 10px; color: #31406f; font-size: 13px; }
    .k6-tab-content table { margin: 0 0 18px; }
    .k6-tab-content th { background: linear-gradient(90deg,#6574df,#7047a8); font-size: 10px; }
    .k6-detail-grid { display: grid; grid-template-columns: repeat(4, minmax(180px, 1fr)); gap: 18px; margin-bottom: 22px; }
    .k6-detail-card { background: linear-gradient(135deg,#6874df,#7047a8); color: #fff; border-radius: 8px; min-height: 132px; padding: 18px 22px; box-shadow: 0 6px 14px rgba(0,0,0,.18); }
    .k6-detail-card h4 { margin: 0 0 14px; color: #fff; text-transform: uppercase; letter-spacing: .04em; }
    .k6-detail-card div { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 10px; }
    .k6-detail-card span { font-size: 12px; opacity: .9; }
    .k6-detail-card strong { font-size: 24px; line-height: 1; }
    .k6-subtable { margin-bottom: 12px; }
    .k6-check-ip { margin-bottom: 12px; border: 1px solid #dfe3f5; border-radius: 8px; overflow: hidden; background: #fff; }
    .k6-check-ip > summary { background: #f6f7ff; color: #1a237e; font-size: 11px; border-left: 4px solid #283593; }
    .k6-check-ip > summary::before { left: 14px; }
    .k6-check-group { margin: 10px 14px 12px; border: 1px solid #e6e9f7; border-radius: 8px; overflow: hidden; background: #fff; }
    .k6-check-group summary { background: #fbfcff; color: #1a237e; padding: 10px 14px 10px 34px; font-size: 11px; border-left: 4px solid #3949ab; }
    .k6-check-group summary::before { left: 14px; }
    .k6-check-group table { margin: 0; }
    .ok-cell { background: #59c98a; color: #fff; font-weight: 700; }
    footer { text-align: center; padding: 14px; color: #718096; font-size: 11px; border-top: 1px solid #e2e8f0; background: #f7fafc; }
    @media (max-width: 900px) {
      .k6-cards, .k6-detail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .k6-tab-label { min-width: 0; width: 100%; margin-right: 0; border-radius: 8px; margin-bottom: 4px; }
      .k6-tab-content { border-radius: 8px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="hero">
      <div class="brand">
        ${SUNEDU_LOGO_B64 ? `<div class="logo-box"><img src="${SUNEDU_LOGO_B64}" alt="SUNEDU"></div>` : ''}
        <div>
          <div class="title">${escapeHtml(title)}</div>
          <div class="sub">Informe de Pruebas de Rendimiento</div>
          <div class="sub">Prueba: <strong>${escapeHtml(testName)}</strong> &nbsp;|&nbsp; ${escapeHtml(ts)} (Lima) &nbsp;|&nbsp; Modo: <strong>${escapeHtml(mode.mode)}</strong></div>
        </div>
      </div>
      <div class="std">ISTQB PT · ISO/IEC 25010<br>ISO/IEC 25023 · Google SRE<br><span>SUNEDU - Área de Aseguramiento<br>de Calidad de Software</span></div>
    </header>

    <section class="section">
      <div class="section-title">Modo de Ejecución: ${escapeHtml(mode.title)}</div>
      <div class="section-body">
        ${escapeHtml(mode.description)}<br>
        IP de origen detectada: <strong class="mono" style="color:#1a237e">${escapeHtml(sourceIp)}</strong>
        <div class="url">${escapeHtml(firstEndpointUrl(endpoints))}</div>
        <span style="font-size:11px;color:#555;margin-top:8px;display:block">${escapeHtml(mode.hint)}</span>
      </div>
    </section>

    <section class="section">
      <div class="section-title">Distribución de Respuestas HTTP / Reglas de Negocio - por Endpoint</div>
      <div class="http-grid">${buildBusinessDistribution(data, endpoints, checks)}</div>
    </section>

    <section class="section">
      <div class="section-title">Dashboard por Endpoint - ${endpoints.length || 0} Endpoint(s)<span style="font-size:.8rem;font-weight:400;color:#c5cae9;margin-left:10px">SLO: p95 &lt; ${SLO.p95}ms · Google SRE · ISO/IEC 25023</span></div>
      <div style="overflow-x:auto">${buildEndpointDashboard(endpoints)}</div>
    </section>

    <section class="section">
      <div class="section-title">Dashboard Maestro de Resultados - KPIs Globales (Auditoría SUNEDU)</div>
      <div style="overflow-x:auto">${buildMasterDashboard(data)}</div>
    </section>

    ${buildLegend()}
    ${buildRecommendation()}

    ${buildK6ReporterPanel(data, testName, mode, endpoints, ips, checks)}
  </div>
</body>
</html>`;
}

function buildEndpointCSV(data) {
  const rows = [['endpoint', 'requests', 'p50_ms', 'p90_ms', 'p95_ms', 'p99_ms', 'max_ms', 'avg_ms', 'error_rate_pct']];
  endpointSummaries(data).forEach(ep => {
    rows.push([
      ep.tag,
      ep.reqs,
      Math.round(ep.p50 || 0),
      Math.round(ep.p90 || 0),
      Math.round(ep.p95 || 0),
      Math.round(ep.p99 || 0),
      Math.round(ep.max || 0),
      Math.round(ep.avg || 0),
      ((ep.errorRate || 0) * 100).toFixed(2),
    ]);
  });
  return rows.map(r => r.join(',')).join('\n');
}

function buildStdout(testName, data) {
  const dur = metric(data, 'http_req_duration');
  const fail = metric(data, 'http_req_failed');
  const checks = metric(data, 'checks');
  const reqs = metric(data, 'http_reqs');
  const lines = [
    '',
    '============================================================',
    `SI058 ${testName}`,
    '============================================================',
    `Requests : ${reqs.count || 0}`,
    `RPS      : ${reqs.rate ? reqs.rate.toFixed(2) : '-'}`,
    `p50      : ${fmtMs(dur.med)}`,
    `p95      : ${fmtMs(dur['p(95)'])}`,
    `p99      : ${fmtMs(dur['p(99)'])}`,
    `Errores  : ${fmtPct(fail.rate ?? fail.value ?? 0)}`,
    `Checks   : ${fmtPct(checks.rate ?? checks.value ?? 0)}`,
    '============================================================',
    '',
  ];
  return lines.join('\n');
}

export function buildHandleSummary(testName, opts = {}) {
  return function handleSummary(data) {
    const ts = limaTimestampForFile();
    return {
      [`reports/${testName}-${ts}.html`]: buildHtml(testName, opts, data),
      [`reports/${testName}-${ts}.json`]: JSON.stringify(data),
      [`reports/${testName}-${ts}.csv`]: buildEndpointCSV(data),
      stdout: buildStdout(testName, data),
    };
  };
}
