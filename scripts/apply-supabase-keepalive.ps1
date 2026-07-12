# Applies scripts/supabase-keepalive.sql to the remote Supabase project.
# Requires one of:
#   SUPABASE_ACCESS_TOKEN  — Personal access token from https://supabase.com/dashboard/account/tokens
#   SUPABASE_DB_PASSWORD   — Database password from Project Settings → Database
#
# Usage:
#   $env:SUPABASE_ACCESS_TOKEN="sbp_..."; pwsh scripts/apply-supabase-keepalive.ps1
#   $env:SUPABASE_DB_PASSWORD="..."; pwsh scripts/apply-supabase-keepalive.ps1

$ErrorActionPreference = "Stop"
$ProjectRef = "wiuthfkfxzytjrviyypw"
$SqlFile = Join-Path $PSScriptRoot "supabase-keepalive.sql"
$Sql = Get-Content $SqlFile -Raw

function Invoke-SupabaseManagementQuery {
  param([string]$Token, [string]$Query)
  $headers = @{
    Authorization = "Bearer $Token"
    "Content-Type" = "application/json"
  }
  $body = @{ query = $Query } | ConvertTo-Json
  return Invoke-RestMethod `
    -Method POST `
    -Uri "https://api.supabase.com/v1/projects/$ProjectRef/database/query" `
    -Headers $headers `
    -Body $body
}

function Invoke-PostgresQuery {
  param([string]$Password, [string]$Query)
  $env:PGPASSWORD = $Password
  $conn = "postgresql://postgres.$ProjectRef@aws-0-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require"
  $tmp = New-TemporaryFile
  Set-Content -Path $tmp.FullName -Value $Query -Encoding UTF8
  try {
    if (Get-Command psql -ErrorAction SilentlyContinue) {
      psql $conn -f $tmp.FullName
      return $true
    }
    throw "psql not installed"
  } finally {
    Remove-Item $tmp.FullName -Force -ErrorAction SilentlyContinue
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  }
}

Write-Host "Applying keepalive schema to $ProjectRef ..."

if ($env:SUPABASE_ACCESS_TOKEN) {
  $statements = $Sql -split ';' | ForEach-Object { $_.Trim() } | Where-Object { $_ -and $_ -notmatch '^\s*--' }
  foreach ($stmt in $statements) {
    if (-not $stmt) { continue }
    Invoke-SupabaseManagementQuery -Token $env:SUPABASE_ACCESS_TOKEN -Query $stmt | Out-Null
    Write-Host "OK: $($stmt.Substring(0, [Math]::Min(60, $stmt.Length)))..."
  }
  Write-Host "Done via Management API."
  exit 0
}

if ($env:SUPABASE_DB_PASSWORD) {
  Invoke-PostgresQuery -Password $env:SUPABASE_DB_PASSWORD -Query $Sql | Out-Null
  Write-Host "Done via psql."
  exit 0
}

Write-Error @"
No credentials found. Set one of:
  SUPABASE_ACCESS_TOKEN  (https://supabase.com/dashboard/account/tokens)
  SUPABASE_DB_PASSWORD   (Project Settings → Database → password)
Then re-run: pwsh scripts/apply-supabase-keepalive.ps1
"@
