#!/usr/bin/env bash
set -euo pipefail

# Helper script to run oauth-setup tests locally or in CI.
# - Installs dependencies
# - Runs unit tests always
# - Runs integration tests only when OAUTH_INTEGRATION_TOKEN is set
# - Exits non-zero if any suite fails

cd "$(dirname "$0")/.."

echo "==> Running oauth-setup CI helper (working dir: $(pwd))"

# Install deps
if [ -f package-lock.json ]; then
  echo "Found package-lock.json - running npm ci"
  npm ci
elif [ -f package.json ]; then
  echo "No package-lock.json, but package.json found - running npm install"
  npm install
else
  echo "No package.json found - cannot install dependencies"
  exit 1
fi

# Provide placeholder environment variables for providers so unit tests that mock external calls can run
: "${TIKTOK_CLIENT_ID:=dummy_client_id_for_ci}"
: "${TIKTOK_CLIENT_SECRET:=dummy_client_secret_for_ci}"
: "${TIKTOK_REDIRECT_URI:=http://localhost:3000/auth/tiktok/callback}"
: "${ALLOWED_REDIRECT_URIS:=http://localhost:3000/auth/callback}"

export TIKTOK_CLIENT_ID
export TIKTOK_CLIENT_SECRET
export TIKTOK_REDIRECT_URI
export ALLOWED_REDIRECT_URIS

UNIT_CODE=0
INTEG_CODE=0

echo "==> Running unit tests"
if ! npm run test:unit; then
  UNIT_CODE=$?
fi

if [ -n "${OAUTH_INTEGRATION_TOKEN:-}" ]; then
  echo "OAUTH_INTEGRATION_TOKEN is present — running integration tests"
  if ! npm run test:integration; then
    INTEG_CODE=$?
  fi
else
  echo "OAUTH_INTEGRATION_TOKEN not present — skipping integration tests"
fi

if [ "$UNIT_CODE" -ne 0 ] || [ "$INTEG_CODE" -ne 0 ]; then
  echo "Some tests failed: unit=$UNIT_CODE integration=$INTEG_CODE"
  exit 1
fi

echo "All tests passed"
exit 0
