// ============================================================
// scripts/carnet.js
// Ejecución aislada: solo endpoint Carnet/consulta
// Uso: powershell -File tools/run-k6.ps1 scripts/carnet.js
// Escenarios: k6 run -e SCENARIO=smoke scripts/carnet.js
// ============================================================

import { sleep } from 'k6';
import { buildK6Options, getThinkTime } from '../lib/options-builder.js';
import { consultaCarnet } from '../lib/requests/carnet.js';
import { getCarnetUser } from '../lib/users.js';

// 1. OBTENER CONFIGURACIÓN CENTRALIZADA
const { options: baseOptions, SCENARIO_NAME, handleSummary: summaryHandler } = buildK6Options('carnet');

export const options = baseOptions;

// 2. LÓGICA DEL ENDPOINT
export default function () {
  consultaCarnet(getCarnetUser());

  const thinkTime = getThinkTime(SCENARIO_NAME);
  if (thinkTime > 0 && !['cp03', 'collapse'].includes(SCENARIO_NAME)) {
    sleep(thinkTime);
  }
}

// 3. TEARDOWN Y REPORTES
export function teardown() {
  console.log(`[TEARDOWN] Carnet · Escenario: ${SCENARIO_NAME}`);
}

export const handleSummary = summaryHandler;
