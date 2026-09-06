# oauth-setup CI / Local test guide

This document explains how CI runs for oauth-setup and how to run the same checks locally.

## What this CI does
- Runs unit tests (always) using `npm run test:unit` (Jest) with dummy credentials
- Conditionally runs integration tests when the repository has the `OAUTH_INTEGRATION_TOKEN` secret set. Integration tests are gated to avoid exposing credentials or requiring live external APIs.
- Uploads coverage artifacts for inspection.

## Running locally
1. Install dependencies

   cd oauth-setup
   npm ci

2. Run unit tests

   The CI helper script (`./scripts/ci-run.sh`) automatically sets up dummy credentials.
   You can also run tests directly:

   npm run test:unit

   Or with explicit dummy environment variables:

   TIKTOK_CLIENT_ID=dummy \
   TIKTOK_CLIENT_SECRET=dummy \
   TIKTOK_REDIRECT_URI=http://localhost:3000/callback \
   ALLOWED_REDIRECT_URIS=http://localhost:3000/callback \
   npm run test:unit

3. Run integration tests locally (if you have real credentials)

   export OAUTH_INTEGRATION_TOKEN=1
   export TIKTOK_CLIENT_ID="..."
   export TIKTOK_CLIENT_SECRET="..."
   export TIKTOK_REDIRECT_URI="https://your-callback"
   export ALLOWED_REDIRECT_URIS="https://your-callback"
   npm run test:integration

4. Use the CI helper (recommended)

   ./scripts/ci-run.sh

   This script automatically:
   - Installs dependencies
   - Sets up dummy environment variables for unit tests
   - Runs unit tests
   - Conditionally runs integration tests if OAUTH_INTEGRATION_TOKEN is set

## GitHub Actions notes
- Workflow: `.github/workflows/oauth-setup-ci.yml`
- Unit tests run with dummy environment variables (no secrets needed)
- Integration tests only run if a repository secret named `OAUTH_INTEGRATION_TOKEN` is set (value can be any non-empty string).
- Provider secrets (e.g. `TIKTOK_CLIENT_ID`) should be set as repository secrets when enabling integration tests.

## Environment variables

### For unit tests (dummy values are fine):
- TIKTOK_CLIENT_ID (default: `dummy_client_id_for_ci`)
- TIKTOK_CLIENT_SECRET (default: `dummy_client_secret_for_ci`)
- TIKTOK_REDIRECT_URI (default: `http://localhost:3000/auth/tiktok/callback`)
- ALLOWED_REDIRECT_URIS (default: `http://localhost:3000/auth/callback`)

### For integration tests (real values required):
- TIKTOK_CLIENT_ID
- TIKTOK_CLIENT_SECRET
- TIKTOK_REDIRECT_URI
- ALLOWED_REDIRECT_URIS
- OAUTH_INTEGRATION_TOKEN (any non-empty value to enable integration tests)

Security: Do NOT print secrets to logs. The workflow uses GitHub Actions secrets to pass credentials to the job and avoids echoing them.
