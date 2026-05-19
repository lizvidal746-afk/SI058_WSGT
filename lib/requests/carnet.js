// ============================================================
// lib/requests/carnet.js
// Endpoint: POST /api/Carnet/consulta
// ============================================================
import { httpRequest } from '../http.js';
import { classifyAndCheck } from '../checks.js';
import { BASE_URL } from '../../config/env.js';

export function consultaCarnet(user) {
  const url = `${BASE_URL}/api/Carnet/consulta`;
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
      endpoint: 'carnet_consulta',
      name: 'POST /api/Carnet/consulta',
      expected_failure: 'false',
    },
  };
  const res = httpRequest('POST', url, payload, params);
  if (res.status !== 200) {
    console.log(`[ERROR] carnet_consulta con Doc: ${user.numeroDocumento} - Status: ${res.status} - Resp: ${res.body}`);
  }
  return classifyAndCheck(res, 'Carnet/consulta', user.ip);
}
