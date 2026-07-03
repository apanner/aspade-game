# 🚀 Frontend Railway Deployment Script
# Simplified script for deploying frontend to Railway

Write-Host "🚀 Frontend Railway Deployment Script" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# Check Railway CLI
Write-Host "📋 Step 1: Railway CLI Check" -ForegroundColor Cyan
try {
    $version = railway --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Railway CLI found: $version" -ForegroundColor Green
    } else {
        throw "Railway CLI not working"
    }
} catch {
    Write-Host "❌ Railway CLI not found!" -ForegroundColor Red
    Write-Host "Please install Railway CLI:" -ForegroundColor Yellow
    Write-Host "  npm install -g @railway/cli" -ForegroundColor White
    Write-Host "  Then run: railway login" -ForegroundColor White
    exit 1
}

# Check current project status
Write-Host ""
Write-Host "📋 Step 2: Project Status" -ForegroundColor Cyan
$status = railway status 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Current project status:" -ForegroundColor Green
    Write-Host $status -ForegroundColor White
} else {
    Write-Host "❌ Not linked to any project!" -ForegroundColor Red
    Write-Host "Please run: railway link" -ForegroundColor Yellow
    exit 1
}

# Check if we're in the right directory
Write-Host ""
Write-Host "📋 Step 3: Directory Check" -ForegroundColor Cyan
if (Test-Path "package.json") {
    Write-Host "✅ Found package.json in current directory" -ForegroundColor Green
} else {
    Write-Host "❌ package.json not found!" -ForegroundColor Red
    Write-Host "Please run this script from the frontend directory" -ForegroundColor Yellow
    exit 1
}

# Check if dependencies are installed
Write-Host ""
Write-Host "📋 Step 4: Dependencies Check" -ForegroundColor Cyan
if (Test-Path "node_modules") {
    Write-Host "✅ Dependencies are installed" -ForegroundColor Green
} else {
    Write-Host "⚠️ Dependencies not found. Installing..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
        exit 1
    }
}

# Build the project
Write-Host ""
Write-Host "📋 Step 5: Building Project" -ForegroundColor Cyan
Write-Host "Running: npm run build" -ForegroundColor White
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build completed successfully!" -ForegroundColor Green

# Deploy to Railway
Write-Host ""
Write-Host "📋 Step 6: Deploying to Railway" -ForegroundColor Cyan
Write-Host "Running: railway up" -ForegroundColor White
railway up

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    
    # Get service URL
    $serviceUrl = railway domain 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 Deployment Summary" -ForegroundColor Green
        Write-Host "====================" -ForegroundColor Green
        Write-Host "✅ Frontend deployed to: $serviceUrl" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
        Write-Host "1. Wait for deployment to complete" -ForegroundColor White
        Write-Host "2. Test your app at: $serviceUrl" -ForegroundColor White
        Write-Host "3. Monitor logs: railway logs" -ForegroundColor White
    }
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Check the logs above for more details" -ForegroundColor Yellow
    exit 1
} 