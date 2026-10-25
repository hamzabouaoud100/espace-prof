$ErrorActionPreference = 'Stop'
$websiteRoot = $PSScriptRoot
$websiteUrl = 'http://127.0.0.1:4173/login.html'
try {
    $response = Invoke-WebRequest -Uri $websiteUrl -UseBasicParsing -TimeoutSec 3
} catch {
    $nodePath = (Get-Command node -ErrorAction Stop).Source
    Start-Process -FilePath $nodePath -ArgumentList 'server.cjs' -WorkingDirectory $websiteRoot -WindowStyle Hidden
    $ready = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 250
        try {
            $response = Invoke-WebRequest -Uri $websiteUrl -UseBasicParsing -TimeoutSec 2
            $ready = $response.StatusCode -eq 200
            if ($ready) { break }
        } catch {}
    }
    if (-not $ready) { throw 'The website server could not start on port 4173.' }
}
Start-Process $websiteUrl
