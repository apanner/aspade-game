# Clear ALL Vercel env vars, then sync from aspade_game/front/.env.local
# Usage: pwsh scripts/sync-vercel-env.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root "front\.env.local"
$projectId = "prj_MzviPsEDUA32RsxyIUUtpc8mIKkm"
$teamId = "team_tZdhcUGW2nmpZnG5FH18kTqb"
$skip = @("VERCEL_OIDC_TOKEN", "VERCEL_TOKEN", "NX_DAEMON", "TURBO_*")

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

Write-Host "Removing existing env vars..."
$existing = Invoke-RestMethod `
  -Uri "https://api.vercel.com/v9/projects/$projectId/env?teamId=$teamId" `
  -Headers $headers
foreach ($item in $existing.envs) {
  Invoke-RestMethod `
    -Uri "https://api.vercel.com/v9/projects/$projectId/env/$($item.id)?teamId=$teamId" `
    -Method DELETE `
    -Headers $headers | Out-Null
  Write-Host "Removed $($item.key)"
}

Write-Host "Adding vars from front/.env.local..."
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
    Write-Host "Set $key"
  }
}

Write-Host "Done. Redeploy: vercel deploy --prod --yes"
