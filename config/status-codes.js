/**
 * Lista centralizada de códigos de estado HTTP a observar en las métricas.
 * Evita la duplicación de esta lista en los distintos entrypoints.
 * 
 * 200, 201: Éxitos
 * 301, 302, 304: Redirecciones/Caché
 * 400, 401, 403, 404: Errores de cliente
 * 429: Rate limiting (WAF)
 * 500, 502, 503, 504: Errores de servidor/Timeout
 */
export const OBSERVABLE_STATUS_CODES = [
    200, 201, 301, 302, 304, 
    400, 401, 403, 404, 429, 
    500, 502, 503, 504
];
