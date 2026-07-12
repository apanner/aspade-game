# Register a Windows Scheduled Task to ping Supabase daily (prevents free-tier pause).
# Run once in PowerShell (as your user):
#   cd aspade_game
#   .\scripts\setup-keepalive-task.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$TaskName = "Aspade-Supabase-Keepalive"
$LogDir = Join-Path $ProjectRoot "logs"
$LogFile = Join-Path $LogDir "supabase-keepalive.log"

if (-not (Test-Path $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir | Out-Null
}

$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-Command",
  "Set-Location '$ProjectRoot'; npx tsx scripts/supabase-keepalive.ts *>> '$LogFile' 2>&1"
)

$Trigger = New-ScheduledTaskTrigger -Daily -At "09:00"
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -AllowStartIfOnBatteries

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Daily Supabase ping to prevent project pause" -Force | Out-Null

Write-Host "Scheduled task '$TaskName' created — runs daily at 9:00 AM"
Write-Host "Log: $LogFile"
Write-Host "Test now: npx tsx scripts/supabase-keepalive.ts"
