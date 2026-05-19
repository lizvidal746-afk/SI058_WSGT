// ============================================================
// lib/requests/grados.js
// Endpoint: POST /api/Grados/consulta
// ============================================================
import { httpRequest } from '../http.js';
import { classifyAndCheck } from '../checks.js';
import { BASE_URL } from '../../config/env.js';

export function consultaGrados(user) {
  const url = `${BASE_URL}/api/Grados/consulta`;
  const payload = JSON.stringify({
    numeroDocumento: user.numeroDocumento,
    idEntidad:       user.idEntidad,
    usuario:         user.usuario,
    clave:           user.clave,
    ipUsuario:       user.ip,
  });

  const params = {
    sourceIp: user.ip,
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json' 
    },
    tags:    {
      endpoint: 'grados_consulta',
      name: 'POST /api/Grados/consulta',
      expected_failure: 'false',
    },
  };
  const res = httpRequest('POST', url, payload, params);
  if (res.status !== 200) {
    console.log(`[ERROR] grados_consulta con Doc: ${user.numeroDocumento} - Status: ${res.status} - Resp: ${res.body}`);
  }
  return classifyAndCheck(res, 'Grados/consulta', user.ip);
}
