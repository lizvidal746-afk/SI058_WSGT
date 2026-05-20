import { getSourceIp } from './http.js';
import { SharedArray } from 'k6/data';

// Cargar pool de documentos desde CSV por servicio (ISO/IEC 25023)

/**
 * Parsea un CSV con header y devuelve un array de objetos.
 * Lanza error si el header no es válido o falta.
 * @param {string} csvText - Contenido del archivo CSV
 * @param {string[]} requiredHeaders - Lista de headers requeridos
 * @returns {object[]}
 */
function parseCsvWithHeader(csvText, requiredHeaders = ['numeroDocumento']) {
  const lines = csvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length < 2) throw new Error('El archivo CSV debe tener al menos un header y un dato.');
  const headers = lines[0].split(',');
  for (const h of requiredHeaders) {
    if (!headers.includes(h)) {
      throw new Error(`El archivo CSV debe contener el header: ${h}`);
    }
  }
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
}


// =====================
// Carga profesional de documentos desde CSV con header
// - El archivo debe tener cabecera: numeroDocumento
// - Si falta el header, se lanza error descriptivo
// - El array resultante es de objetos: { numeroDocumento: '...' }
// =====================
const carnetDocs = new SharedArray('docs_carnet', function () {
  return parseCsvWithHeader(open('../data/documentos_carnet.csv'), ['numeroDocumento']);
});
const gradosDocs = new SharedArray('docs_grados', function () {
  return parseCsvWithHeader(open('../data/documentos_grados.csv'), ['numeroDocumento']);
});
// =====================
// USO RECOMENDADO:
// import { getCarnetDocs, getGradosDocs } from './users.js';
// const docs = getCarnetDocs();
// docs.forEach(doc => { ... doc.numeroDocumento ... });
// =====================

export function getCarnetDocs() {
  return carnetDocs;
}
export function getGradosDocs() {
  return gradosDocs;
}

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
    const docs = getCarnetDocs();
    const randomDoc = docs.length > 0 ? docs[Math.floor(Math.random() * docs.length)].numeroDocumento : undefined;
    return {
      ...u,
      numeroDocumento: randomDoc || __ENV[`SUNEDU_DOC_CARNET_${idx}`] || u.numeroDocumento,
      ip: getSourceIp()
    };
  }
  return u;
}
export function getGradosUser() { 
  const isMulti = (__VU > 1) || (__ENV.SCENARIO && __ENV.SCENARIO.includes('multi'));
  const pool = isMulti ? multiUsersPool : [smokeUser];
  const u = pickByVU(pool) || pool[0]; 
  if (u) {
    const idx = allUsersPool.indexOf(u) + 1;
    const docs = getGradosDocs();
    const randomDoc = docs.length > 0 ? docs[Math.floor(Math.random() * docs.length)].numeroDocumento : undefined;
    return {
      ...u,
      numeroDocumento: randomDoc || __ENV[`SUNEDU_DOC_GRADOS_${idx}`] || u.numeroDocumento,
      ip: getSourceIp()
    };
  }
  return u;
}
export function getResetUser()  { return pickByVU(resetUsers)  || resetUsers[0]  || null; }

