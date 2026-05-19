# Prompts Maestros IA - SI058 Performance

Fecha de control: 2026-05-18

El analisis IA del proyecto se ejecuta con:

```powershell
node tools/extract-k6-metrics.js <ruta-json-k6>
node tools/generate-ai-insights.js
```

El flujo usa `metrics_for_ai.json` como entrada y genera `ai-insights.json`.

## Motor recomendado

Opcion gratuita principal: Ollama local.

```powershell
ollama pull llama3.1:8b
ollama serve
```

Variables opcionales:

```powershell
$env:OLLAMA_MODEL = "llama3.1:8b"
$env:OLLAMA_HOST = "127.0.0.1"
$env:OLLAMA_PORT = "11434"
$env:OLLAMA_TIMEOUT_MS = "180000"
```

Tambien puedes probar modelos locales mas livianos si tu equipo no tiene muchos recursos:

- `llama3.2:3b`
- `mistral:7b`
- `qwen2.5:7b`

## IA adicional gratuita opcional

Se puede usar una IA externa como segunda opinion, pero no conviene volverla dependencia obligatoria del framework porque las cuotas gratuitas cambian.

Opcion viable: Google AI Studio / Gemini API free tier. Uso recomendado:

1. Genera la corrida k6.
2. Abre `reports/<RUN>/metrics_for_ai.json` o `reports/<RUN>/ai-insights.json`.
3. Pega el JSON en Google AI Studio con uno de los prompts maestros.
4. Compara la conclusion con Ollama.

Regla profesional: la evidencia oficial debe seguir siendo k6 + reportes locales; la IA es apoyo interpretativo, no fuente de verdad.

## Prompt ejecutivo

```text
Actúa como SRE senior y gerente de calidad. Analiza este resultado k6 de SI058. Evalúa si el sistema está listo para pasar de smoke/baseline a carga. Usa p95, p99, error rate, APDEX, checks, TTFB, 429, 5xx y recuperación. Dame conclusión ejecutiva, riesgos, decisión GO/NO-GO y próximos pasos.
```

## Prompt técnico profundo

```text
Actúa como ingeniero de rendimiento senior. Analiza el JSON/reporte de k6 de SI058. Identifica cuello de botella probable: cliente, red, WAF, backend, base de datos o datos de prueba. Cruza p95, p99, TTFB, blocked, TLS, http_req_failed, status codes, checks y métricas por IP. Dame hipótesis priorizadas y evidencias.
```

## Prompt seguridad collapse

```text
Actúa como especialista en pruebas destructivas controladas. Revisa este plan de collapse para SI058. Valida precondiciones, ventana, límites, monitoreo, criterios de aborto, recuperación, riesgos operativos y evidencia esperada. Dime si apruebas ejecutar, qué falta y qué comandos deberían usarse.
```

## Prompt mejora de plan

```text
Actúa como arquitecto de performance testing con experiencia en ISTQB, SRE e ISO/IEC 25010. Revisa esta matriz de casos SI058. Indica cobertura faltante, duplicidades, riesgos, orden recomendado de ejecución, criterios de salida por caso y qué casos deben requerir aprobación formal.
```

## Prompt comparación Carnet vs Grados

```text
Actúa como analista de rendimiento. Compara los resultados de Carnet y Grados en SI058. Evalúa latencia, errores, APDEX, TTFB, throughput, comportamiento por IP y estabilidad. Identifica cuál endpoint degrada primero y qué evidencia sustenta la conclusión.
```

## Adaptacion dentro del proyecto

Estos prompts ya estan consolidados en `tools/ai-prompts.js`.

El archivo `ai-insights.json` debe incluir:

- `analisis_ejecutivo`
- `analisis_tecnico_profundo`
- `revision_collapse`
- `mejora_plan_pruebas`
- `comparacion_carnet_grados`
- `recomendacion_prioritaria`

Si Ollama no esta disponible, el proyecto genera un diagnostico heuristico con la misma estructura.
