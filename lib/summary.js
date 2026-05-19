// ============================================================
// lib/summary.js
// Reporte local sin dependencias remotas.
// Evita fallos en redes corporativas/proxy cuando k6 intenta
// importar bundles desde GitHub o jslib.
// ============================================================
import { SUNEDU_LOGO_B64 } from './logo.js';

const ENDPOINT_TAGS = ['carnet_consulta', 'grados_consulta', 'reset_solicitar', 'reset_cambiar'];

function values(metric) { return metric ? (metric.values || metric) : {}; }
function fmtMs(v)  { return (v == null || Number.isNaN(v)) ? '-' : `${Math.round(v)}ms`; }
function fmtPct(v) { return (v == null || Number.isNaN(v)) ? '-' : `${(v * 100).toFixed(2)}%`; }
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function metric(data, name) {
  return values(data.metrics[name]);
}

function buildEndpointRows(data) {
  return ENDPOINT_TAGS.map(tag => {
    const dur = metric(data, `http_req_duration{endpoint:${tag}}`);
    const fail = metric(data, `http_req_failed{endpoint:${tag}}`);
    if (!dur.count) return '';
    return `<tr>
      <td>${escapeHtml(tag)}</td>
      <td>${dur.count}</td>
      <td>${fmtMs(dur.med)}</td>
      <td>${fmtMs(dur['p(95)'])}</td>
      <td>${fmtMs(dur['p(99)'])}</td>
      <td>${fmtMs(dur.max)}</td>
      <td>${fmtPct(fail.rate ?? fail.value ?? 0)}</td>
    </tr>`;
  }).join('');
}

function buildEndpointCSV(data) {
  const rows = [['endpoint','requests','p50_ms','p90_ms','p95_ms','p99_ms','max_ms','avg_ms','error_rate_pct']];
  ENDPOINT_TAGS.forEach(tag => {
    const dur = metric(data, `http_req_duration{endpoint:${tag}}`);
    const fail = metric(data, `http_req_failed{endpoint:${tag}}`);
    if (!dur.count) return;
    rows.push([
      tag,
      dur.count,
      Math.round(dur.med || 0),
      Math.round(dur['p(90)'] || 0),
      Math.round(dur['p(95)'] || 0),
      Math.round(dur['p(99)'] || 0),
      Math.round(dur.max || 0),
      Math.round(dur.avg || 0),
      (((fail.rate ?? fail.value ?? 0) * 100).toFixed(2)),
    ]);
  });
  return rows.map(r => r.join(',')).join('\n');
}

function collectChecks(group, out) {
  if (!group) return;
  if (group.checks) {
    Object.keys(group.checks).forEach(name => {
      const c = group.checks[name];
      out.push({
        name,
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

function buildChecksRows(data) {
  const checks = [];
  collectChecks(data.root_group, checks);
  return checks.slice(0, 500).map(c => `<tr>
    <td>${escapeHtml(c.path)}</td>
    <td>${escapeHtml(c.name)}</td>
    <td>${c.passes}</td>
    <td>${c.fails}</td>
  </tr>`).join('');
}

function buildIpRows(data, localIps) {
  return (localIps || []).map(ip => {
    const dur = metric(data, `http_req_duration{source_ip:${ip}}`);
    const fail = metric(data, `http_req_failed{source_ip:${ip}}`);
    if (!dur.count) return '';
    return `<tr>
      <td>${escapeHtml(ip)}</td>
      <td>${dur.count}</td>
      <td>${fmtMs(dur.avg)}</td>
      <td>${fmtMs(dur['p(95)'])}</td>
      <td>${fmtMs(dur['p(99)'])}</td>
      <td>${fmtPct(fail.rate ?? fail.value ?? 0)}</td>
    </tr>`;
  }).join('');
}

function buildHtml(testName, opts, data) {
  const globalDur = metric(data, 'http_req_duration');
  const globalFail = metric(data, 'http_req_failed');
  const checks = metric(data, 'checks');
  const apdex = metric(data, 'apdex_score');
  const ttfb = metric(data, 'http_req_waiting');
  const reqs = metric(data, 'http_reqs');
  const ts = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima', hour12: false });
  const endpointRows = buildEndpointRows(data);
  const ipRows = buildIpRows(data, opts.localIps);
  const checkRows = buildChecksRows(data);

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>SI058 ${escapeHtml(testName)}</title>
  <style>
    body { font-family: Segoe UI, Arial, sans-serif; margin: 0; background: #f5f6fb; color: #172033; }
    header { background: #1a237e; color: white; padding: 20px 28px; display: flex; align-items: center; gap: 18px; }
    header img { height: 48px; background: white; padding: 6px; border-radius: 6px; }
    main { padding: 24px 28px; }
    h1 { font-size: 20px; margin: 0; }
    h2 { font-size: 15px; margin: 24px 0 10px; color: #1a237e; }
    .sub { opacity: .86; font-size: 12px; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
    .kpi { background: white; border: 1px solid #dde1f3; border-radius: 8px; padding: 12px; }
    .kpi .label { color: #5b6685; font-size: 11px; text-transform: uppercase; }
    .kpi .value { font-size: 22px; font-weight: 700; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #dde1f3; }
    th, td { padding: 8px 10px; border: 1px solid #e4e7f4; font-size: 12px; text-align: left; }
    th { background: #283593; color: white; }
    tr:nth-child(even) td { background: #fafbff; }
    .warn { color: #b45309; font-weight: 700; }
  </style>
</head>
<body>
  <header>
    ${SUNEDU_LOGO_B64 ? `<img src="${SUNEDU_LOGO_B64}" alt="SUNEDU">` : ''}
    <div>
      <h1>SI058 - Informe local de rendimiento</h1>
      <div class="sub">Run: ${escapeHtml(testName)} | Fecha: ${escapeHtml(ts)} | IP mode: ${escapeHtml(opts.ipMode || 'single')}</div>
    </div>
  </header>
  <main>
    <section class="grid">
      <div class="kpi"><div class="label">Requests</div><div class="value">${reqs.count || 0}</div></div>
      <div class="kpi"><div class="label">p95</div><div class="value">${fmtMs(globalDur['p(95)'])}</div></div>
      <div class="kpi"><div class="label">p99</div><div class="value">${fmtMs(globalDur['p(99)'])}</div></div>
      <div class="kpi"><div class="label">Error rate</div><div class="value">${fmtPct(globalFail.rate ?? globalFail.value ?? 0)}</div></div>
      <div class="kpi"><div class="label">Checks</div><div class="value">${fmtPct(checks.rate ?? checks.value ?? 0)}</div></div>
      <div class="kpi"><div class="label">APDEX</div><div class="value">${(apdex.avg ?? 0).toFixed(3)}</div></div>
      <div class="kpi"><div class="label">TTFB avg</div><div class="value">${fmtMs(ttfb.avg)}</div></div>
    </section>

    <h2>Endpoints</h2>
    <table>
      <thead><tr><th>Endpoint</th><th>Reqs</th><th>p50</th><th>p95</th><th>p99</th><th>Max</th><th>Error %</th></tr></thead>
      <tbody>${endpointRows || '<tr><td colspan="7" class="warn">Sin métricas por endpoint</td></tr>'}</tbody>
    </table>

    <h2>Desglose por IP</h2>
    <table>
      <thead><tr><th>IP</th><th>Reqs</th><th>Avg</th><th>p95</th><th>p99</th><th>Error %</th></tr></thead>
      <tbody>${ipRows || '<tr><td colspan="6">Sin métricas por IP</td></tr>'}</tbody>
    </table>

    <h2>Checks funcionales</h2>
    <table>
      <thead><tr><th>Grupo</th><th>Check</th><th>OK</th><th>Fail</th></tr></thead>
      <tbody>${checkRows || '<tr><td colspan="4">Sin checks</td></tr>'}</tbody>
    </table>
  </main>
</body>
</html>`;
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
    const ts = new Date().toISOString().replace(/T/, '_').replace(/[:.]/g, '-').slice(0, 19);
    return {
      [`reports/${testName}-${ts}.html`]: buildHtml(testName, opts, data),
      [`reports/${testName}-${ts}.json`]: JSON.stringify(data),
      [`reports/${testName}-${ts}.csv`]: buildEndpointCSV(data),
      stdout: buildStdout(testName, data),
    };
  };
}
