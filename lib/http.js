// ============================================================
// lib/http.js
// Wrapper HTTP con retry + backoff exponencial.
//
// IMPORTANTE sobre IPs de origen:
// k6 NO permite especificar localAddress por request. La unica forma
// soportada es la env var K6_LOCAL_IPS o el flag --local-ips, que k6
// distribuye en ROUND-ROBIN entre los VUs automaticamente.
// Las IPs deben existir previamente en el SO (ver tools/setup-ips.ps1).
// Doc: https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/#local-ips
// ============================================================

import { sleep } from 'k6';
import http from 'k6/http';
import { LOCAL_IPS } from '../config/env.js';
import { errorRate, rateLimitedRequests, recordApdex, timeoutErrors, ttfbTrend, unexpectedErrors } from './metrics.js';

const DEFAULT_TIMEOUT_MS = 30000;
const APDEX_T_MS = 800; // umbral de satisfaccion (ISO 25023)

/**
 * Calcula la IP de origen asignada a este VU via round-robin.
 * k6 asigna IPs de K6_LOCAL_IPS secuencialmente por VU (VU1 -> IP[0], VU2 -> IP[1], ...).
 * Aqui replicamos esa logica para etiquetarlo en el tag source_ip.
 */
export function getSourceIp() {
  if (!LOCAL_IPS || LOCAL_IPS.length === 0) return 'auto';
  return LOCAL_IPS[(__VU - 1 + LOCAL_IPS.length) % LOCAL_IPS.length];
}

/**
 * Request con retry inteligente:
 *  - 5xx / network error -> reintenta con backoff exponencial
 *  - 429 -> espera respetando Retry-After si existe y reintenta
 *  - 4xx (excepto 429) -> NO reintenta (es error del cliente)
 *  - 2xx / 3xx -> devuelve inmediatamente
 */
export function httpRequest(method, url, body, params = {}, opts = {}) {
  const maxRetries = opts.maxRetries ?? 3;
  const baseDelay = opts.baseDelay ?? 1;

  // Calculamos la IP que k6 usará realmente (basado en el pool y el VU)
  const activeIp = getSourceIp();

  // Si el body es un JSON string y contiene ipUsuario, lo sincronizamos
  let finalBody = body;
  try {
    if (typeof body === 'string' && body.includes('ipUsuario')) {
      let jsonObj = JSON.parse(body);
      jsonObj.ipUsuario = activeIp !== 'auto' ? activeIp : jsonObj.ipUsuario;
      finalBody = JSON.stringify(jsonObj);
    }
  } catch (_e) {
    // Si falla el parseo, enviamos el body original
  }

  const finalParams = Object.assign(
    {
      timeout: `${DEFAULT_TIMEOUT_MS}ms`,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    },
    params,
    {
      tags: Object.assign({ retry: '0', source_ip: activeIp }, params.tags || {}),
    },
  );

  let res;
  let attempt = 0;
  let delay = baseDelay;

  while (attempt <= maxRetries) {
    finalParams.tags.retry = String(attempt);
    res = http.request(method, url, finalBody, finalParams);

    // Metricas de observabilidad por intento
    ttfbTrend.add(res.timings.waiting);
    recordApdex(res.timings.duration, APDEX_T_MS);

    if (res.status === 0) {
      // Error de red / timeout
      timeoutErrors.add(1);
      errorRate.add(1);
    } else if (res.status >= 500) {
      unexpectedErrors.add(1);
      errorRate.add(1);
    } else if (res.status === 429) {
      rateLimitedRequests.add(1);
      errorRate.add(1);
    } else if (res.status >= 400) {
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }

    // Decidir si reintentar
    const shouldRetry = attempt < maxRetries && (res.status === 0 || res.status >= 500 || res.status === 429);

    if (!shouldRetry) break;

    // Respetar Retry-After (segundos) si el servidor lo manda
    const retryAfter = res.headers['Retry-After'] || res.headers['retry-after'];
    const waitSec = retryAfter ? parseInt(retryAfter, 10) || delay : delay;
    sleep(waitSec);

    delay *= 2; // backoff exponencial
    attempt++;
  }

  return res;
}
