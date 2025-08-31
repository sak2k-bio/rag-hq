# Seamless frontend deploy to Vercel (non-interactive) - PowerShell version
# Requirements:
# - Environment vars: VERCEL_TOKEN (required), VERCEL_ORG_ID (recommended), VERCEL_PROJECT_ID (recommended)
# - Repo has been created in Vercel or you provide ORG/PROJECT IDs for linking
# - Vercel CLI available via npx

param(
    [string]$FrontendDir = "frontend",
    [string]$Environment = "production"
)

# Check for required environment variable
if (-not $env:VERCEL_TOKEN) {
    Write-Error "ERROR: VERCEL_TOKEN is required (create a Vercel token in Account Settings)"
    exit 1
}

# Check if frontend directory exists
if (-not (Test-Path $FrontendDir)) {
    Write-Error "ERROR: Frontend directory '$FrontendDir' not found"
    exit 1
}

# Store current directory
$CurrentDir = Get-Location

try {
    # Change to frontend directory
    Set-Location $FrontendDir
    
    Write-Host "==> Preparing Vercel project configuration"
    # Pull will create/update .vercel/project.json using VERCEL_ORG_ID/VERCEL_PROJECT_ID when provided
    npx --yes vercel pull --yes --environment="$Environment" --token $env:VERCEL_TOKEN
    
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
    
    Write-Host "==> Building (Vercel prebuild)"
    npx --yes vercel build --prod --token $env:VERCEL_TOKEN
    
    Write-Host "==> Deploying (using prebuilt output)"
    $DeployOutput = npx --yes vercel deploy --prebuilt --prod --token $env:VERCEL_TOKEN
    $DeployUrl = $DeployOutput | Select-Object -Last 1
    
    Write-Host "==> Deployed: $DeployUrl"
}
finally {
    # Return to original directory
    Set-Location $CurrentDir
}
