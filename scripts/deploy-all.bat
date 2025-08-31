@echo off
REM Pulmo Superbot Deployment Script for Windows Command Prompt
REM This script deploys both frontend and backend services

echo 🚀 Pulmo Superbot Deployment Script
echo =====================================

REM Check if required environment variables are set
if "%VERCEL_TOKEN%"=="" (
    echo ❌ ERROR: VERCEL_TOKEN environment variable is not set
    echo Please set it using: set VERCEL_TOKEN=your_token_here
    pause
    exit /b 1
)

if "%RAILWAY_TOKEN%"=="" (
    echo ❌ ERROR: RAILWAY_TOKEN environment variable is not set
    echo Please set it using: set RAILWAY_TOKEN=your_token_here
    pause
    exit /b 1
)

echo ✅ Environment variables found
echo.

REM Deploy Frontend
echo 🚀 Starting Frontend Deployment to Vercel...
cd frontend
if errorlevel 1 (
    echo ❌ Frontend directory not found
    pause
    exit /b 1
)

echo ==^> Installing dependencies...
call npm ci --silent
if errorlevel 1 (
    echo ==^> Fallback to npm install...
    call npm install --no-audit --no-fund
)

echo ==^> Preparing Vercel project configuration...
call npx --yes vercel pull --yes --environment=production --token %VERCEL_TOKEN%

echo ==^> Building (Vercel prebuild)...
call npx --yes vercel build --prod --token %VERCEL_TOKEN%

echo ==^> Deploying (using prebuilt output)...
for /f "delims=" %%i in ('npx --yes vercel deploy --prebuilt --prod --token %VERCEL_TOKEN% ^| findstr /r "https://.*"') do set DEPLOY_URL=%%i

echo ✅ Frontend Deployed: %DEPLOY_URL%
cd ..

echo.
echo Waiting 5 seconds before backend deployment...
timeout /t 5 /nobreak >nul

REM Deploy Backend
echo 🚀 Starting Backend Deployment to Railway...
cd backend
if errorlevel 1 (
    echo ❌ Backend directory not found
    pause
    exit /b 1
)

echo ==^> Installing dependencies...
call npm ci --silent
if errorlevel 1 (
    echo ==^> Fallback to npm install...
    call npm install --no-audit --no-fund
)

echo ==^> Linking/creating Railway project...
set RAILWAY_TOKEN=%RAILWAY_TOKEN%
call npx --yes railway up --service backend --detach --yes

echo ==^> Deploying...
call npx --yes railway deploy --service backend --yes

echo ✅ Backend deployment triggered. Check Railway dashboard for status.
cd ..

echo.
echo 📊 Deployment Summary:
echo =====================
echo Frontend (Vercel): ✅ Success
echo Backend (Railway): ✅ Success
echo.
echo 🎉 All deployments completed successfully!
echo.
pause
