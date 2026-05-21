// ============================================================
// lib/requests/clienteResetToken.js
// Endpoints:
//   POST /api/ClienteResetToken/solicitar-recuperacion
//   POST /api/ClienteResetToken/cambiar-clave
// ============================================================

import { check } from 'k6';
import { BASE_URL } from '../../config/env.js';
import { classifyAndCheck } from '../checks.js';
import { httpRequest } from '../http.js';

export function solicitarRecuperacion(user) {
  const url = `${BASE_URL}/api/ClienteResetToken/solicitar-recuperacion`;
  const payload = JSON.stringify({ idEntidad: user.idEntidad, usuario: user.usuario });
  const params = {
    sourceIp: user.ip,
    headers: { 'Content-Type': 'application/json' },
    tags: {
      endpoint: 'reset_solicitar',
      name: 'POST /api/ClienteResetToken/solicitar-recuperacion',
      expected_failure: 'false',
    },
  };
  const res = httpRequest('POST', url, payload, params);
  return classifyAndCheck(res, 'Reset/solicitar');
}

export function cambiarClave(token, nuevaClave, opts = {}) {
  const url = `${BASE_URL}/api/ClienteResetToken/cambiar-clave`;
  const payload = JSON.stringify({ token, nuevaClave });
  const expectedFailure = opts.expectedFailure === true ? 'true' : 'false';
  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: {
      endpoint: 'reset_cambiar',
      name: 'POST /api/ClienteResetToken/cambiar-clave',
      expected_failure: expectedFailure,
    },
  };
  const res = httpRequest('POST', url, payload, params);

  // Si esperamos fallo (token ficticio), solo verificamos que responda
  if (expectedFailure === 'true') {
    check(res, {
      '[ESPERADO] cambiar-clave responde (token invalido)': (r) => r.status > 0,
    });
  } else {
    check(res, {
      '[OK] cambiar-clave responde': (r) => r.status > 0,
      '[OK] cambiar-clave duracion < 1.5s': (r) => r.timings.duration < 1500,
    });
  }

  return { status: res.status, body: res.body, durationMs: res.timings.duration };
}
