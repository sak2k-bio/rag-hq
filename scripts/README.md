# 🚀 Pulmo Superbot Deployment Scripts

Quick and efficient deployment scripts for deploying the frontend to Vercel and backend to Railway.

## 📁 Scripts Overview

- **`deploy-frontend-vercel.sh`** - Bash script for frontend deployment (Linux/macOS)
- **`deploy-frontend-vercel.ps1`** - PowerShell script for frontend deployment (Windows)
- **`deploy-backend-railway.sh`** - Bash script for backend deployment (Linux/macOS)
- **`deploy-backend-railway.ps1`** - PowerShell script for backend deployment (Windows)
- **`deploy-all.ps1`** - Combined PowerShell script for both deployments (Windows)

## 🛠️ Prerequisites

### For Frontend (Vercel)
1. **Vercel Account**: Create an account at [vercel.com](https://vercel.com)
2. **Vercel Token**: Generate a token in Account Settings → Tokens
3. **Project Setup**: Create a new project in Vercel or link existing repository
4. **Environment Variables**:
   - `VERCEL_TOKEN` (required)
   - `VERCEL_ORG_ID` (recommended)
   - `VERCEL_PROJECT_ID` (recommended)

### For Backend (Railway)
1. **Railway Account**: Create an account at [railway.app](https://railway.app)
2. **Railway Token**: Generate a token in Account Settings → Tokens
3. **Environment Variables**:
   - `RAILWAY_TOKEN` (required)

## 🔧 Setup Instructions

### 1. Set Environment Variables

#### Windows PowerShell
```powershell
# Set Vercel token
$env:VERCEL_TOKEN = "your_vercel_token_here"

# Set Railway token
$env:RAILWAY_TOKEN = "your_railway_token_here"

# Optional: Set Vercel project details
$env:VERCEL_ORG_ID = "your_org_id"
$env:VERCEL_PROJECT_ID = "your_project_id"
```

#### Windows Command Prompt
```cmd
set VERCEL_TOKEN=your_vercel_token_here
set RAILWAY_TOKEN=your_railway_token_here
set VERCEL_ORG_ID=your_org_id
set VERCEL_PROJECT_ID=your_project_id
```

#### Linux/macOS
```bash
export VERCEL_TOKEN="your_vercel_token_here"
export RAILWAY_TOKEN="your_railway_token_here"
export VERCEL_ORG_ID="your_org_id"
export VERCEL_PROJECT_ID="your_project_id"
```

### 2. Install Required CLIs

The scripts use `npx` to run the required CLIs, so no global installation is needed:
- Vercel CLI (via `npx vercel`)
- Railway CLI (via `npx railway`)

## 🚀 Usage

### Deploy Both Services (Recommended)

#### Windows PowerShell
```powershell
# Deploy both frontend and backend
.\scripts\deploy-all.ps1

# Deploy only frontend
.\scripts\deploy-all.ps1 -FrontendOnly

# Deploy only backend
.\scripts\deploy-all.ps1 -BackendOnly
```

#### Linux/macOS
```bash
# Deploy both frontend and backend
./scripts/deploy-frontend-vercel.sh
./scripts/deploy-backend-railway.sh

# Or use the individual scripts
./scripts/deploy-frontend-vercel.sh
./scripts/deploy-backend-railway.sh
```

### Individual Deployments

#### Frontend Only
```powershell
# Windows
.\scripts\deploy-frontend-vercel.ps1

# Linux/macOS
./scripts/deploy-frontend-vercel.sh
```

#### Backend Only
```powershell
# Windows
.\scripts\deploy-backend-railway.ps1

# Linux/macOS
./scripts/deploy-backend-railway.sh
```

## ⚙️ Customization

### Script Parameters

#### `deploy-all.ps1`
- `-FrontendOnly`: Deploy only frontend
- `-BackendOnly`: Deploy only backend
- `-FrontendDir`: Custom frontend directory (default: "frontend")
- `-BackendDir`: Custom backend directory (default: "backend")
- `-Environment`: Vercel environment (default: "production")
- `-RailwayService`: Railway service name (default: "backend")

#### Example with custom paths:
```powershell
.\scripts\deploy-all.ps1 -FrontendDir "my-frontend" -BackendDir "my-backend"
```

### Environment Variables

You can also set these environment variables for customization:
- `FRONTEND_DIR`: Custom frontend directory
- `BACKEND_DIR`: Custom backend directory
- `ENVIRONMENT`: Vercel environment
- `RAILWAY_SERVICE`: Railway service name

## 📋 What Each Script Does

### Frontend Deployment (Vercel)
1. ✅ Validates Vercel token
2. ✅ Checks frontend directory exists
3. ✅ Pulls Vercel project configuration
4. ✅ Installs dependencies (pnpm/yarn/npm)
5. ✅ Builds the project
6. ✅ Deploys to Vercel
7. ✅ Returns deployment URL

### Backend Deployment (Railway)
1. ✅ Validates Railway token
2. ✅ Checks backend directory exists
3. ✅ Installs dependencies (pnpm/yarn/npm)
4. ✅ Links/creates Railway project
5. ✅ Triggers deployment
6. ✅ Provides deployment status

## 🔍 Troubleshooting

### Common Issues

1. **"VERCEL_TOKEN is required"**
   - Set the `VERCEL_TOKEN` environment variable
   - Generate token from Vercel Account Settings

2. **"RAILWAY_TOKEN is required"**
   - Set the `RAILWAY_TOKEN` environment variable
   - Generate token from Railway Account Settings

3. **"Frontend/Backend directory not found"**
   - Check if you're running from the project root
   - Verify directory names match your project structure

4. **Permission denied (Linux/macOS)**
   - Make scripts executable: `chmod +x scripts/*.sh`

5. **PowerShell execution policy error**
   - Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### Debug Mode

For troubleshooting, you can run the scripts with verbose output:
```powershell
# PowerShell
$VerbosePreference = "Continue"
.\scripts\deploy-all.ps1
```

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [PowerShell Documentation](https://docs.microsoft.com/en-us/powershell/)
- [Bash Documentation](https://www.gnu.org/software/bash/manual/)

## 🤝 Contributing

Feel free to modify these scripts to fit your specific deployment needs. The scripts are designed to be:
- **Idempotent**: Safe to run multiple times
- **Error-handled**: Graceful failure with clear error messages
- **Cross-platform**: Works on Windows, Linux, and macOS
- **Customizable**: Easy to modify for different project structures
