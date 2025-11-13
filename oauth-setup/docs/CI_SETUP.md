# oauth-setup CI / Local test guide

This document explains how CI runs for oauth-setup and how to run the same checks locally.

## What this CI does
- Runs unit tests (always) using `npm run test:unit` (Jest)
- Conditionally runs integration tests when the repository has the `OAUTH_INTEGRATION_TOKEN` secret set. Integration tests are gated to avoid exposing credentials or requiring live external APIs.
- Uploads coverage artifacts for inspection.

## Running locally
1. Install dependencies

   cd oauth-setup
   npm ci

2. Run unit tests

   npm run test:unit

3. Run integration tests locally (if you have real credentials)

   export OAUTH_INTEGRATION_TOKEN=1
   export TIKTOK_CLIENT_ID="..."
   export TIKTOK_CLIENT_SECRET="..."
   export TIKTOK_REDIRECT_URI="https://your-callback"
   export ALLOWED_REDIRECT_URIS="https://your-callback"
   npm run test:integration

4. Use the CI helper

   ./scripts/ci-run.sh

## GitHub Actions notes
- Workflow: `.github/workflows/oauth-setup-ci.yml`
- Integration tests only run if a repository secret named `OAUTH_INTEGRATION_TOKEN` is set (value can be any non-empty string).
- Provider secrets (e.g. `TIKTOK_CLIENT_ID`) should be set as repository secrets when enabling integration tests.

## Secrets required for integration tests (when enabling):
- TIKTOK_CLIENT_ID
- TIKTOK_CLIENT_SECRET
- TIKTOK_REDIRECT_URI
- ALLOWED_REDIRECT_URIS
- OAUTH_INTEGRATION_TOKEN (any non-empty value to enable integration tests)

Security: Do NOT print secrets to logs. The workflow uses GitHub Actions secrets to pass credentials to the job and avoids echoing them.
