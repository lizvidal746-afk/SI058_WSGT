'use strict';

const command = process.argv[2] || 'comando';

const pending = {
  load: 'Pendiente: definir carga nominal, datos y criterios de salida antes de ejecutar.',
  stress: 'Pendiente: cerrar baseline/load antes de escalar a stress.',
  spike: 'Pendiente: definir pico, duracion y criterio de recuperacion.',
  breakpoint: 'Pendiente: definir punto de quiebre y aprobacion de ventana de prueba.',
  'perf:carnet:load': 'Pendiente CP-CAR-02: baseline multi-IP aun no consolidado.',
  'perf:carnet:stress': 'Pendiente CP-CAR-03: stress ramping aun no consolidado.',
  'perf:carnet:spike': 'Pendiente CP-CAR-07: spike aun no forma parte de la fase smoke.',
  'perf:carnet:cp01': 'Pendiente CP-CAR-04: validar WAF limit con ventana autorizada.',
  'perf:carnet:cp02': 'Pendiente CP-CAR-02: requiere usuarios/IPs y criterios cerrados.',
  'perf:carnet:cp03': 'Pendiente CP-CAR-05: prueba extrema requiere autorizacion.',
  'perf:load': 'Compatibilidad: usar preferentemente perf:carnet:load. Pendiente CP-CAR-02.',
  'perf:stress': 'Compatibilidad: usar preferentemente perf:carnet:stress. Pendiente CP-CAR-03.',
  'perf:spike': 'Compatibilidad: usar preferentemente perf:carnet:spike. Pendiente CP-CAR-07.',
  'perf:cp01': 'Compatibilidad: usar preferentemente perf:carnet:cp01. Pendiente CP-CAR-04.',
  'perf:cp02': 'Compatibilidad: usar preferentemente perf:carnet:cp02. Pendiente CP-CAR-02.',
  'perf:cp03': 'Compatibilidad: usar preferentemente perf:carnet:cp03. Pendiente CP-CAR-05.',
  'perf:grados:stress': 'Pendiente CP-GRA-03: stress ramping de Grados aun no consolidado.',
  'perf:grados:cp01': 'Pendiente CP-GRA-04: validar WAF limit con ventana autorizada.',
  'perf:grados:cp03': 'Pendiente CP-GRA-05: prueba extrema requiere autorizacion.',
  cloud: 'Pendiente: integracion cloud/Grafana se habilitara despues de smoke/load local.',
  prometheus: 'Pendiente: Prometheus RW se habilitara despues de smoke/load local.',
};

const message = pending[command] || 'Pendiente de implementacion en esta fase.';

console.error('');
console.error(`[PENDIENTE] ${command}`);
console.error(message);
console.error('Fase actual aprobada para ejecutar: smoke, perf:carnet:smoke, perf:grados:smoke, perf:carnet:audit, perf:grados:audit.');
console.error('');
process.exit(1);
