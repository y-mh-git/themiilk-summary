$ErrorActionPreference = 'Stop'

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$NodeExe = 'C:\Users\ymh10\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$ViteBin = Join-Path $ProjectRoot 'node_modules\vite\bin\vite.js'
$PidFile = Join-Path $ProjectRoot '.vite.pid'
$LogFile = Join-Path $ProjectRoot 'vite.log'
$ErrorLogFile = Join-Path $ProjectRoot 'vite-error.log'
$Port = 5173
$Url = "http://127.0.0.1:$Port/"

function Test-DevServer {
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

if (Test-DevServer) {
  Write-Output "Vite dev server is already running at $Url"
  if (Test-Path $PidFile) {
    Write-Output "PID: $(Get-Content $PidFile)"
  }
  exit 0
}

if (Test-Path $PidFile) {
  $oldPid = Get-Content $PidFile -ErrorAction SilentlyContinue
  if ($oldPid) {
    $oldProcess = Get-Process -Id $oldPid -ErrorAction SilentlyContinue
    if ($oldProcess -and $oldProcess.ProcessName -eq 'node') {
      Write-Output "Stale Vite PID file found, but process is still alive: $oldPid"
    }
  }
}

if (!(Test-Path $NodeExe)) {
  throw "Node executable not found: $NodeExe"
}

if (!(Test-Path $ViteBin)) {
  throw "Vite executable not found: $ViteBin"
}

$process = Start-Process `
  -FilePath $NodeExe `
  -ArgumentList @($ViteBin, '--host', '127.0.0.1', '--port', "$Port", '--strictPort') `
  -WorkingDirectory $ProjectRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $LogFile `
  -RedirectStandardError $ErrorLogFile `
  -PassThru

$process.Id | Set-Content $PidFile

Start-Sleep -Seconds 4

if (!(Test-DevServer)) {
  $errorLog = if (Test-Path $ErrorLogFile) { Get-Content $ErrorLogFile -Tail 40 -ErrorAction SilentlyContinue } else { '' }
  throw "Vite dev server failed to start. PID: $($process.Id). Error log: $errorLog"
}

Write-Output "Vite dev server started."
Write-Output "PID: $($process.Id)"
Write-Output "URL: $Url"
