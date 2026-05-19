# Estado del Plan de Pruebas SI058

Fecha de control: 2026-05-18

## Fase actual

El proyecto se encuentra en consolidacion de smoke y auditoria multi-IP. Los casos de carga, stress, WAF limit, saturacion extrema, Grafana Cloud y Prometheus quedan marcados como PENDIENTE hasta cerrar el baseline funcional.

La explicacion tecnica de cada caso esta en `CASOS_DE_PRUEBA_RENDIMIENTO.md`.

## Comandos habilitados

| Comando | Estado | Uso |
|---|---|---|
| `npm run smoke` | HABILITADO | Smoke mixto Carnet/Grados |
| `npm run smoke:carnet` | HABILITADO | Smoke Carnet |
| `npm run smoke:grados` | HABILITADO | Smoke Grados |
| `npm run perf:audit` | HABILITADO | Auditoria multi-IP Carnet |
| `npm run perf:grados:audit` | HABILITADO | Auditoria multi-IP Grados |
| `npm run report:excel` | HABILITADO | Regenerar Excel desde ultimo JSON |
| `npm run report:word` | HABILITADO | Regenerar Word desde ultimo JSON |

## Comandos pendientes

| Comando | Estado | Motivo |
|---|---|---|
| `npm run perf:cp02` | PENDIENTE | Falta cerrar baseline multi-IP y criterios finales |
| `npm run perf:stress` | PENDIENTE | Requiere baseline estable previo |
| `npm run perf:cp01` | PENDIENTE | Requiere ventana aprobada para validar WAF/rate limit |
| `npm run perf:cp03` | PENDIENTE | Prueba extrema, requiere autorizacion operativa |
| `npm run perf:collapse` | PENDIENTE | Colapso controlado de Carnet; requiere autorizacion operativa |
| `npm run perf:all:collapse` | PENDIENTE | Colapso controlado mixto; requiere autorizacion operativa |
| `npm run perf:grados:stress` | PENDIENTE | Stress ramping de Grados aun no consolidado |
| `npm run perf:grados:cp01` | PENDIENTE | WAF limit de Grados requiere ventana autorizada |
| `npm run perf:grados:cp03` | PENDIENTE | Saturacion extrema de Grados requiere autorizacion |
| `npm run perf:grados:collapse` | PENDIENTE | Colapso controlado de Grados; requiere autorizacion operativa |
| `npm run load`, `stress`, `breakpoint`, `spike` | PENDIENTE | No forman parte de la fase smoke |
| `cloud:*`, `*:prometheus` | PENDIENTE | Se habilita despues de smoke/load local |

## Evaluacion contra estandares de rendimiento

El plan esta alineado con buenas practicas de rendimiento porque cubre:

| Capa | Casos del plan | Estandar / practica cubierta |
|---|---|---|
| Smoke funcional | CP-GRA-02 y comandos smoke | ISTQB Performance Testing: validacion inicial antes de carga |
| Baseline | CP-CAR-02 | Medicion base antes de stress; evita comparar sin linea base |
| Stress progresivo | CP-CAR-03, CP-GRA-03 | ISTQB: degradacion controlada bajo carga creciente |
| Rate limit / WAF | CP-CAR-04, CP-GRA-04 | Fiabilidad y resiliencia ante rafagas |
| Saturacion / breakpoint | CP-CAR-05, CP-GRA-05 | Busqueda de limite real, con aprobacion previa |
| Observabilidad | p95, p99, error rate, TTFB, APDEX | Google SRE Golden Signals + ISO/IEC 25010/25023 |

## Ajustes recomendados antes de aprobar el plan

1. Agregar criterios de salida por caso: p95, p99, error rate, checks, APDEX y tiempo de recuperacion.
2. Separar claramente Smoke, Load, Stress, Spike y Breakpoint. El caso CP-CAR-05 debe llamarse Breakpoint o Saturacion Extrema autorizada.
3. Definir ventanas de ejecucion y aprobacion para CP-CAR-04/CP-GRA-04 y CP-CAR-05/CP-GRA-05.
4. Indicar ambiente, version del API, datos usados y responsable de monitoreo.
5. Agregar criterio de no afectacion: sin errores 5xx sostenidos, sin saturacion permanente y sin impacto a otros sistemas QA.
6. Agregar a la matriz un smoke single-IP de Carnet para que ambos modulos tengan la misma puerta de entrada.
7. Agregar casos mixtos, spike y soak si se quiere cobertura completa de capacidad y resiliencia.
