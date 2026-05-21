// ============================================================
// lib/checks.js
// Checks estandarizados. Alineado a ISO/IEC 25010 (Fiabilidad).
// El nombre del check incluye VU e IP de origen para permitir
// desglose por IP en los reportes HTML, Excel y Word.
// ============================================================
import { check, group } from 'k6';
import { LOCAL_IPS } from '../config/env.js';
import { businessLimitHits, httpOutcomeCounter, sessionSuccessRate } from './metrics.js';

/**
 * Calcula la IP de origen de este VU (mismo calculo que lib/http.js).
 */
function getSourceIp() {
  if (__ENV.K6_LOCAL_IPS) {
    return LOCAL_IPS[(__VU - 1 + LOCAL_IPS.length) % LOCAL_IPS.length];
  } else {
    return __ENV.K6_SOURCE_IP || 'auto';
  }
}

/**
 * Interpreta la respuesta de SUNEDU SI058 segun reglas de negocio.
 * Agrupa los checks por Iteración para la UI del reporte HTML.
 */
export function classifyAndCheck(res, requestName, ip = '') {
  let body = {};
  try {
    body = res.json();
  } catch (_e) {
    body = { bSuccess: false, sMessage: res.body };
  }

  const status = res.status;
  const msg = body?.sMessage || '';
  const iter = __ITER + 1;
  const vuNum = __VU;
  const sourceIp = getSourceIp();

  const isAudit = __ENV.SCENARIO === 'multi_ip_audit' || __ENV.SCENARIO === 'smoke';
  const durationMs = Math.round(res.timings.duration);
  const ipPrefix = ip ? `[${ip}] ` : '';

  let groupLabelIp, groupLabelIter;
  const fullUrl = res.url || requestName;

  if (isAudit) {
    // Modo Auditoría: Alta granularidad (1 grupo por iteración). Seguro solo para pruebas pequeñas.
    groupLabelIp = `IP de Origen: ${sourceIp}`;
    groupLabelIter = `${requestName} · ${fullUrl} (Iteración ${iter} · VU${vuNum} · ${durationMs}ms)`;
  } else {
    // Modo Estrés/Carga: Agrupación estática para evitar que K6 colapse por exceso de cardinalidad (Memory Bloat).
    groupLabelIp = `Rendimiento General (Agrupado)`;
    groupLabelIter = `${requestName} · ${fullUrl}`;
  }

  let outcome;

  group(groupLabelIp, () => {
    group(groupLabelIter, () => {
      if (status === 200 && body.bSuccess === true) {
        outcome = 'ok';
        check(res, { [`${ipPrefix}[HTTP 200] Success: true`]: () => true });
      } else if (status === 200 && body.bSuccess === false) {
        let tipo = 'SERVICIO';
        if (msg.includes('HORA')) tipo = 'HORA';
        else if (msg.includes('MINUTO')) tipo = 'MINUTO';
        else if (msg.includes('MES')) tipo = 'MES';
        businessLimitHits.add(1, { limit_type: tipo, endpoint: requestName });
        outcome = 'business_limit';
        check(res, {
          [`${ipPrefix}[HTTP 200] Success: false - Límite ${tipo} | Msj: ${msg.substring(0, 100)}`]: () => true,
        });
      } else if (status === 429) {
        outcome = 'gateway_429';
        check(res, { [`${ipPrefix}[HTTP 429] Rate Limit Gateway | Msj: ${msg.substring(0, 100)}`]: () => false });
      } else {
        outcome = 'unexpected';
        check(res, { [`${ipPrefix}[HTTP ${status}] Error | Msj: ${msg.substring(0, 100)}`]: () => false });
      }
    });
  });

  httpOutcomeCounter.add(1, { outcome, source_ip: sourceIp, status_code: String(status) });
  sessionSuccessRate.add(outcome === 'ok' || outcome === 'business_limit');
  return outcome === 'ok' || outcome === 'business_limit';
}
