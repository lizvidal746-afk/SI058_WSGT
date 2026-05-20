# 📚 Guía de Uso — Catálogo de Prompts IA para Performance Testing

> **Archivo:** `prompts/catalogo-prompts.html`  
> **Proyecto:** SI058 · K6 Stress Testing · SUNEDU  
> **Fecha:** 2026-05

---

## 1. ¿Cómo abrir el catálogo?

```
1. Ve a la carpeta:  SI058_K6_STRESS/prompts/
2. Haz doble clic en:  catalogo-prompts.html
3. Se abre en tu navegador (Chrome o Edge recomendado)
4. No necesita internet ni servidor local
```

---

## 2. ¿Cómo usar un prompt del catálogo?

### Pasos básicos

```
1. Abre el catálogo en el navegador
2. Busca el prompt por categoría o usa el buscador
3. Haz clic en la tarjeta del prompt
4. Lee la descripción y los consejos de uso
5. Haz clic en "Copiar prompt"
6. Ve a tu IA (Antigravity, ChatGPT, Gemini, etc.)
7. Pega el prompt con Ctrl+V
8. Si tiene variables {{PLACEHOLDER}}, reemplázalas primero
9. Envía y obtén respuesta de calidad
```

### Antes de enviar: reemplaza los placeholders

Los prompts con variables tienen esta forma:

```text
Actúa como experto en SLOs y performance testing con k6.

Contexto: Mi proyecto tiene thresholds en config/thresholds.js.

Tarea: Genera thresholds para {{NOMBRE_ESCENARIO}} con:
- VUs: {{VUS}}
- p95 máximo: {{MS}}ms
```

**Antes de enviar, reemplaza:**

```
{{NOMBRE_ESCENARIO}}  →  spike
{{VUS}}               →  500
{{MS}}                →  2000
```

**Resultado listo para enviar:**

```text
Actúa como experto en SLOs y performance testing con k6.

Contexto: Mi proyecto tiene thresholds en config/thresholds.js.

Tarea: Genera thresholds para spike con:
- VUs: 500
- p95 máximo: 2000ms
```

---

## 3. ¿Cuándo usar cada categoría?

| Situación | Categoría a usar |
|---|---|
| Quieres aprender a escribir mejores prompts | Framework & Teoría |
| Tienes un JSON de k6 y quieres interpretarlo | Análisis IA |
| Acabas de refactorizar un archivo `.js` | Revisión de Código |
| Necesitas thresholds para un nuevo escenario | Thresholds & Config |
| Un CSV no carga o validate-csv falla | Debug & CSV |
| Vas a ejecutar una prueba destructiva | Stress & Collapse |

---

## 4. Flujo recomendado por situación

### Flujo A — Antes de ejecutar una prueba

```
1. [Análisis] → "Mejora del plan de pruebas"
   → Pega CASOS_DE_PRUEBA_RENDIMIENTO.md
   → Obtén: orden, criterios de salida, cobertura

2. [Thresholds] → "Revisar configuración de escenarios"
   → Pega config/scenarios.js + config/thresholds.js
   → Obtén: validación de rampas y VUs

3. [Código] → "Revisar módulo refactorizado"  (si modificaste algo)
   → Pega el archivo que cambiaste
   → Obtén: lista de bugs antes de ejecutar
```

### Flujo B — Después de ejecutar una prueba

```
1. [Análisis] → "Análisis ejecutivo GO/NO-GO"
   → Pega reports/<RUN>/metrics_for_ai.json
   → Obtén: decisión GO / NO-GO documentada

2. [Análisis] → "Análisis técnico profundo"
   → Pega el mismo JSON
   → Obtén: hipótesis de cuellos de botella

3. [Análisis] → "Comparación Carnet vs Grados"  (si corriste ambos)
   → Pega resultados de ambos endpoints
   → Obtén: tabla comparativa para el informe
```

### Flujo C — Cuando algo falla

```
1. [Debug] → "Depurar error en validate-csv.js"
   → Pega el stack trace + headers del CSV
   → Obtén: causa raíz + fix en 2 minutos

2. [Código] → "Revisar script de herramienta"
   → Si generar-excel.js o generar-word.js producen ceros
   → Pega el script completo + el error

3. [Collapse] → "Post-mortem de prueba fallida"
   → Si la prueba terminó con Exit Code 99 inesperado
   → Pega el log completo del terminal
```

---

## 5. Estructura de un prompt de calidad (el framework)

Todo prompt del catálogo sigue esta estructura de 6 componentes:

```
┌─────────────────────────────────────────────────────┐
│  ROL        Actúa como [experto específico]         │
│  CONTEXTO   Contexto: [situación actual]            │
│  TAREA      Tarea: [qué debe hacer]                 │
│  FORMATO    Formato: [cómo presentar la respuesta]  │
│  RESTRICCIÓN Restricción: [qué NO debe hacer]       │
│  DATOS      [PEGAR DATOS AQUÍ]                      │
└─────────────────────────────────────────────────────┘
```

**Regla:** Cuanto más específico el ROL y la RESTRICCIÓN,
            más útil y precisa será la respuesta.

---

## 6. Plantilla base para crear tus propios prompts

Copia esta plantilla y rellena cada sección:

```text
Actúa como [ROL ESPECÍFICO con herramienta/dominio].

Contexto: [Describe tu situación en 2-3 líneas.
           Menciona: tecnología, proyecto, objetivo].

Tarea: [Describe qué quieres que haga. Usa lista si son varias cosas]:
1. [Acción concreta 1]
2. [Acción concreta 2]
3. [Acción concreta 3]

Formato:
- [Sección 1: qué debe contener]
- [Sección 2: tipo de output, ej: tabla / código / lista]

Restricción: [Una o dos cosas que NO debe hacer.
              Ej: "No cambies los nombres de archivo",
                  "Solo código k6, nada de Gatling"].

[PEGAR DATOS / CÓDIGO AQUÍ]
```

---

## 7. Ejemplos de adaptación

### Ejemplo 1 — Adaptar "Generar threshold" a un endpoint nuevo

**Prompt original del catálogo:**
```text
Tarea: Genera el bloque de thresholds para {{NOMBRE_ESCENARIO}}
con:
- VUs: {{VUS}}
- p95 máximo: {{MS}}ms
- Tasa de error: {{TASA_ERROR}}%
- Endpoint: {{ENDPOINT}}
```

**Tu versión adaptada para el endpoint de grados:**
```text
Tarea: Genera el bloque de thresholds para el escenario "load_grados"
con:
- VUs: 200
- p95 máximo: 3000ms
- Tasa de error: 2%
- Endpoint: /api/grados/consultar
```

---

### Ejemplo 2 — Adaptar "Revisar módulo" a lib/http.js

**Reemplazas:**
```
{{ARCHIVO}}             →  lib/http.js
{{OBJETIVO_DEL_CAMBIO}} →  agregar reintentos automáticos en 429
```

**Prompt adaptado listo:**
```text
Actúa como arquitecto senior de QA performance especializado en k6 y clean code.

Contexto: Estoy refactorizando un framework k6 en Windows.
Tengo entrypoints separados (carnet.js y grados.js) que no deben fusionarse.
Acabo de modificar lib/http.js para agregar reintentos automáticos en 429.

Tarea: Revisa el siguiente código e identifica:
1. Mutaciones de objetos no corregidas
2. Lógica duplicada que debería estar en lib/ o config/
3. Riesgos de romper los comandos npm existentes
4. Mejoras de legibilidad sin cambiar funcionalidad

[PEGA AQUÍ EL CONTENIDO DE lib/http.js]

Formato: Lista numerada por problema, con línea afectada, explicación y corrección.

Restricción: No sugieras mover archivos ni renombrarlos.
No cambies la lógica de handleSummary ni de reportes.
```

---

### Ejemplo 3 — Crear un prompt nuevo desde cero (con la plantilla)

**Situación:** Necesitas documentar un caso de prueba que no existe aún.

```text
Actúa como arquitecto de calidad con experiencia en ISTQB
y sistemas gubernamentales peruanos.

Contexto: Estoy documentando casos de prueba de rendimiento para
el sistema SI058 de SUNEDU. El sistema consulta carnets y grados
universitarios. El informe va a una auditoría formal.

Tarea: Crea un caso de prueba de rendimiento para el escenario
"consulta masiva de grados en periodo de matrícula" con:
1. ID del caso (formato CP-REND-XXX)
2. Objetivo y alcance
3. Precondiciones
4. Datos de entrada (VUs, duración, escenario k6)
5. Criterios de aceptación (thresholds)
6. Criterios de fallo

Formato: Tabla Markdown lista para pegar en CASOS_DE_PRUEBA_RENDIMIENTO.md

Restricción: Usa el mismo formato de los casos existentes.
No incluyas pasos de instalación ni configuración de ambiente.
```

---

## 8. Tabla de referencia rápida de variables

| Variable | Descripción | Ejemplo |
|---|---|---|
| `{{ARCHIVO}}` | Ruta relativa del archivo modificado | `lib/users.js` |
| `{{OBJETIVO_DEL_CAMBIO}}` | Qué se cambió y por qué | `evitar mutación de objetos` |
| `{{NOMBRE_ESCENARIO}}` | Nombre del escenario k6 | `spike`, `load_carnet` |
| `{{VUS}}` | Usuarios virtuales concurrentes | `100`, `500`, `1000` |
| `{{MS}}` | Tiempo máximo p95 en milisegundos | `1500`, `3000` |
| `{{TASA_ERROR}}` | Error rate máximo permitido en % | `1`, `5` |
| `{{ENDPOINT}}` | Ruta del endpoint objetivo | `/api/carnet/validar` |
| `{{ERROR}}` | Stack trace del error a depurar | _(pegar completo)_ |
| `{{HEADERS}}` | Encabezados del CSV | `dni,nombre,codigo` |
| `{{HERRAMIENTA}}` | Script de tools/ afectado | `generar-excel.js` |
| `{{PROBLEMA}}` | Descripción del fallo | `métricas en cero` |

---

## 9. Dónde está cada archivo

```
SI058_K6_STRESS/
├── prompts/
│   ├── catalogo-prompts.html   ← App interactiva (abrir en navegador)
│   └── GUIA_DE_USO.md          ← Este archivo
│
├── config/
│   ├── thresholds.js           ← Donde pegar thresholds generados
│   └── scenarios.js            ← Donde pegar escenarios generados
│
├── lib/
│   ├── users.js                ← Módulo frecuentemente revisado
│   └── http.js                 ← Módulo de requests con reintentos
│
├── tools/
│   ├── generar-excel.js        ← Script de reportes Excel
│   ├── generar-word.js         ← Script de reportes Word
│   └── validate-csv.js         ← Validación de datos de entrada
│
├── data/
│   ├── documentos_carnet.csv   ← Datos de prueba de carnet
│   └── documentos_grados.csv   ← Datos de prueba de grados
│
└── reports/
    └── <RUN>/
        ├── k6-output.json      ← Pegar en prompts de análisis
        ├── metrics_for_ai.json ← Pegar en prompt ejecutivo/técnico
        └── ai-insights.json    ← Pegar en prompt de interpretación
```

---

## 10. Buenas prácticas al usar prompts con IA

```
✅ Siempre especifica el ROL antes de la TAREA
✅ Pega el código o datos reales, no descripciones vagas
✅ Usa RESTRICCIONES para evitar que la IA cambie lo que no debe
✅ Si la respuesta es larga, pide primero solo la parte 1
✅ Encadena prompts en el mismo chat (la IA recuerda el contexto)
✅ Guarda las respuestas útiles en el repo como .md o comentarios

❌ No envíes prompts de 2 líneas para tareas complejas
❌ No digas "ayúdame con k6" sin contexto
❌ No pidas 7 cosas distintas en un solo mensaje
❌ No olvides reemplazar los {{PLACEHOLDERS}} antes de enviar
```

---

*Catálogo versionado en Git — actualizar con cada nuevo prompt útil.*
