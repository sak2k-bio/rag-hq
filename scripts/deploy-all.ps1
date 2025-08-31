# Combined deployment script for both frontend (Vercel) and backend (Railway)
# Requirements:
# - Environment vars: VERCEL_TOKEN (required), RAILWAY_TOKEN (required)
# - VERCEL_ORG_ID, VERCEL_PROJECT_ID (recommended for frontend)
# - Railway CLI and Vercel CLI available via npx

param(
    [switch]$FrontendOnly,
    [switch]$BackendOnly,
    [string]$FrontendDir = "frontend",
    [string]$BackendDir = "backend",
    [string]$Environment = "production",
    [string]$RailwayService = "backend"
)

# Function to deploy frontend
function Deploy-Frontend {
    Write-Host "🚀 Starting Frontend Deployment to Vercel..." -ForegroundColor Green
    
    if (-not $env:VERCEL_TOKEN) {
        Write-Error "ERROR: VERCEL_TOKEN is required for frontend deployment"
        return $false
    }
    
    if (-not (Test-Path $FrontendDir)) {
        Write-Error "ERROR: Frontend directory '$FrontendDir' not found"
        return $false
    }
    
    $CurrentDir = Get-Location
    
    try {
        Set-Location $FrontendDir
        
        Write-Host "==> Preparing Vercel project configuration"
        npx --yes vercel pull --yes --environment="$Environment" --token $env:VERCEL_TOKEN
        
        Write-Host "==> Installing dependencies"
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            pnpm install --frozen-lockfile
        } elseif (Get-Command yarn -ErrorAction SilentlyContinue) {
            yarn install --frozen-lockfile
        } else {
            npm ci --silent
            if ($LASTEXITCODE -ne 0) {
                npm install --no-audit --no-fund
            }
        }
        
        Write-Host "==> Building (Vercel prebuild)"
        npx --yes vercel build --prod --token $env:VERCEL_TOKEN
        
        Write-Host "==> Deploying (using prebuilt output)"
        $DeployOutput = npx --yes vercel deploy --prebuilt --prod --token $env:VERCEL_TOKEN
        $DeployUrl = $DeployOutput | Select-Object -Last 1
        
        Write-Host "✅ Frontend Deployed: $DeployUrl" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Error "❌ Frontend deployment failed: $_"
        return $false
    }
    finally {
        Set-Location $CurrentDir
    }
}

# Function to deploy backend
function Deploy-Backend {
    Write-Host "🚀 Starting Backend Deployment to Railway..." -ForegroundColor Blue
    
    if (-not $env:RAILWAY_TOKEN) {
        Write-Error "ERROR: RAILWAY_TOKEN is required for backend deployment"
        return $false
    }
    
    if (-not (Test-Path $BackendDir)) {
        Write-Error "ERROR: Backend directory '$BackendDir' not found"
        return $false
    }
    
    $CurrentDir = Get-Location
    
    try {
        Set-Location $BackendDir
        
        Write-Host "==> Installing dependencies"
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            pnpm install --frozen-lockfile
        } elseif (Get-Command yarn -ErrorAction SilentlyContinue) {
            yarn install --frozen-lockfile
        } else {
            npm ci --silent
            if ($LASTEXITCODE -ne 0) {
                npm install --no-audit --no-fund
            }
        }
        
        Write-Host "==> Linking/creating Railway project"
        $env:RAILWAY_TOKEN = $env:RAILWAY_TOKEN
        npx --yes railway up --service $RailwayService --detach --yes
        
        Write-Host "==> Deploying"
        npx --yes railway deploy --service $RailwayService --yes
        
        Write-Host "✅ Backend deployment triggered. Check Railway dashboard for status." -ForegroundColor Blue
        return $true
    }
    catch {
        Write-Error "❌ Backend deployment failed: $_"
        return $false
    }
    finally {
        Set-Location $CurrentDir
    }
}

# Main deployment logic
Write-Host "🚀 Pulmo Superbot Deployment Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$FrontendSuccess = $false
$BackendSuccess = $false

if ($FrontendOnly) {
    $FrontendSuccess = Deploy-Frontend
} elseif ($BackendOnly) {
    $BackendSuccess = Deploy-Backend
} else {
    # Deploy both
    Write-Host "Deploying both frontend and backend..." -ForegroundColor Yellow
    
    $FrontendSuccess = Deploy-Frontend
    if ($FrontendSuccess) {
        Write-Host "Waiting 5 seconds before backend deployment..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
    
    $BackendSuccess = Deploy-Backend
}

# Summary
Write-Host "`n📊 Deployment Summary:" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan

if ($FrontendOnly -or (-not $BackendOnly)) {
    Write-Host "Frontend (Vercel): $(if ($FrontendSuccess) { '✅ Success' } else { '❌ Failed' })" -ForegroundColor $(if ($FrontendSuccess) { 'Green' } else { 'Red' })
}

if ($BackendOnly -or (-not $FrontendOnly)) {
    Write-Host "Backend (Railway): $(if ($BackendSuccess) { '✅ Success' } else { '❌ Failed' })" -ForegroundColor $(if ($BackendSuccess) { 'Green' } else { 'Red' })
}

if ($FrontendSuccess -and $BackendSuccess) {
    Write-Host "`n🎉 All deployments completed successfully!" -ForegroundColor Green
} elseif ($FrontendSuccess -or $BackendSuccess) {
    Write-Host "`n⚠️  Some deployments failed. Check the logs above." -ForegroundColor Yellow
} else {
    Write-Host "`n❌ All deployments failed. Check the logs above." -ForegroundColor Red
    exit 1
}
