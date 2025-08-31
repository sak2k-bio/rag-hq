#!/usr/bin/env bash
set -euo pipefail

# Seamless backend deploy to Railway (non-interactive)
# Requirements:
# - Environment var: RAILWAY_TOKEN (required)
# - Railway CLI available via npx

BACKEND_DIR=${BACKEND_DIR:-"backend"}

if [[ -z "${RAILWAY_TOKEN:-}" ]]; then
  echo "ERROR: RAILWAY_TOKEN is required (create a Railway token in Account Settings)" >&2
  exit 1
fi

if [[ ! -d "$BACKEND_DIR" ]]; then
  echo "ERROR: Backend directory '$BACKEND_DIR' not found" >&2
  exit 1
fi

pushd "$BACKEND_DIR" >/dev/null

echo "==> Installing dependencies"
if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile
elif command -v yarn >/dev/null 2>&1; then
  yarn install --frozen-lockfile
else
  npm ci --silent || npm install --no-audit --no-fund
fi

echo "==> Linking/creating Railway project"
export RAILWAY_TOKEN
npx --yes railway up --service "${RAILWAY_SERVICE:-backend}" --detach --yes

echo "==> Deploying"
npx --yes railway deploy --service "${RAILWAY_SERVICE:-backend}" --yes

echo "==> Deployment triggered. Check Railway dashboard for status."
popd >/dev/null
