#!/usr/bin/env bash
set -euo pipefail

# Helper script to run oauth-setup tests locally or in a CI environment.
# - Installs dependencies in oauth-setup
# - Runs unit tests unconditionally
# - Runs integration tests only if OAUTH_INTEGRATION_TOKEN is set
# - Exits with the tests' exit code

cd "$(dirname "$0")/.."

echo "==> Running oauth-setup CI helper (working dir: $(pwd))"

# Install deps
if [ -f package-lock.json ]; then
  npm ci
elif [ -f package.json ]; then
  npm install
else
  echo "Error: No package.json found in $(pwd)"
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

# Run unit tests
npm run test:unit
UNIT_CODE=$?

if [ -n "${OAUTH_INTEGRATION_TOKEN-}" ]; then
  echo "OAUTH_INTEGRATION_TOKEN is present — running integration tests"
  npm run test:integration
  INTEG_CODE=$?
else
  echo "OAUTH_INTEGRATION_TOKEN not present — skipping integration tests"
  INTEG_CODE=0
fi

# Exit non-zero if either suite failed
if [ $UNIT_CODE -ne 0 ] || [ $INTEG_CODE -ne 0 ]; then
  echo "Some tests failed: unit=$UNIT_CODE integration=$INTEG_CODE"
  exit 1
fi

echo "All tests passed"
exit 0
