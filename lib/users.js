import { getSourceIp } from './http.js';
import { SharedArray } from 'k6/data';

// Cargar pool de documentos desde CSV por servicio (ISO/IEC 25023)
const carnetData = new SharedArray('docs_carnet', function () {
  return open('../data/documentos_carnet.csv').split('\n').map(line => line.trim()).filter(line => line.length > 0);
});
const gradosData = new SharedArray('docs_grados', function () {
  return open('../data/documentos_grados.csv').split('\n').map(line => line.trim()).filter(line => line.length > 0);
});

// ============================================================
// lib/users.js
// Carga de credenciales QA desde variables de entorno (.env).
// Las credenciales NO se versionan en el repo: viven solo en .env
// (incluido en .gitignore). ISO/IEC 27001 A.9 - Control de acceso.
// ============================================================

function getAllUsers() {
  const users = [];
  for (let i = 1; i <= 50; i++) {
    const u = __ENV[`SUNEDU_USUARIO_${i}`];
    if (u) {
      users.push({
        usuario: u,
        clave: __ENV[`SUNEDU_CLAVE_${i}`],
        numeroDocumento: __ENV[`SUNEDU_DOC_${i}`],
        idEntidad: parseInt(__ENV[`SUNEDU_ENTIDAD_${i}`], 10),
        ip: __ENV[`SUNEDU_IP_${i}`] || '127.0.0.1'
      });
    }
  }
  return users;
}

const allUsersPool = getAllUsers();
const smokeUser      = allUsersPool[0];        // Usuario 1 (Mario)
const multiUsersPool = allUsersPool.slice(1); // Usuarios 2 al 11

export const resetUsers  = allUsersPool.map(u => ({ idEntidad: u.idEntidad, usuario: u.usuario }));

function pickByVU(arr) {
  if (!arr || arr.length === 0) return null;
  // Si estamos en multi-user, VU1 debe tomar el primer usuario del pool (que es el Usuario 2)
  return arr[(__VU - 1 + arr.length) % arr.length];
}

export function getCarnetUser() { 
  const isMulti = (__VU > 1) || (__ENV.SCENARIO && __ENV.SCENARIO.includes('multi'));
  const pool = isMulti ? multiUsersPool : [smokeUser];
  const u = pickByVU(pool) || pool[0]; 
  if (u) {
    const idx = allUsersPool.indexOf(u) + 1;
    const randomDoc = carnetData[Math.floor(Math.random() * carnetData.length)];
    u.numeroDocumento = randomDoc || __ENV[`SUNEDU_DOC_CARNET_${idx}`] || u.numeroDocumento;
    u.ip = getSourceIp(); 
  }
  return u;
}
export function getGradosUser() { 
  const isMulti = (__VU > 1) || (__ENV.SCENARIO && __ENV.SCENARIO.includes('multi'));
  const pool = isMulti ? multiUsersPool : [smokeUser];
  const u = pickByVU(pool) || pool[0]; 
  if (u) {
    const idx = allUsersPool.indexOf(u) + 1;
    const randomDoc = gradosData[Math.floor(Math.random() * gradosData.length)];
    u.numeroDocumento = randomDoc || __ENV[`SUNEDU_DOC_GRADOS_${idx}`] || u.numeroDocumento;
    u.ip = getSourceIp();
  }
  return u;
}
export function getResetUser()  { return pickByVU(resetUsers)  || resetUsers[0]  || null; }

