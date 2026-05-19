// ============================================================
// lib/scenarios.js
// Escenarios Modulares para SI058 - Estándar ISTQB/ISO
// ============================================================

import { LOCAL_IPS } from '../config/env.js';

// 1. TIPOS DE PRUEBA (ESTÁNDAR)
// ------------------------------------------------------------

// SMOKE: 1 VU, 4 iteraciones.
export const smokeScenario = {
  smoke: {
    executor: 'shared-iterations',
    vus: 1,
    iterations: 4,
    maxDuration: '1m',
    tags: { scenario: 'smoke', test_type: 'smoke' },
  },
};

function intEnv(name, fallback) {
  const n = parseInt(__ENV[name] || '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function strEnv(name, fallback) {
  return (__ENV[name] || fallback).trim();
}

// LOAD: Carga nominal sostenida.
export const loadScenario = {
  load: {
    executor: 'constant-vus',
    vus: intEnv('K6_LOAD_VUS', 20),
    duration: strEnv('K6_LOAD_DURATION', '10m'),
    tags: { scenario: 'load', test_type: 'load' },
  },
};

// STRESS: Escalera (10 -> 50 VUs).
export const stressScenario = {
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: strEnv('K6_STRESS_RAMP_1', '2m'), target: intEnv('K6_STRESS_VUS_1', 10) },
      { duration: strEnv('K6_STRESS_RAMP_2', '5m'), target: intEnv('K6_STRESS_VUS_2', 20) },
      { duration: strEnv('K6_STRESS_RAMP_3', '5m'), target: intEnv('K6_STRESS_VUS_3', 30) },
      { duration: strEnv('K6_STRESS_RAMP_4', '5m'), target: intEnv('K6_STRESS_VUS_4', 50) },
      { duration: strEnv('K6_STRESS_RAMP_DOWN', '3m'), target: 0  },
    ],
    tags: { scenario: 'stress', test_type: 'stress' },
  },
};

// SPIKE: Pico repentino.
export const spikeScenario = {
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: strEnv('K6_SPIKE_WARMUP', '30s'), target: intEnv('K6_SPIKE_BASE_VUS', 5) },
      { duration: strEnv('K6_SPIKE_RAMP', '1m'),  target: intEnv('K6_SPIKE_PEAK_VUS', 50) },
      { duration: strEnv('K6_SPIKE_HOLD', '2m'),  target: intEnv('K6_SPIKE_PEAK_VUS', 50) },
      { duration: strEnv('K6_SPIKE_RECOVER', '1m'),  target: intEnv('K6_SPIKE_BASE_VUS', 5) },
      { duration: strEnv('K6_SPIKE_RAMP_DOWN', '30s'), target: 0 },
    ],
    tags: { scenario: 'spike', test_type: 'spike' },
  },
};

// SOAK: carga moderada sostenida para detectar degradacion lenta.
export const soakScenario = {
  soak: {
    executor: 'constant-vus',
    vus: intEnv('K6_SOAK_VUS', 10),
    duration: strEnv('K6_SOAK_DURATION', '30m'),
    tags: { scenario: 'soak', test_type: 'soak' },
  },
};

// 2. CASOS DE PRUEBA (ESPECÍFICOS DE IP/TOPOLOGÍA)
// ------------------------------------------------------------

// CP-01: Límite de Red/WAF (N Usuarios -> 1 IP).
// Enfocado en forzar el 429 desde una sola IP.
export const cp01WafLimit = {
  cp01_waf: {
    executor: 'ramping-arrival-rate',
    startRate: intEnv('K6_CP01_START_RPS', 1),
    timeUnit: '1s',
    preAllocatedVUs: intEnv('K6_CP01_PRE_VUS', 5),
    maxVUs: intEnv('K6_CP01_MAX_VUS', 20),
    stages: [
      { duration: strEnv('K6_CP01_STAGE_1', '1m'), target: intEnv('K6_CP01_RPS_1', 5) },
      { duration: strEnv('K6_CP01_STAGE_2', '2m'), target: intEnv('K6_CP01_RPS_2', 10) },
      { duration: strEnv('K6_CP01_STAGE_3', '2m'), target: intEnv('K6_CP01_RPS_3', 20) },
    ],
    tags: { scenario: 'cp01-waf', ip_mode: 'single' },
  },
};

// CP-02: Carga Base Orgánica (11 Usuarios -> 11 IPs).
export const cp02BaselineMultiIp = {
  cp02_baseline: {
    executor: 'per-vu-iterations',
    vus: intEnv('K6_CP02_VUS', 11),
    iterations: intEnv('K6_CP02_ITER_PER_VU', 10),
    maxDuration: strEnv('K6_CP02_MAX_DURATION', '5m'),
    tags: { scenario: 'cp02-baseline', ip_mode: 'multi' },
  },
};

// CP-03: Saturación Backend (500 Usuarios concurrentes -> 10 IPs).
// Escalamos agresivamente para evadir el rate limit por IP y golpear el DB.
export const cp03BackendSaturation = {
  cp03_saturation: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: strEnv('K6_CP03_RAMP_1', '3m'), target: intEnv('K6_CP03_VUS_1', 50) },
      { duration: strEnv('K6_CP03_RAMP_2', '5m'), target: intEnv('K6_CP03_VUS_2', 100) },
      { duration: strEnv('K6_CP03_RAMP_3', '5m'), target: intEnv('K6_CP03_VUS_3', 200) },
      { duration: strEnv('K6_CP03_RAMP_4', '5m'), target: intEnv('K6_CP03_VUS_4', 200) },
      { duration: strEnv('K6_CP03_RAMP_DOWN', '2m'), target: 0 },
    ],
    tags: { scenario: 'cp03-saturation', ip_mode: 'multi' },
  },
};

// COLLAPSE: prueba destructiva controlada para forzar ruptura rapida.
export const collapseScenario = {
  collapse: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: strEnv('K6_COLLAPSE_RAMP_1', '1m'), target: intEnv('K6_COLLAPSE_VUS_1', 50) },
      { duration: strEnv('K6_COLLAPSE_RAMP_2', '1m'), target: intEnv('K6_COLLAPSE_VUS_2', 200) },
      { duration: strEnv('K6_COLLAPSE_RAMP_3', '2m'), target: intEnv('K6_COLLAPSE_VUS_3', 300) },
      { duration: strEnv('K6_COLLAPSE_RAMP_DOWN', '30s'), target: 0 },
    ],
    tags: { scenario: 'collapse', ip_mode: 'multi' },
  },
};

// AUDITORIA MULTI-IP: 1 VU por cada IP local disponible.
export const multiIpAuditScenario = {
  multi_ip_audit: {
    executor: 'per-vu-iterations',
    vus: 10, // Forzado a 10 para usar Usuarios 2-11 e IPs .48-.57
    iterations: intEnv('K6_ITER_PER_VU', 4),
    maxDuration: strEnv('K6_AUDIT_MAX_DURATION', '5m'),
    tags: { scenario: 'multi_ip_audit', ip_mode: 'multi' },
  },
};

// 3. FACTORY: Obtener escenario por nombre (vía Variable de Entorno)
// ------------------------------------------------------------
export function getScenario(name) {
  const all = {
    smoke: smokeScenario,
    load: loadScenario,
    stress: stressScenario,
    spike: spikeScenario,
    soak: soakScenario,
    cp01: cp01WafLimit,
    cp02: cp02BaselineMultiIp,
    cp03: cp03BackendSaturation,
    collapse: collapseScenario,
    multi_ip_audit: multiIpAuditScenario,
  };
  return all[name] || { error: true };
}

