#!/usr/bin/env bash
set -euo pipefail

# Seamless frontend deploy to Vercel (non-interactive)
# Requirements:
# - Environment vars: VERCEL_TOKEN (required), VERCEL_ORG_ID (recommended), VERCEL_PROJECT_ID (recommended)
# - Repo has been created in Vercel or you provide ORG/PROJECT IDs for linking
# - Vercel CLI available via npx

FRONTEND_DIR=${FRONTEND_DIR:-"frontend"}
ENVIRONMENT=${ENVIRONMENT:-"production"}

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "ERROR: VERCEL_TOKEN is required (create a Vercel token in Account Settings)" >&2
  exit 1
fi

if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "ERROR: Frontend directory '$FRONTEND_DIR' not found" >&2
  exit 1
fi

pushd "$FRONTEND_DIR" >/dev/null

echo "==> Preparing Vercel project configuration"
# Pull will create/update .vercel/project.json using VERCEL_ORG_ID/VERCEL_PROJECT_ID when provided
npx --yes vercel pull --yes --environment="$ENVIRONMENT" --token "$VERCEL_TOKEN"

echo "==> Installing dependencies"
if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile
elif command -v yarn >/dev/null 2>&1; then
  yarn install --frozen-lockfile
else
  npm ci --silent || npm install --no-audit --no-fund
fi

echo "==> Building (Vercel prebuild)"
npx --yes vercel build --prod --token "$VERCEL_TOKEN"

echo "==> Deploying (using prebuilt output)"
DEPLOY_URL=$(npx --yes vercel deploy --prebuilt --prod --token "$VERCEL_TOKEN" | tail -n1)

echo "==> Deployed: $DEPLOY_URL"
popd >/dev/null
