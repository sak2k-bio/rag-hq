# Environment Setup Script for Pulmo Superbot Deployment
# This script helps you set up the required environment variables

param(
    [switch]$Interactive,
    [string]$VercelToken,
    [string]$RailwayToken,
    [string]$VercelOrgId,
    [string]$VercelProjectId
)

Write-Host "🔧 Pulmo Superbot Environment Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Function to get secure input
function Get-SecureInput {
    param([string]$Prompt)
    
    $secure = Read-Host $Prompt -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    return [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

# Function to validate token format
function Test-TokenFormat {
    param([string]$Token, [string]$Type)
    
    if ($Token.Length -lt 10) {
        Write-Warning "$Type token seems too short. Please verify."
        return $false
    }
    return $true
}

# Set environment variables
$EnvVars = @{}

if ($Interactive) {
    Write-Host "`n📝 Interactive Mode - Please provide your tokens:" -ForegroundColor Yellow
    
    # Vercel Token
    do {
        $VercelToken = Get-SecureInput "Enter your Vercel token"
        if (-not (Test-TokenFormat $VercelToken "Vercel")) {
            $VercelToken = ""
        }
    } while (-not $VercelToken)
    
    # Railway Token
    do {
        $RailwayToken = Get-SecureInput "Enter your Railway token"
        if (-not (Test-TokenFormat $RailwayToken "Railway")) {
            $RailwayToken = ""
        }
    } while (-not $RailwayToken)
    
    # Optional Vercel details
    $VercelOrgId = Read-Host "Enter your Vercel Organization ID (optional)"
    $VercelProjectId = Read-Host "Enter your Vercel Project ID (optional)"
}

# Validate required tokens
if (-not $VercelToken) {
    Write-Error "VERCEL_TOKEN is required!"
    exit 1
}

if (-not $RailwayToken) {
    Write-Error "RAILWAY_TOKEN is required!"
    exit 1
}

# Set environment variables
$env:VERCEL_TOKEN = $VercelToken
$env:RAILWAY_TOKEN = $RailwayToken

if ($VercelOrgId) {
    $env:VERCEL_ORG_ID = $VercelOrgId
}

if ($VercelProjectId) {
    $env:VERCEL_PROJECT_ID = $VercelProjectId
}

# Create .env file for future use
$EnvFileContent = @"
# Pulmo Superbot Deployment Environment Variables
# Generated on $(Get-Date)

# Vercel Configuration
VERCEL_TOKEN=$VercelToken
"@

if ($VercelOrgId) {
    $EnvFileContent += "`nVERCEL_ORG_ID=$VercelOrgId"
}

if ($VercelProjectId) {
    $EnvFileContent += "`nVERCEL_PROJECT_ID=$VercelProjectId"
}

$EnvFileContent += @"

# Railway Configuration
RAILWAY_TOKEN=$RailwayToken

# Optional: Custom directories
# FRONTEND_DIR=frontend
# BACKEND_DIR=backend
# ENVIRONMENT=production
# RAILWAY_SERVICE=backend
"@

# Save to .env file
$EnvFileContent | Out-File -FilePath ".env" -Encoding UTF8

Write-Host "`n✅ Environment variables set successfully!" -ForegroundColor Green
Write-Host "📁 .env file created for future use" -ForegroundColor Green

# Display current environment
Write-Host "`n🔍 Current Environment Variables:" -ForegroundColor Cyan
Write-Host "VERCEL_TOKEN: $($env:VERCEL_TOKEN.Substring(0, [Math]::Min(8, $env:VERCEL_TOKEN.Length)))..." -ForegroundColor Green
Write-Host "RAILWAY_TOKEN: $($env:RAILWAY_TOKEN.Substring(0, [Math]::Min(8, $env:RAILWAY_TOKEN.Length)))..." -ForegroundColor Green

if ($env:VERCEL_ORG_ID) {
    Write-Host "VERCEL_ORG_ID: $($env:VERCEL_ORG_ID)" -ForegroundColor Green
}

if ($env:VERCEL_PROJECT_ID) {
    Write-Host "VERCEL_PROJECT_ID: $($env:VERCEL_PROJECT_ID)" -ForegroundColor Green
}

Write-Host "`n🚀 You can now run the deployment scripts:" -ForegroundColor Yellow
Write-Host "  .\scripts\deploy-all.ps1                    # Deploy both services" -ForegroundColor White
Write-Host "  .\scripts\deploy-frontend-vercel.ps1        # Deploy frontend only" -ForegroundColor White
Write-Host "  .\scripts\deploy-backend-railway.ps1        # Deploy backend only" -ForegroundColor White

Write-Host "`n💡 Tip: To load these variables in a new session, run:" -ForegroundColor Cyan
Write-Host "  Get-Content .env | ForEach-Object { if($_ -match '^([^#][^=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process') } }" -ForegroundColor Gray
