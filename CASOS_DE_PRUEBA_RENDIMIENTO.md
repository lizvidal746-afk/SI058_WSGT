# Casos de Prueba de Rendimiento SI058

Fecha de control: 2026-05-18

Este documento explica la matriz de casos de rendimiento del servicio SI058 Web Service de Grados y Titulos. Complementa el archivo `PLAN_DE_PRUEBAS_RENDIMIENTO_SI058_2026-05.xlsx`.

Directorio oficial de ejecucion: `SI058_K6_STRESS`.

Los comandos `npm run ...` de este documento deben ejecutarse desde ese directorio, porque ahi viven `.env`, `tools/`, `scripts/` y `reports/`.

Convencion de comandos por servicio:

- Para smoke se documentan los alias cortos: `npm run smoke`, `npm run smoke:carnet`, `npm run smoke:grados`.
- Para escenarios especificos se usa el patron escalable `npm run perf:<servicio>:<escenario>`.
- Servicios actuales: `carnet` y `grados`. Si aparece un tercer servicio, debe seguir la misma forma: `perf:<nuevo-servicio>:smoke`, `perf:<nuevo-servicio>:audit`, `perf:<nuevo-servicio>:cp02`, etc.
- Los comandos genericos antiguos (`perf:audit`, `perf:cp02`, `perf:stress`, etc.) quedan solo como compatibilidad y apuntan a Carnet.

## Catalogo completo de ejecucion

| ID | Modulo | Tipo | Comando |
|---|---|---|---|
| CP-MIX-00 | Carnet + Grados | Smoke mixto | `npm run smoke` |
| CP-CAR-00 | Carnet | Smoke | `npm run smoke:carnet` |
| CP-CAR-01 | Carnet | Auditoria multi-IP | `npm run perf:carnet:audit` |
| CP-CAR-02 | Carnet | Baseline/load | `npm run perf:carnet:cp02` |
| CP-CAR-03 | Carnet | Stress ramping | `npm run perf:carnet:stress` |
| CP-CAR-04 | Carnet | WAF/rate limit | `npm run perf:carnet:cp01` |
| CP-CAR-05 | Carnet | Breakpoint extremo | `npm run perf:carnet:cp03` |
| CP-CAR-06 | Carnet | Collapse | `npm run perf:carnet:collapse` |
| CP-CAR-07 | Carnet | Spike | `npm run perf:carnet:spike` |
| CP-CAR-08 | Carnet | Soak/endurance | `npm run perf:carnet:soak` |
| CP-GRA-00 | Grados | Smoke | `npm run smoke:grados` |
| CP-GRA-01 | Grados | Auditoria multi-IP | `npm run perf:grados:audit` |
| CP-GRA-02 | Grados | Baseline/load | `npm run perf:grados:cp02` |
| CP-GRA-03 | Grados | Stress ramping | `npm run perf:grados:stress` |
| CP-GRA-04 | Grados | WAF/rate limit | `npm run perf:grados:cp01` |
| CP-GRA-05 | Grados | Breakpoint extremo | `npm run perf:grados:cp03` |
| CP-GRA-06 | Grados | Collapse | `npm run perf:grados:collapse` |
| CP-GRA-07 | Grados | Spike | `npm run perf:grados:spike` |
| CP-GRA-08 | Grados | Soak/endurance | `npm run perf:grados:soak` |
| CP-MIX-01 | Carnet + Grados | Mixed load | `npm run perf:all:load` |
| CP-MIX-02 | Carnet + Grados | Mixed stress | `npm run perf:all:stress` |
| CP-MIX-03 | Carnet + Grados | Mixed spike | `npm run perf:all:spike` |
| CP-MIX-04 | Carnet + Grados | Mixed soak | `npm run perf:all:soak` |
| CP-MIX-05 | Carnet + Grados | Mixed breakpoint | `npm run perf:all:cp03` |
| CP-MIX-06 | Carnet + Grados | Mixed collapse | `npm run perf:all:collapse` |

## Criterios comunes

| Criterio | Umbral inicial recomendado | Motivo |
|----------|---------------------------:|--------|

| Latencia p95 | < 1500 ms | SLO principal de experiencia del usuario |
| Latencia p99 | < 2000 ms en smoke/baseline; observado en stress | Control de cola larga |
| Error rate HTTP | < 1% en smoke/baseline | Fiabilidad funcional y de red |
| Checks funcionales | >= 99% | La respuesta debe ser correcta, no solo rapida |
| APDEX | >= 0.90 | Indicador ejecutivo de satisfaccion |
| Errores 5xx | 0 sostenidos en smoke/baseline | Protege backend y base de datos |
| TTFB | Registrar promedio y p95 | Distingue backend/BD de red |
| Evidencia | HTML, JSON, CSV, Excel y Word | Trazabilidad de auditoria |

## CP-CAR-00 - Smoke Baseline Single IP Carnet

Objetivo: validar rapidamente conectividad, credenciales, payload y respuesta funcional del endpoint de Carnet.

Tipo: smoke single-IP.

Comando actual: `npm run smoke:carnet`.

Equivalente tecnico: `npm run perf:carnet:smoke`.

Criterio de salida:

- 4 iteraciones completadas.
- p95 < 1500 ms.
- Error rate < 1%.
- Checks >= 99%.
- Sin errores 5xx.

Estado actual: habilitado.

## CP-CAR-01 - Auditoria Forense Multi-IP Carnet

Objetivo: verificar que el endpoint de Carnet responda correctamente desde 10 IPs de origen y que la trazabilidad por IP no se pierda.

Tipo: audit / smoke extendido multi-IP.

Comando actual: `npm run perf:carnet:audit`.

Precondiciones:

- `.env` configurado.
- IPs alias `192.168.28.48-192.168.28.57` creadas y verificadas.
- Usuarios 2-11 disponibles.
- CSV de Carnet con documentos validos.

Criterio de salida:

- p95 < 1500 ms.
- Error rate < 1%.
- Checks >= 99%.
- 10 IPs visibles en el reporte.
- Sin perdida de evidencia por IP.

Estado actual: habilitado para fase smoke/auditoria.

## CP-CAR-02 - Carga Base Organica Multi-IP Carnet

Objetivo: establecer una linea base de comportamiento con usuarios e IPs multiples antes de stress.

Tipo: baseline / load controlado.

Comando planificado: `npm run perf:carnet:cp02`.

Precondiciones:

- Smoke Carnet aprobado.
- Auditoria multi-IP aprobada.
- 11 usuarios/IPs documentados.
- Ventana de prueba autorizada.

Criterio de salida:

- p95 < 1500 ms.
- p99 < 2000 ms.
- Error rate < 1%.
- APDEX >= 0.90.
- Sin errores 5xx.

Estado actual: pendiente.

## CP-CAR-03 - Escalabilidad Multi-PC Carnet

Objetivo: validar degradacion controlada al incrementar la concurrencia hasta 50 VUs.

Tipo: stress ramping.

Comando planificado: `npm run perf:carnet:stress`.

Criterio de salida:

- No se exige el mismo SLO de baseline, pero la degradacion debe ser gradual.
- 5xx no sostenidos.
- p95 y p99 deben correlacionarse con incremento de VUs/RPS.
- Debe identificarse el primer punto de saturacion visible.

Estado actual: pendiente.

## CP-CAR-04 - Limite de Red WAF Single IP Carnet

Objetivo: comprobar si el gateway/WAF limita correctamente por IP sin impactar el backend.

Tipo: rate limit / resiliencia.

Comando planificado: `npm run perf:carnet:cp01`.

Criterio de salida:

- HTTP 429 esperado bajo rafaga.
- Sin errores 5xx sostenidos.
- Backend estable durante y despues del bloqueo.
- Recuperacion normal al bajar la carga.

Estado actual: pendiente; requiere ventana autorizada.

## CP-CAR-05 - Saturacion Backend Extrema Carnet

Objetivo: identificar el punto de quiebre real del backend/base de datos.

Tipo: breakpoint / stress extremo.

Comando planificado: `npm run perf:carnet:cp03`.

Criterio de salida:

- Determinar capacidad maxima observada.
- Registrar punto de degradacion: VUs, RPS, p95, p99, error rate.
- Confirmar recuperacion posterior.
- No ejecutar sin aprobacion operativa.

Estado actual: pendiente; requiere autorizacion.

## CP-CAR-06 - Colapso Controlado de Carnet

Objetivo: provocar una ruptura rapida y controlada del endpoint Carnet para identificar umbral de colapso, errores dominantes y capacidad de recuperacion.

Tipo: collapse / breakpoint rapido.

Comando planificado: `npm run perf:carnet:collapse`.

Precondiciones:

- Aprobacion explicita de QA, arquitectura y operaciones.
- Ventana de ejecucion sin usuarios reales.
- Monitoreo activo de API, gateway, servidor de aplicacion y base de datos.
- Plan de interrupcion manual si aparecen 5xx sostenidos o impacto fuera del ambiente.

Criterio de salida:

- Identificar VUs/RPS en el primer 5xx, primer timeout y primer 429 relevante.
- Registrar p95/p99 antes, durante y despues del colapso.
- Confirmar recuperacion posterior del servicio.
- Generar evidencia aunque los thresholds fallen.

Estado actual: pendiente; prueba destructiva controlada.

## CP-GRA-01 - Auditoria Forense Multi-IP Grados

Objetivo: verificar respuesta y trazabilidad del endpoint de Grados desde 10 IPs de origen.

Tipo: audit / smoke extendido multi-IP.

Comando actual: `npm run perf:grados:audit`.

Criterio de salida:

- p95 < 1500 ms.
- Error rate < 1%.
- Checks >= 99%.
- 10 IPs visibles en el reporte.
- Sin perdida de evidencia por IP.

Estado actual: habilitado para fase smoke/auditoria.

## CP-GRA-00 - Smoke Baseline Single IP Grados

Objetivo: validar rapidamente conectividad, credenciales, payload y respuesta funcional del endpoint de Grados.

Tipo: smoke single-IP.

Comando actual: `npm run smoke:grados`.

Equivalente tecnico: `npm run perf:grados:smoke`.

Criterio de salida:

- 4 iteraciones completadas.
- p95 < 1500 ms.
- Error rate < 1%.
- Checks >= 99%.
- Sin errores 5xx.

Estado actual: habilitado.

## CP-GRA-02 - Carga Base Organica Multi-IP Grados

Objetivo: establecer una linea base de comportamiento del endpoint Grados con usuarios e IPs multiples antes de stress.

Tipo: baseline / load controlado.

Comando planificado: `npm run perf:grados:cp02`.

Precondiciones:

- Smoke Grados aprobado.
- Auditoria multi-IP Grados aprobada.
- Usuarios/IPs documentados.
- Ventana de prueba autorizada.

Criterio de salida:

- p95 < 1500 ms.
- p99 < 2000 ms.
- Error rate < 1%.
- APDEX >= 0.90.
- Sin errores 5xx.

Estado actual: pendiente.

## CP-GRA-03 - Escalabilidad Multi-PC Grados

Objetivo: validar degradacion controlada de Grados al incrementar carga hasta 50 VUs.

Tipo: stress ramping.

Comando planificado: `npm run perf:grados:stress`.

Criterio de salida:

- Degradacion gradual, no abrupta.
- Sin 5xx sostenidos.
- Registro de VUs/RPS donde aparecen errores o latencia alta.

Estado actual: pendiente.

## CP-GRA-04 - Limite de Red WAF Single IP Grados

Objetivo: validar bloqueo por rafaga desde una IP contra el endpoint de Grados.

Tipo: rate limit / resiliencia.

Comando planificado: `npm run perf:grados:cp01`.

Criterio de salida:

- HTTP 429 esperado bajo rafaga.
- Sin caida de backend.
- Recuperacion normal al bajar la carga.

Estado actual: pendiente; requiere ventana autorizada.

## CP-GRA-05 - Saturacion Backend Extrema Grados

Objetivo: identificar limite de concurrencia del endpoint Grados y su base de datos.

Tipo: breakpoint / stress extremo.

Comando planificado: `npm run perf:grados:cp03`.

Criterio de salida:

- Determinar capacidad maxima observada.
- Registrar punto de quiebre.
- Confirmar recuperacion posterior.
- No ejecutar sin aprobacion operativa.

Estado actual: pendiente; requiere autorizacion.

## CP-GRA-06 - Colapso Controlado de Grados

Objetivo: provocar una ruptura rapida y controlada del endpoint Grados para identificar umbral de colapso, errores dominantes y capacidad de recuperacion.

Tipo: collapse / breakpoint rapido.

Comando planificado: `npm run perf:grados:collapse`.

Criterio de salida:

- Identificar VUs/RPS en el primer 5xx, primer timeout y primer 429 relevante.
- Registrar p95/p99 antes, durante y despues del colapso.
- Confirmar recuperacion posterior del servicio.
- Generar evidencia aunque los thresholds fallen.

Estado actual: pendiente; prueba destructiva controlada.

## CP-MIX-01 - Colapso Controlado Mixto Carnet + Grados

Objetivo: identificar el punto de colapso sistemico cuando ambos endpoints reciben carga agresiva simultanea.

Tipo: collapse / breakpoint rapido mixto.

Comando planificado: `npm run perf:all:collapse`.

Criterio de salida:

- Determinar que modulo se degrada primero.
- Comparar errores por endpoint: Carnet vs Grados.
- Medir p95/p99, 5xx, timeouts, 429 y recuperacion posterior.
- Confirmar que el ambiente vuelve a baseline despues de la prueba.

Estado actual: pendiente; prueba destructiva controlada.

## Cobertura actual

| Frente | Cubierto | Comentario |
|--------|----------|------------|

| Smoke funcional | Si | Cubierto por CP-CAR-00, CP-GRA-00 y CP-MIX-00 |
| Auditoria multi-IP | Si | Cubierto para Carnet y Grados |
| Baseline/load | Si | Cubierto como pendiente por CP-CAR-02 y CP-GRA-02 |
| Stress ramping | Si | Cubierto para ambos modulos como pendiente |
| Rate limit/WAF | Si | Cubierto para ambos modulos como pendiente |
| Breakpoint/saturacion | Si | Cubierto para ambos modulos como pendiente |
| Collapse rapido | Si | Cubierto por Carnet, Grados y mixto como prueba destructiva controlada |
| Spike test | Si | Cubierto como pendiente por CP-CAR-07 y CP-GRA-07 |
| Soak/endurance | Si | Cubierto como pendiente por CP-CAR-08 y CP-GRA-08 |
| Recovery test | Parcial | Debe explicitarse recuperacion post-WAF/post-breakpoint |
| Volumen/datos | Parcial | Hay CSVs, falta definir volumen minimo, distribucion y datos invalidos esperados |
| Observabilidad backend | Parcial | Se mide k6; falta documentar CPU, memoria, DB, gateway, logs y dashboard asociado |

## Casos recomendados para completar la estrategia

1. Definir criterios finales de baseline para CP-CAR-02 y CP-GRA-02.
2. CP-MIX-02 - Carga mixta Carnet/Grados con proporcion real de uso.
3. CP-MIX-03 - Spike repentino y recuperacion.
4. CP-MIX-04 - Soak de 30 a 60 minutos con carga moderada.
5. CP-OBS-01 - Validacion de monitoreo: CPU, memoria, conexiones, DB, gateway, 429 y 5xx.

## Recomendacion profesional

La matriz actual cubre los frentes principales de una estrategia de rendimiento inicial: smoke, baseline, stress, rate limit, auditoria multi-IP, saturacion y collapse controlado. Para considerarla completa ante una revision formal, faltan criterios de salida mas precisos, casos de spike/soak/carga mixta realista y documentar monitoreo backend asociado a cada corrida.
