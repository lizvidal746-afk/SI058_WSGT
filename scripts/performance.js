// ============================================================
// scripts/performance.js
// Script Maestro de Rendimiento SI058 - Modular e Inteligente
// Uso: k6 run -e SCENARIO=smoke scripts/performance.js
// Escenarios: smoke, load, stress, spike, soak, cp01, cp02, cp03, collapse
// ============================================================

import { sleep } from 'k6';
import { consultaCarnet }       from '../lib/requests/carnet.js';
import { consultaGrados }       from '../lib/requests/grados.js';
import { solicitarRecuperacion } from '../lib/requests/clienteResetToken.js';
import { getCarnetUser, getGradosUser, getResetUser } from '../lib/users.js';
import { buildK6Options, getThinkTime } from '../lib/options-builder.js';

// 1. OBTENER CONFIGURACIÓN CENTRALIZADA
const { options: baseOptions, SCENARIO_NAME, handleSummary: summaryHandler } = buildK6Options('perf');

export const options = baseOptions;

// 2. FUNCIÓN PRINCIPAL (LÓGICA DE NEGOCIO)
export default function () {
  const FOCUS = __ENV.FOCUS || 'mix';
  const carnetRatio = Math.min(Math.max(parseFloat(__ENV.MIX_CARNET_RATIO || '0.70'), 0), 1);

  if (FOCUS === 'carnet') {
    consultaCarnet(getCarnetUser());
  } 
  else if (FOCUS === 'grados') {
    consultaGrados(getGradosUser());
  } 
  else if (FOCUS === 'reset') {
    solicitarRecuperacion(getResetUser());
  } 
  else {
    if (Math.random() < carnetRatio) {
      consultaCarnet(getCarnetUser());
    } else {
      consultaGrados(getGradosUser());
    }
  }

  const thinkTime = getThinkTime(SCENARIO_NAME);
  if (thinkTime > 0 && !['cp03', 'collapse'].includes(SCENARIO_NAME)) {
    sleep(thinkTime);
  }
}

// 3. REPORTE FINAL Y CIERRE (TEARDOWN)
export function teardown(data) {
  console.log(`[TEARDOWN] Finalizando prueba SI058 - Escenario: ${SCENARIO_NAME}`);
  console.log(`[INFO] Las sesiones y sockets han sido cerrados. Validar limpieza de tokens en BD si aplica.`);
}

export const handleSummary = summaryHandler;
