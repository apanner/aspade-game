# 🚀 Ascore Railway Deployment Script
# Comprehensive deployment script with project selection, service selection, and folder deployment

param(
    [switch]$SkipPrompts
)

Write-Host "🚀 Ascore Railway Deployment Script" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""

# Function to get user input with default
function Get-UserInput {
    param(
        [string]$Prompt,
        [string]$Default = "",
        [string]$ValidationPattern = ".*"
    )
    
    if ($SkipPrompts -and $Default) {
        Write-Host "$Prompt [$Default]" -ForegroundColor Yellow
        return $Default
    }
    
    do {
        $input = Read-Host "$Prompt"
        if ([string]::IsNullOrWhiteSpace($input) -and $Default) {
            $input = $Default
        }
        
        if ($input -match $ValidationPattern) {
            return $input
        } else {
            Write-Host "❌ Invalid input. Please try again." -ForegroundColor Red
        }
    } while ($true)
}

# Function to select from options
function Select-Option {
    param(
        [string]$Prompt,
        [array]$Options,
        [int]$DefaultIndex = 0
    )
    
    Write-Host ""
    Write-Host $Prompt -ForegroundColor Cyan
    Write-Host "Options:" -ForegroundColor White
    
    for ($i = 0; $i -lt $Options.Count; $i++) {
        $marker = if ($i -eq $DefaultIndex) { "→" } else { " " }
        Write-Host "  $marker [$($i + 1)] $($Options[$i])" -ForegroundColor White
    }
    
    if ($SkipPrompts) {
        $selection = $DefaultIndex + 1
        Write-Host "Selected: $($Options[$DefaultIndex])" -ForegroundColor Green
        return $Options[$DefaultIndex]
    }
    
    do {
        $input = Read-Host "Enter selection (1-$($Options.Count))"
        if ($input -match '^\d+$') {
            $selection = [int]$input - 1
            if ($selection -ge 0 -and $selection -lt $Options.Count) {
                Write-Host "Selected: $($Options[$selection])" -ForegroundColor Green
                return $Options[$selection]
            }
        }
        Write-Host "❌ Invalid selection. Please enter a number between 1 and $($Options.Count)." -ForegroundColor Red
    } while ($true)
}

# Function to check if Railway CLI is installed
function Test-RailwayCLI {
    try {
        $version = railway --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Railway CLI found: $version" -ForegroundColor Green
            return $true
        }
    } catch {
        # Railway CLI not found
    }
    
    Write-Host "❌ Railway CLI not found!" -ForegroundColor Red
    Write-Host "Please install Railway CLI:" -ForegroundColor Yellow
    Write-Host "  npm install -g @railway/cli" -ForegroundColor White
    Write-Host "  Then run: railway login" -ForegroundColor White
    return $false
}

# Function to get Railway projects
function Get-RailwayProjects {
    Write-Host "📋 Fetching Railway projects..." -ForegroundColor Yellow
    
    try {
        $projects = railway projects 2>&1
        if ($LASTEXITCODE -eq 0) {
            $projectLines = $projects -split "`n" | Where-Object { $_ -match '\S' }
            $projectNames = @()
            
            foreach ($line in $projectLines) {
                # Handle different Railway CLI output formats
                if ($line -match '^(\S+)\s+') {
                    $projectNames += $matches[1]
                } elseif ($line -match '^\s*(\S+)\s*$') {
                    $projectNames += $matches[1]
                }
            }
            
            if ($projectNames.Count -gt 0) {
                Write-Host "✅ Found $($projectNames.Count) project(s)" -ForegroundColor Green
                return $projectNames
            }
        }
        
        # If no projects found, try to get current project
        Write-Host "📋 Checking current project..." -ForegroundColor Yellow
        $currentProject = railway whoami 2>&1
        if ($LASTEXITCODE -eq 0 -and $currentProject -match '\S') {
            Write-Host "✅ Found current project context" -ForegroundColor Green
            return @("current-project")
        }
        
    } catch {
        Write-Host "⚠️ Error fetching projects" -ForegroundColor Yellow
    }
    
    # If still no projects found, assume we can create or use existing
    Write-Host "📋 No projects detected, but Railway is available" -ForegroundColor Yellow
    Write-Host "You can either:" -ForegroundColor White
    Write-Host "1. Create a new project" -ForegroundColor White
    Write-Host "2. Link to existing project" -ForegroundColor White
    Write-Host "3. Use current project (if already linked)" -ForegroundColor White
    return @("create-new", "link-existing", "use-current")
}

# Function to get Railway services
function Get-RailwayServices {
    Write-Host "📋 Fetching Railway services..." -ForegroundColor Yellow
    
    try {
        # Try to get services using railway service command
        $services = railway service 2>&1
        if ($LASTEXITCODE -eq 0) {
            $serviceLines = $services -split "`n" | Where-Object { $_ -match '\S' }
            $serviceNames = @()
            
            foreach ($line in $serviceLines) {
                # Handle different output formats
                if ($line -match '^\s*(\S+)\s*$') {
                    $serviceNames += $matches[1]
                } elseif ($line -match '^(\S+)\s+') {
                    $serviceNames += $matches[1]
                }
            }
            
            if ($serviceNames.Count -gt 0) {
                Write-Host "✅ Found $($serviceNames.Count) service(s)" -ForegroundColor Green
                return $serviceNames
            }
        }
        
        # If no services found, try to list them differently
        Write-Host "📋 Trying alternative service detection..." -ForegroundColor Yellow
        $status = railway status 2>&1
        if ($LASTEXITCODE -eq 0) {
            $statusLines = $status -split "`n" | Where-Object { $_ -match 'service' }
            $serviceNames = @()
            
            foreach ($line in $statusLines) {
                if ($line -match '(\S+)\s+service') {
                    $serviceNames += $matches[1]
                }
            }
            
            if ($serviceNames.Count -gt 0) {
                Write-Host "✅ Found $($serviceNames.Count) service(s) via status" -ForegroundColor Green
                return $serviceNames
            }
        }
        
    } catch {
        Write-Host "⚠️ Error fetching services" -ForegroundColor Yellow
    }
    
    return @()
}

# Function to deploy service
function Deploy-Service {
    param(
        [string]$ServiceName,
        [string]$DeployPath,
        [string]$Port
    )
    
    Write-Host ""
    Write-Host "🚀 Deploying $ServiceName from $DeployPath..." -ForegroundColor Yellow
    
    # Switch to service
    Write-Host "Switching to service: $ServiceName" -ForegroundColor White
    railway service $ServiceName
    
    # Set port environment variable
    if ($Port) {
        Write-Host "Setting PORT=$Port..." -ForegroundColor White
        railway variables --set "PORT=$Port"
    }
    
    # Deploy from specific path
    Write-Host "Deploying from: $DeployPath" -ForegroundColor White
    Set-Location $DeployPath
    railway up
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $ServiceName deployed successfully!" -ForegroundColor Green
        
        # Get service URL
        $serviceUrl = railway domain 2>&1
        Write-Host "Service URL: $serviceUrl" -ForegroundColor Green
        
        return $serviceUrl
    } else {
        Write-Host "❌ $ServiceName deployment failed!" -ForegroundColor Red
        return $null
    }
}

# Main deployment flow
Write-Host "📋 Step 1: Railway CLI Check" -ForegroundColor Cyan
if (-not (Test-RailwayCLI)) {
    exit 1
}

Write-Host ""
Write-Host "📋 Step 2: Project Selection" -ForegroundColor Cyan

# Get available projects
$projects = Get-RailwayProjects

# Handle different project scenarios
if ($projects.Count -eq 0) {
    Write-Host "❌ No Railway projects found!" -ForegroundColor Red
    Write-Host "Please create a project first or check your Railway account." -ForegroundColor Yellow
    exit 1
}

# Select project
$selectedProject = Select-Option "Select Railway project:" $projects

# Handle special project options
if ($selectedProject -eq "create-new") {
    Write-Host "📋 Creating new Railway project..." -ForegroundColor Yellow
    $projectName = Get-UserInput "Enter project name:" "ascore-spade"
    railway init --name $projectName
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Project created successfully!" -ForegroundColor Green
        $selectedProject = $projectName
    } else {
        Write-Host "❌ Failed to create project!" -ForegroundColor Red
        exit 1
    }
} elseif ($selectedProject -eq "link-existing") {
    Write-Host "📋 Linking to existing Railway project..." -ForegroundColor Yellow
    $projectId = Get-UserInput "Enter Railway project ID or name:"
    railway link $projectId
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Successfully linked to project!" -ForegroundColor Green
        $selectedProject = $projectId
    } else {
        Write-Host "❌ Failed to link to project!" -ForegroundColor Red
        exit 1
    }
} elseif ($selectedProject -eq "current-project") {
    Write-Host "📋 Using current Railway project context..." -ForegroundColor Yellow
    $selectedProject = "current"
} elseif ($selectedProject -eq "use-current") {
    Write-Host "📋 Using current Railway project context..." -ForegroundColor Yellow
    $selectedProject = "current"
}

Write-Host ""
Write-Host "📋 Step 3: Project Linking" -ForegroundColor Cyan

# Link to project (skip if already linked or using current context)
if ($selectedProject -eq "current") {
    Write-Host "✅ Using current Railway project context" -ForegroundColor Green
} else {
    Write-Host "Linking to project: $selectedProject" -ForegroundColor White
    railway link $selectedProject
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to link to project!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Successfully linked to project: $selectedProject" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Step 4: Service Selection" -ForegroundColor Cyan

# Get available services
$services = Get-RailwayServices
if ($services.Count -eq 0) {
    Write-Host "⚠️ No services found. Creating new services..." -ForegroundColor Yellow
    
    # Create services if none exist
    Write-Host "Creating backend service..." -ForegroundColor White
    Set-Location "serv"
    railway up --service backend
    Set-Location ".."
    
    Write-Host "Creating frontend service..." -ForegroundColor White
    Set-Location "front"
    railway up --service frontend
    Set-Location ".."
    
    # Refresh services list
    $services = Get-RailwayServices
    if ($services.Count -eq 0) {
        $services = @("backend", "frontend")
    }
}

# Select service
$serviceOptions = @("backend", "frontend", "both")
Write-Host "Available services: $($services -join ', ')" -ForegroundColor Cyan
$serviceSelection = Select-Option "Select service to deploy:" $serviceOptions 2

Write-Host ""
Write-Host "📋 Step 5: Deployment Configuration" -ForegroundColor Cyan

# Define deployment paths and ports
$deploymentConfig = @{
    "backend" = @{
        "path" = "serv"
        "port" = "3001"
        "description" = "Backend API Server"
    }
    "frontend" = @{
        "path" = "front"
        "port" = "3000"
        "description" = "Frontend Next.js App"
    }
}

$backendUrl = $null
$frontendUrl = $null

# Deploy based on selection
switch ($serviceSelection) {
    "backend" { # Backend only
        $backendUrl = Deploy-Service "backend" $deploymentConfig.backend.path $deploymentConfig.backend.port
    }
    "frontend" { # Frontend only
        $frontendUrl = Deploy-Service "frontend" $deploymentConfig.frontend.path $deploymentConfig.frontend.port
    }
    "both" { # Both services
        Write-Host "🔄 Deploying both services..." -ForegroundColor Yellow
        
        # Deploy backend first
        $backendUrl = Deploy-Service "backend" $deploymentConfig.backend.path $deploymentConfig.backend.port
        
        if ($backendUrl) {
            # Deploy frontend with backend URL
            Write-Host "Setting NEXT_PUBLIC_API_URL for frontend..." -ForegroundColor White
            railway service frontend
            railway variables --set "NEXT_PUBLIC_API_URL=$backendUrl"
            
            $frontendUrl = Deploy-Service "frontend" $deploymentConfig.frontend.path $deploymentConfig.frontend.port
        }
    }
}

Write-Host ""
Write-Host "🎉 Deployment Summary" -ForegroundColor Green
Write-Host "====================" -ForegroundColor Green

if ($backendUrl) {
    Write-Host "✅ Backend: $backendUrl" -ForegroundColor Green
    Write-Host "   Port: $($deploymentConfig.backend.port)" -ForegroundColor White
    Write-Host "   Health: $backendUrl/api/health" -ForegroundColor White
}

if ($frontendUrl) {
    Write-Host "✅ Frontend: $frontendUrl" -ForegroundColor Green
    Write-Host "   Port: $($deploymentConfig.frontend.port)" -ForegroundColor White
}

if ($backendUrl -and $frontendUrl) {
    Write-Host ""
    Write-Host "🔗 Service Communication:" -ForegroundColor Cyan
    Write-Host "   Frontend -> Backend: $backendUrl" -ForegroundColor White
    Write-Host "   Environment: NEXT_PUBLIC_API_URL=$backendUrl" -ForegroundColor White
}

Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Wait for deployments to complete" -ForegroundColor White
Write-Host "2. Test frontend at: $frontendUrl" -ForegroundColor White
Write-Host "3. Check backend health at: $backendUrl/api/health" -ForegroundColor White
Write-Host "4. Monitor logs: railway logs" -ForegroundColor White

Write-Host ""
Write-Host "📁 Project Structure:" -ForegroundColor Cyan
Write-Host "   /v1/serv/server.js     ← Backend Express server (port 3001)" -ForegroundColor White
Write-Host "   /v1/front/server.js    ← Frontend Next.js server (port 3000)" -ForegroundColor White
Write-Host "   /v1/old/               ← Previous deployment scripts" -ForegroundColor White

Write-Host ""
Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green 