# Seamless backend deploy to Railway (non-interactive) - PowerShell version
# Requirements:
# - Environment var: RAILWAY_TOKEN (required)
# - Railway CLI available via npx

param(
    [string]$BackendDir = "backend",
    [string]$RailwayService = "backend"
)

# Check for required environment variable
if (-not $env:RAILWAY_TOKEN) {
    Write-Error "ERROR: RAILWAY_TOKEN is required (create a Railway token in Account Settings)"
    exit 1
}

# Check if backend directory exists
if (-not (Test-Path $BackendDir)) {
    Write-Error "ERROR: Backend directory '$BackendDir' not found"
    exit 1
}

# Store current directory
$CurrentDir = Get-Location

try {
    # Change to backend directory
    Set-Location $BackendDir
    
    Write-Host "==> Installing dependencies"
    # Check for package manager and install dependencies
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
    
    Write-Host "==> Deployment triggered. Check Railway dashboard for status."
}
finally {
    # Return to original directory
    Set-Location $CurrentDir
}
