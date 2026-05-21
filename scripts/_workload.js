// ============================================================
// scripts/_workload.js
// Workload de carga para load/stress/breakpoint/spike.
// Solo los 2 endpoints principales (Carnet 70% / Grados 30%).
// Los endpoints de reset NO se incluyen aqui porque:
//  - solicitar-recuperacion envia email real -> spam
//  - cambiar-clave requiere token valido emitido en runtime
// ============================================================

import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { sleep } from 'k6';
import { consultaCarnet } from '../lib/requests/carnet.js';
import { consultaGrados } from '../lib/requests/grados.js';
import { getCarnetUser, getGradosUser } from '../lib/users.js';

export function workload() {
  if (Math.random() < 0.7) {
    consultaCarnet(getCarnetUser());
  } else {
    consultaGrados(getGradosUser());
  }
  sleep(randomIntBetween(1, 3));
}
