# ============================================================
# tools/run-k6.ps1
# Carga variables del .env al entorno del proceso y ejecuta k6.
# Uso:  powershell -ExecutionPolicy Bypass -File tools/run-k6.ps1 scripts/performance.js [args extra]
# Nota: no usar -o para --out aqui; PowerShell lo confunde con -OutVariable. Usar --out.
# ============================================================
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$ScriptPath,

    [switch]$NoOpen,
    [switch]$SkipAI,
    [switch]$SkipReports,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ExtraArgs
)

$ErrorActionPreference = 'Stop'
$envFile = Join-Path $PSScriptRoot '..\.env'
$reportsDir = Join-Path $PSScriptRoot '..\reports'
if (!(Test-Path $reportsDir)) { New-Item -ItemType Directory -Path $reportsDir | Out-Null }

if (-not (Test-Path $envFile)) {
    Write-Error ".env no encontrado en $envFile. Copia .env.example y completa valores."
    exit 1
}

# Cargar .env -> variables de entorno del proceso (ignora comentarios y lineas vacias)
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
        $idx = $line.IndexOf('=')
        $name = $line.Substring(0, $idx).Trim()
        $value = $line.Substring($idx + 1).Trim()
        # Quitar comillas envolventes si existen
        if ($value -match '^".*"$' -or $value -match "^'.*'$") {
            $value = $value.Substring(1, $value.Length - 2)
        }
        [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
}

# Log base URL and Ollama endpoint for debugging
Write-Host "[run-k6] BASE_URL      : $env:BASE_URL" -ForegroundColor Cyan
Write-Host "[run-k6] OLLAMA_ENDPOINT: $env:OLLAMA_ENDPOINT" -ForegroundColor Cyan

# Detectar IP real del host, priorizando la subred 192.168.28.x (misma que K6_LOCAL_IPS)
# y excluyendo adaptadores virtuales (WSL 172.17.x.x, Hyper-V, Docker 172.16-31.x.x)
$localIp = $null

# 1ra prioridad: misma subred que el pool de IPs de k6 (192.168.28.x)
$localIp = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -like '192.168.28.*' } |
    Select-Object -First 1).IPAddress

# 2da prioridad: cualquier otra 192.168.x.x (excluye virtuales 172.x.x.x)
if (-not $localIp) {
    $localIp = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.IPAddress -like '192.168.*' } |
        Select-Object -First 1).IPAddress
}

# 3ra prioridad: 10.x.x.x (redes corporativas/VPN reales, no virtuales)
if (-not $localIp) {
    $localIp = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.IPAddress -like '10.*' -and $_.IPAddress -notlike '10.255.*' } |
        Select-Object -First 1).IPAddress
}

# Fallback: auto (indica que k6 eligio automaticamente)
if (-not $localIp) { $localIp = 'auto' }

[System.Environment]::SetEnvironmentVariable('K6_SOURCE_IP', $localIp, 'Process')

# --- Lógica de IP de origen para k6 ---
# Siempre usamos el pool completo si está definido en el .env
if ($env:K6_LOCAL_IPS) {
    [System.Environment]::SetEnvironmentVariable('K6_LOCAL_IPS', $env:K6_LOCAL_IPS, 'Process')
    Write-Host "[run-k6] Usando pool de IPs: $($env:K6_LOCAL_IPS)" -ForegroundColor Yellow
}



# ── 5. Preparar Carpeta de Resultados ────────────────────────────────────────
$ScriptBasename = [System.IO.Path]::GetFileNameWithoutExtension($ScriptPath)
$TIMESTAMP = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$RUN_DIR_NAME = if ($env:TEST_CASE_ID) { "$($env:TEST_CASE_ID)_$($ScriptBasename.ToUpper())_RUN_$TIMESTAMP" } else { "$($ScriptBasename.ToUpper())_RUN_$TIMESTAMP" }
$RUN_DIR = Join-Path $reportsDir $RUN_DIR_NAME
if (!(Test-Path $RUN_DIR)) { New-Item -ItemType Directory -Path $RUN_DIR | Out-Null }

# Detectar escenario para el nombre del archivo
$SCENARIO_NAME = if ($env:SCENARIO) { $env:SCENARIO } else { "test" }
$REPORT_BASE = "perf-$SCENARIO_NAME-$TIMESTAMP"
$JSON_OUT = Join-Path $RUN_DIR "$REPORT_BASE.json"

Write-Host "[run-k6] IP detectada: $localIp. Ejecutando k6..." -ForegroundColor Cyan

# Ejecutar k6 exportando el resumen JSON a la carpeta de la corrida
& k6 run --summary-export=$JSON_OUT $ScriptPath @ExtraArgs
$k6ExitCode = $LASTEXITCODE

if (-not (Test-Path $JSON_OUT)) {
    Write-Warning "  [run-k6] k6 termino con codigo $k6ExitCode y no genero JSON. Se omite post-proceso para no generar evidencia incompleta."
    exit $k6ExitCode
}

if ($k6ExitCode -ne 0) {
    Write-Warning "  [run-k6] k6 termino con codigo $k6ExitCode. Se continuara el post-proceso porque existe JSON de evidencia."
}

    # Mover archivos generados por k6 y la IA
    # Usamos un patrón más flexible para el timestamp y capturamos archivos recientes
    Get-ChildItem -Path $reportsDir | Where-Object { 
        $_.Name -notmatch ".*RUN_.*" -and ($_.LastWriteTime -gt (Get-Date).AddMinutes(-2)) -and ($_.Attributes -ne "Directory")
    } | Move-Item -Destination $RUN_DIR -Force

# Mover el reporte HTML si se generó en la raíz de reports
Start-Sleep -Seconds 2
$lastHtml = Get-ChildItem -Path $RUN_DIR -Filter "*.html" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($lastHtml) {
    $absolutePath = $lastHtml.FullName
}

# ── Mostrar y Abrir el reporte HTML movido ──────────────────
if ($absolutePath) {
    Write-Host ''
    Write-Host '  ============================================================' -ForegroundColor DarkCyan
    Write-Host '  REPORTE HTML GENERADO (Organizado)' -ForegroundColor Cyan
    Write-Host '  ============================================================' -ForegroundColor DarkCyan
    Write-Host "  Archivo : $absolutePath" -ForegroundColor Green
    Write-Host "  URL     : file:///$($absolutePath.Replace('\','/'))" -ForegroundColor Yellow
    Write-Host '  ============================================================' -ForegroundColor DarkCyan
    Write-Host ''
    if (-not $NoOpen -and $env:CI -ne 'true') {
        Start-Process $absolutePath
        Write-Host '  [run-k6] Reporte HTML abierto en el navegador.' -ForegroundColor Green
    } else {
        Write-Host '  [run-k6] Apertura automatica omitida (-NoOpen o CI=true).' -ForegroundColor Yellow
    }
} else {
    Write-Warning "  [run-k6] No se pudo localizar el reporte HTML para abrirlo."
}

# ── 6. Generar Análisis con IA (Ollama) ──────────────────────────────────────
if (-not $SkipAI) {
    Write-Host "  [run-k6] Extrayendo métricas e invocando IA Local (Ollama)..." -ForegroundColor Cyan
    node (Join-Path $PSScriptRoot 'extract-k6-metrics.js') $JSON_OUT
    node (Join-Path $PSScriptRoot 'generate-ai-insights.js')
} else {
    Write-Host "  [run-k6] IA omitida por -SkipAI." -ForegroundColor Yellow
}

# ── 7. Generar Excel y Word en la subcarpeta ──────────────────────────────────
if (-not $SkipReports) {
    Write-Host "  [run-k6] Generando reportes Excel y Word en subcarpeta..." -ForegroundColor Cyan

    node (Join-Path $PSScriptRoot 'generar-excel.js') $JSON_OUT
    node (Join-Path $PSScriptRoot 'generar-word.js')  $JSON_OUT
} else {
    Write-Host "  [run-k6] Excel/Word omitidos por -SkipReports." -ForegroundColor Yellow
}

# Limpieza: Mover archivos de IA a la subcarpeta
$metricsForAi = Join-Path $reportsDir "metrics_for_ai.json"
$aiInsights = Join-Path $reportsDir "ai-insights.json"
if (Test-Path $metricsForAi) { Move-Item $metricsForAi $RUN_DIR -Force }
if (Test-Path $aiInsights) { Move-Item $aiInsights $RUN_DIR -Force }

Write-Host "`n  ============================================================" -ForegroundColor DarkCyan
Write-Host "  RESULTADOS ORGANIZADOS" -ForegroundColor Cyan
Write-Host "  Carpeta: $RUN_DIR" -ForegroundColor Green
Write-Host "  ============================================================`n"

exit $k6ExitCode

