# SI058_K6_STRESS

Pruebas de rendimiento y estres para **SUNEDU SI058** con k6 + Grafana Cloud.
Alineado a **ISTQB Performance Testing**, **ISO/IEC 25010** (Eficiencia de desempeno) e **ISO/IEC 25023** (Metricas de calidad).

> Estado actual: fase de consolidacion smoke/auditoria. Load, stress, WAF limit, breakpoint, cloud y Prometheus estan marcados como **PENDIENTE** hasta cerrar baseline.

---

## Estructura

```text

SI058_K6_STRESS/
├── config/
│   ├── env.js                 Lectura de variables de entorno
│   └── thresholds.js          SLOs por escenario (smoke/load/stress/breakpoint/spike)
├── lib/
│   ├── http.js                Wrapper con retry + backoff exponencial
│   ├── checks.js              classifyAndCheck() - reglas de negocio SUNEDU
│   ├── metrics.js             Metricas custom (Apdex, 429, business_limit, ttfb)
│   ├── scenarios.js           Escenarios reutilizables
│   ├── summary.js             handleSummary HTML + JSON
│   └── requests/
│       ├── carnet.js          POST /api/Carnet/consulta
│       ├── grados.js          POST /api/Grados/consulta
│       └── clienteResetToken.js   solicitar-recuperacion + cambiar-clave
├── scripts/
│   ├── _workload.js           Distribucion futura de carga
│   ├── performance.js         Script maestro smoke/mix
│   ├── carnet.js              Smoke/auditoria de Carnet
│   └── grados.js              Smoke/auditoria de Grados
├── tools/
│   ├── setup-ips.ps1          Agrega 10 IPs alias (Admin)
│   ├── remove-ips.ps1         Limpieza
│   └── verify-ips.ps1         Verificacion
├── data/
│   └── testUsers.json         Datos sinteticos QA
├── reports/                   HTML + JSON generados (ignorados en git)
├── .github/workflows/
│   └── k6-stress.yml          Workflow Actions self-hosted
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Quick start (Windows 11)

> Ejecutar los comandos npm desde `SI058_K6_STRESS`. Ese directorio contiene `.env`, `tools/`, `scripts/` y `reports/`.

### 1. Instalar k6

```powershell
winget install k6 --source winget
# o:  choco install k6
k6 version
```

### 2. Configurar variables locales

```powershell
cd D:\SUNEDU\AUTOMATIZACION\SI058_WSGT\SI058_K6_STRESS
Copy-Item .env.example .env
notepad .env   # completar valores reales
```

### 3. Cargar variables al shell (PowerShell)

```powershell
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*([^#][^=]*)=(.*)$') {
    [Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2].Trim(), 'Process')
  }
}
```

### 4. Configurar las 10 IPs alias (UNA vez, como Administrador)

Abrir **PowerShell como Administrador**:

```powershell
cd D:\SUNEDU\AUTOMATIZACION\SI058_WSGT\SI058_K6_STRESS
.\tools\setup-ips.ps1
.\tools\verify-ips.ps1
```

> Tu IP principal `192.168.28.8` (DHCP) NO se toca. Se agregan `192.168.28.48` a `192.168.28.57`.

### 5. Ejecutar pruebas

```powershell
# Smoke - SIEMPRE primero
npm run smoke
npm run smoke:carnet
npm run smoke:grados

# Auditoria multi-IP, cuando las IPs alias ya existen
npm run perf:carnet:audit
npm run perf:grados:audit

# Load/stress/breakpoint/spike aun figuran como PENDIENTE.
# No ejecutarlos sin baseline aprobado, ventana autorizada y monitoreo backend.
```

Los comandos smoke anteriores son los recomendados para uso diario. Internamente equivalen a:

```powershell
npm run perf:smoke
npm run perf:carnet:smoke
npm run perf:grados:smoke
```

Para escenarios especificos se usa la forma `perf:<servicio>:<escenario>`. Hoy los servicios activos son `carnet` y `grados`; si se agrega otro servicio, debe mantener la misma convencion.

### Colapso controlado

Los comandos de colapso son pruebas destructivas controladas. No deben ejecutarse sin ventana autorizada, monitoreo backend y criterio de interrupcion.

```powershell
# Colapsar solo Carnet
npm run perf:carnet:collapse

# Colapsar solo Grados
npm run perf:grados:collapse

# Colapsar ambos endpoints en trafico mixto
npm run perf:all:collapse
```

---

## Envio a Grafana Cloud (free tier)

Pendiente hasta cerrar smoke, auditoria multi-IP y baseline local.

Cuando se habilite, se documentara:

- token/proyecto k6 Cloud,
- Prometheus Remote Write,
- dashboard Grafana,
- limites del free tier,
- comando exacto por escenario,
- criterio de no afectacion del ambiente QA.

---

## Por que el promedio MIENTE (para gerencia)

| KPI | Para que sirve | ISTQB | SRE |
|-----|----------------|-------|-----|

| `http_req_duration p(50)` | Mediana - usuario tipico | si | - |
| `http_req_duration p(95)` | El 95% experimenta esto o mejor | si | Latency |
| `http_req_duration p(99)` | El 1% peor (queja de gerencia) | si | Latency |
| `http_req_duration max` | El caso peor absoluto | si | - |
| `http_req_duration stddev` | Inconsistencia (jitter) | si | - |
| `http_req_failed` | Tasa de errores | si | Errors |
| `http_reqs` (RPS) | Throughput / Traffic | si | Traffic |
| `vus / vus_max` | Saturacion (concurrencia) | si | Saturation |
| `iteration_duration` | Tiempo de sesion completa | si | - |
| `http_req_waiting` (TTFB) | Tiempo hasta primer byte | si | - |
| `apdex_score` (custom) | Satisfaccion usuario (0-1) | si | - |
| `rate_limited_requests` | Veces que el gateway dijo 429 | - | Errors |
| `business_limit_hits` | Limite interno SUNEDU (HORA/MIN/MES) | - | - |
| `session_success_rate` | Iteraciones completas exitosas | si | - |

**Analogia ejecutiva:** decir "el tiempo PROMEDIO de respuesta es 200ms" es como decir "en PROMEDIO los pasajeros llegaron a tiempo" cuando 5% aterrizo 6 horas tarde. **p95 y Apdex cuentan la historia real.**

---

## Recomendaciones para escalamiento (proximos pasos)

1. **Upgrade Grafana Cloud k6 Pro** ($299/mes): habilita Private Load Zones (probar desde varias regiones AWS reales, no solo 10 IPs locales).
2. **Mas IPs:** pedir a TI 50-100 IPs adicionales por subred. Util para evitar WAF rate-limiting por IP.
3. **Distribucion geografica:** una vez con Pro, usar `cloud.distribution` con `amazon:us:ashburn`, `amazon:sa:saopaulo`, etc.
4. **xk6-browser:** medir tiempos reales de carga en navegador, no solo API.
5. **CI continuo:** correr `smoke` en cada PR, `load` nocturno, `stress` semanal, `breakpoint` mensual.

## Documentacion del plan

- `PLAN_ESTADO_PRUEBAS.md`: estado actual de comandos habilitados/pendientes.
- `CASOS_DE_PRUEBA_RENDIMIENTO.md`: explicacion tecnica y catalogo de 24 casos de prueba.
- `PROMPTS_MAESTROS_IA.md`: prompts y estructura de analisis IA.
- `PLAN_DE_PRUEBAS_RENDIMIENTO_SI058_2026-05.xlsx`: matriz ejecutiva de casos.

---

## Seguridad

- `.env` esta en `.gitignore` - NUNCA se commitea
- Credenciales en GitHub Actions van como **Secrets**
- Datos de prueba en `data/testUsers.json` son SINTETICOS (no PII real)
- Las IPs locales se documentan en `.env.example` con rango (no valores reales en repo publico)

---

## Referencias

- [k6 docs](https://grafana.com/docs/k6/)
- [`--local-ips`](https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/#local-ips)
- [ISO/IEC 25010](https://iso25000.com/index.php/normas-iso-25000/iso-25010)
- ISTQB CTFL-PT: https://www.istqb.org/certifications/performance-testing
- Google SRE Golden Signals: https://sre.google/sre-book/monitoring-distributed-systems/
- Dashboard Grafana ID 19665: https://grafana.com/grafana/dashboards/19665-k6-prometheus/
