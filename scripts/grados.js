// ============================================================
// scripts/grados.js
// Ejecución aislada: solo endpoint Grados/consulta
// Uso: powershell -File tools/run-k6.ps1 scripts/grados.js
// Escenarios: k6 run -e SCENARIO=smoke scripts/grados.js
// ============================================================

import { sleep } from 'k6';
import { buildK6Options, getThinkTime } from '../lib/options-builder.js';
import { consultaGrados } from '../lib/requests/grados.js';
import { getGradosUser } from '../lib/users.js';

// 1. OBTENER CONFIGURACIÓN CENTRALIZADA
const { options: baseOptions, SCENARIO_NAME, handleSummary: summaryHandler } = buildK6Options('grados');

export const options = baseOptions;

// 2. LÓGICA DEL ENDPOINT
export default function () {
  consultaGrados(getGradosUser());

  const thinkTime = getThinkTime(SCENARIO_NAME);
  if (thinkTime > 0 && !['cp03', 'collapse'].includes(SCENARIO_NAME)) {
    sleep(thinkTime);
  }
}

// 3. TEARDOWN Y REPORTES
export function teardown() {
  console.log(`[TEARDOWN] Grados · Escenario: ${SCENARIO_NAME}`);
}

export const handleSummary = summaryHandler;
