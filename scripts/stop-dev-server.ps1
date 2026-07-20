$ErrorActionPreference = 'Stop'

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$PidFile = Join-Path $ProjectRoot '.vite.pid'

if (!(Test-Path $PidFile)) {
  Write-Output 'No Vite PID file found.'
  exit 0
}

$pidValue = Get-Content $PidFile -ErrorAction SilentlyContinue
if (!$pidValue) {
  Write-Output 'Vite PID file is empty.'
  exit 0
}

$process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
if (!$process) {
  Write-Output "No running process found for PID $pidValue."
  exit 0
}

if ($process.ProcessName -ne 'node') {
  Write-Output "PID $pidValue is not a node process. Skipping stop."
  exit 0
}

Stop-Process -Id $pidValue
Write-Output "Stopped Vite dev server. PID: $pidValue"
