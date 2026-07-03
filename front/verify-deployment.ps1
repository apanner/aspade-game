# Verify Railway deployment configuration
Write-Host "🔍 Verifying Railway deployment configuration..." -ForegroundColor Green

# Check essential files
$requiredFiles = @(
    "package.json",
    "package-lock.json", 
    "Dockerfile",
    "railway.toml",
    ".dockerignore",
    ".railwayignore"
)

$missingFiles = @()

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file" -ForegroundColor Red
        $missingFiles += $file
    }
}

# Check package.json content
if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    Write-Host "📦 Package name: $($packageJson.name)" -ForegroundColor Cyan
    Write-Host "📦 Version: $($packageJson.version)" -ForegroundColor Cyan
    
    # Check for required scripts
    $requiredScripts = @("build", "start")
    foreach ($script in $requiredScripts) {
        if ($packageJson.scripts.$script) {
            Write-Host "✅ Script '$script' found" -ForegroundColor Green
        } else {
            Write-Host "❌ Script '$script' missing" -ForegroundColor Red
            $missingFiles += "script:$script"
        }
    }
}

# Check Dockerfile content
if (Test-Path "Dockerfile") {
    $dockerfile = Get-Content "Dockerfile"
    if ($dockerfile -match 'COPY package\.json') {
        Write-Host "✅ Dockerfile has package.json copy" -ForegroundColor Green
    } else {
        Write-Host "❌ Dockerfile missing package.json copy" -ForegroundColor Red
    }
}

# Check railway.toml content
if (Test-Path "railway.toml") {
    $railwayConfig = Get-Content "railway.toml"
    if ($railwayConfig -match 'builder = "DOCKERFILE"') {
        Write-Host "✅ railway.toml uses DOCKERFILE builder" -ForegroundColor Green
    } else {
        Write-Host "❌ railway.toml not configured for DOCKERFILE" -ForegroundColor Red
    }
}

# Summary
if ($missingFiles.Count -eq 0) {
    Write-Host "`n🎉 All checks passed! Ready for Railway deployment." -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n❌ Missing files:" -ForegroundColor Red
    foreach ($file in $missingFiles) {
        Write-Host "  - $file" -ForegroundColor Red
    }
    Write-Host "`nPlease fix the missing files before deploying." -ForegroundColor Yellow
    exit 1
} 