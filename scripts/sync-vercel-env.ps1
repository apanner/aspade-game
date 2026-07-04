# Sync aspade_game/front/.env.local to Vercel (aspade-game project).
# Usage: pwsh scripts/sync-vercel-env.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root "front\.env.local"
$projectId = "prj_MzviPsEDUA32RsxyIUUtpc8mIKkm"
$teamId = "team_tZdhcUGW2nmpZnG5FH18kTqb"
$skip = @("VERCEL_OIDC_TOKEN", "VERCEL_TOKEN")

if (-not (Test-Path $envFile)) {
  Write-Error "Missing $envFile"
}

$authPath = Join-Path $env:APPDATA "com.vercel.cli\Data\auth.json"
if (-not (Test-Path $authPath)) {
  Write-Error "Run vercel login first"
}
$token = (Get-Content $authPath | ConvertFrom-Json).token
$headers = @{
  Authorization = "Bearer $token"
  "Content-Type" = "application/json"
}

Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  if ($_ -match '^([^=]+)=(.*)$') {
    $key = $matches[1].Trim()
    $val = $matches[2].Trim().Trim('"').Trim().Replace("`r", "")
    if ($skip -contains $key) { return }
    $body = @(
      @{
        key = $key
        value = $val
        type = "plain"
        target = @("production", "preview", "development")
      }
    ) | ConvertTo-Json -Depth 4
    Invoke-RestMethod `
      -Uri "https://api.vercel.com/v10/projects/$projectId/env?upsert=true&teamId=$teamId" `
      -Method POST `
      -Headers $headers `
      -Body $body | Out-Null
    Write-Host "Synced $key"
  }
}

Write-Host "Done. Redeploy: cd front && vercel deploy --prod --yes"
