# ============================================================
# tools/cloud-k6.ps1
# Carga variables del .env al entorno del proceso y ejecuta k6 cloud.
# k6 cloud no lee .env por si solo; hay que inyectarlas al proceso.
# Ademas, por defecto k6 cloud NO reenvia variables del sistema al runtime
# (evita fugas); hace falta --include-system-env-vars para que __ENV las vea en cloud.
# Uso pendiente: powershell -ExecutionPolicy Bypass -File tools/cloud-k6.ps1 scripts/performance.js [args extra]
# ============================================================
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$ScriptPath,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ExtraArgs
)

$ErrorActionPreference = 'Stop'
$envFile = Join-Path $PSScriptRoot '..\.env'

if (-not (Test-Path $envFile)) {
    Write-Error ".env no encontrado en $envFile. Copia .env.example y completa valores."
    exit 1
}

Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
        $idx = $line.IndexOf('=')
        $name = $line.Substring(0, $idx).Trim()
        $value = $line.Substring($idx + 1).Trim()
        if ($value -match '^".*"$' -or $value -match "^'.*'$") {
            $value = $value.Substring(1, $value.Length - 2)
        }
        [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
}

Write-Host "[cloud-k6] .env cargado. Ejecutando: k6 cloud run --include-system-env-vars $ScriptPath $ExtraArgs" -ForegroundColor Cyan
& k6 cloud run --include-system-env-vars $ScriptPath @ExtraArgs
exit $LASTEXITCODE
