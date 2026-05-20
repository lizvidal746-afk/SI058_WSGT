# Catálogo de Prompts Profesionales para k6, Node.js y PowerShell

Este archivo contiene prompts listos para usar en cualquier IA avanzada (incluyendo Antigravity, Copilot, ChatGPT, Claude, etc.) para acelerar y estandarizar tu trabajo de QA, performance y automatización.

---

## Prompt 1 — Revisar un módulo refactorizado

```
Actúa como arquitecto senior de QA performance especializado en k6 y clean code.

Contexto: Estoy refactorizando un framework k6 en Windows. Tengo entrypoints separados (carnet.js y grados.js) que no deben fusionarse. Acabo de modificar {{ARCHIVO}} para {{OBJETIVO_DEL_CAMBIO}}.

Tarea: Revisa el siguiente código e identifica:
1. Mutaciones de objetos no corregidas
2. Lógica duplicada que debería estar en lib/ o config/
3. Riesgos de romper los comandos npm existentes
4. Mejoras de legibilidad sin cambiar funcionalidad

[PEGAR CÓDIGO AQUÍ]

Formato: Lista numerada por problema, con línea afectada, explicación y corrección sugerida.

Restricción: No sugieras mover archivos ni renombrarlos. No cambies la lógica de handleSummary ni de reportes.
```

---

## Prompt 2 — Generar threshold para nuevo escenario

```
Actúa como experto en SLOs y performance testing con k6.

Contexto: Mi proyecto tiene thresholds centralizados en config/thresholds.js con escenarios: smoke, load, stress y audit.

Tarea: Genera el bloque de thresholds para un nuevo escenario llamado {{NOMBRE_ESCENARIO}} con estas características:
- Usuarios concurrentes: {{VUS}}
- Tiempo máximo aceptable p95: {{MS}}ms
- Tasa de error máxima: {{TASA_ERROR}}%
- Endpoint crítico: {{ENDPOINT}}

Formato: Bloque JavaScript listo para pegar en config/thresholds.js, con comentario explicando cada threshold.

Restricción: Mantener la misma estructura de objeto que los escenarios existentes.
```

---

## Prompt 3 — Depurar un CSV con errores

```
Actúa como experto en Node.js y validación de datos.

Contexto: Tengo un script validate-csv.js que valida archivos de usuarios antes de ejecutar pruebas k6. El script está fallando con el siguiente error:

{{PEGAR ERROR AQUÍ}}

El CSV afectado tiene esta estructura esperada:
{{HEADERS ESPERADOS}}

Tarea: Identifica la causa del error, explica por qué ocurre y dame el fix exacto con el código corregido.

Formato: 
1. Causa raíz (2 líneas máximo)
2. Código corregido con comentario en la línea cambiada
3. Cómo prevenir este error en el futuro

Restricción: No cambies la lógica de validación existente, solo corrige el bug puntual.
```

---

## Prompt 4 — Plantilla para iteración progresiva

```
Actúa como experto en prompt engineering para automatización QA.

Contexto: Estoy mejorando un prompt para {{TAREA}} en mi framework k6/Node.js.

Prompt inicial:
{{PROMPT_INICIAL}}

Resultado obtenido:
{{RESULTADO}}

Tarea: Sugiere una mejora concreta al prompt para obtener un resultado más útil, y muestra el nuevo resultado esperado.

Formato:
- Prompt mejorado
- Resultado esperado

Restricción: El ejemplo debe ser sobre generación de código, validación de datos o configuración de escenarios en k6.
```

---

## Prompt 5 — Ejercicios prácticos de prompting

```
Tarea: Dame 5 ejercicios de prompting ordenados de menor a mayor dificultad, enfocados en tareas reales de QA performance con k6.

Por cada ejercicio:
- Nivel (1 al 5)
- Situación real que lo motiva
- El prompt "malo" típico
- El prompt correcto con todos los elementos
- Qué mejora concretamente y por qué

Restricción: No incluyas ejercicios genéricos de redacción o marketing. Solo contexto técnico.
```

---

## Cómo usar los placeholders `{{variable}}`

Antes de enviar el prompt, reemplaza los valores entre llaves por los datos de tu caso real. Ejemplo:

```
{{ARCHIVO}}            → lib/users.js
{{OBJETIVO_DEL_CAMBIO}} → evitar mutación de objetos
{{NOMBRE_ESCENARIO}}   → spike
{{VUS}}                → 500
{{MS}}                 → 2000
{{TASA_ERROR}}         → 5
{{ENDPOINT}}           → /api/carnet/validar
```

---

> Guarda y versiona este archivo. Así tu equipo siempre tendrá prompts listos para Antigravity, Copilot, ChatGPT, Claude, etc.
