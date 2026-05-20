// lib/ip.js

/**
 * Obtiene la IP de origen para el VU actual.
 * - Si MULTI_IP=true, rota entre las IPs de IP_LIST.
 * - Si CLIENT_IP o SOURCE_IP está definida, la usa.
 * - Si no, usa el fallback.
 * @param {number} vuIndex - Índice del VU (__VU)
 * @param {string} fallback - IP por defecto
 * @returns {string}
 */
export function getSourceIp(vuIndex = 0, fallback = '127.0.0.1') {
  const isMulti = __ENV.MULTI_IP === 'true';

  if (isMulti) {
    const rawList = __ENV.IP_LIST || fallback;
    const pool = rawList.split(',').map(ip => ip.trim()).filter(Boolean);
    return pool[vuIndex % pool.length];
  }

  const single = __ENV.CLIENT_IP || __ENV.SOURCE_IP || fallback;
  return single.trim();
}
