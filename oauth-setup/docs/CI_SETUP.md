# CI Setup for OAuth Setup Module

This document describes the Continuous Integration (CI) setup for the oauth-setup module, including how to configure GitHub Secrets, run tests locally, and understand the CI workflow.

## Overview

The oauth-setup CI workflow runs automatically on:
- Pushes to the `main` branch that affect oauth-setup files
- Pull requests targeting the `main` branch that affect oauth-setup files

The workflow performs the following tasks:
1. Runs unit and integration tests with coverage reporting
2. Uploads Jest coverage artifacts
3. Performs smoke tests to validate the Express server startup
4. Provides a comprehensive results summary

## GitHub Secrets Configuration

To enable full CI functionality, configure the following GitHub Secrets in your repository settings:

### Required Secrets

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `TIKTOK_CLIENT_ID` | TikTok OAuth application client ID | `aw1234567890` |
| `TIKTOK_CLIENT_SECRET` | TikTok OAuth application client secret | `abc123xyz...` |
| `TIKTOK_REDIRECT_URI` | OAuth callback redirect URI | `https://your-app.com/auth/tiktok/callback` |
| `ALLOWED_REDIRECT_URIS` | Comma-separated list of allowed redirect URIs | `https://your-app.com/callback,http://localhost:3000/callback` |

### Optional Secrets

| Secret Name | Description | Default Value (if not set) |
|------------|-------------|----------------------------|
| `OAUTH_INTEGRATION_TOKEN` | Token to enable integration tests | (Integration tests skipped if not set) |
| `JWT_SECRET` | Secret key for JWT token signing | `test-jwt-secret-for-ci` |
| `SESSION_SECRET` | Secret key for session management | `test-session-secret-for-ci` |
| `NODE_AUTH_TOKEN` | NPM authentication token for private packages | (Not required for public packages) |

### How to Add GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter the secret name and value
5. Click **Add secret**

**Important:** Secrets are not exposed in workflow logs. The CI workflow uses these secrets securely without printing their values.

## Integration Tests

Integration tests require real OAuth credentials. The CI workflow conditionally runs integration tests only if the `OAUTH_INTEGRATION_TOKEN` secret is present:

```yaml
- name: Run integration tests
  if: secrets.OAUTH_INTEGRATION_TOKEN != ''
  working-directory: ./oauth-setup
  run: npm test -- tests/integration
```

If `OAUTH_INTEGRATION_TOKEN` is not configured, only unit tests will run.

## Running Tests Locally

### Prerequisites

- Node.js 18 or later
- npm (comes with Node.js)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Timmyae/codex-universal.git
   cd codex-universal/oauth-setup
   ```

2. Install dependencies:
   ```bash
   npm ci
   ```

3. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and configure your OAuth credentials:
   ```bash
   TIKTOK_CLIENT_ID=your-client-id
   TIKTOK_CLIENT_SECRET=your-client-secret
   TIKTOK_REDIRECT_URI=http://localhost:3000/auth/tiktok/callback
   ALLOWED_REDIRECT_URIS=http://localhost:3000/auth/tiktok/callback
   JWT_SECRET=your-local-jwt-secret
   SESSION_SECRET=your-local-session-secret
   ```

### Running Tests

#### Run All Tests with Coverage
```bash
npm test
```

#### Run Only Unit Tests
```bash
npm run test:unit
```

#### Run Tests in Watch Mode (for development)
```bash
npm run test:watch
```

#### Run Tests with Environment Variables (Alternative)
```bash
TIKTOK_CLIENT_ID=test-id \
TIKTOK_CLIENT_SECRET=test-secret \
TIKTOK_REDIRECT_URI=http://localhost:3000/auth/tiktok/callback \
npm test
```

### Using the CI Helper Script

The `scripts/ci-run.sh` helper script automates the process of setting up the environment and running tests:

```bash
cd oauth-setup
./scripts/ci-run.sh
```

The script will:
1. Install dependencies using `npm ci`
2. Set up environment variables with defaults or from your environment
3. Run the test suite
4. Exit with appropriate codes (0 for success, non-zero for failure)

You can override environment variables:
```bash
TIKTOK_CLIENT_ID=my-id TIKTOK_CLIENT_SECRET=my-secret ./scripts/ci-run.sh
```

## Smoke Tests

The CI workflow includes smoke tests that validate the Express server can start successfully:

1. Server starts on port 3001 (to avoid conflicts)
2. Health endpoint is polled for up to 30 seconds
3. If server responds, test passes
4. Server is gracefully shut down

To run smoke tests locally:
```bash
cd oauth-setup

# Start the server in background
PORT=3001 \
TIKTOK_CLIENT_ID=test-id \
TIKTOK_CLIENT_SECRET=test-secret \
TIKTOK_REDIRECT_URI=http://localhost:3001/auth/tiktok/callback \
npm start &

SERVER_PID=$!

# Wait and check health endpoint
sleep 5
curl http://localhost:3001/health

# Stop the server
kill $SERVER_PID
```

## CI Workflow Details

### Workflow File
`.github/workflows/oauth-setup-ci.yml`

### Node.js Version
Node.js **18** is used for consistency and LTS support.

### Operating System
Tests run on `ubuntu-latest` (currently Ubuntu 22.04).

### Jobs

1. **test** - Runs unit tests and optionally integration tests
   - Installs dependencies with `npm ci`
   - Runs `npm test` with coverage
   - Uploads coverage artifacts
   - Fails the job if tests fail

2. **smoke-test** - Validates server startup
   - Starts the Express server
   - Checks the health endpoint
   - Ensures the server can initialize correctly

3. **results** - Provides a summary
   - Runs after all jobs complete
   - Generates a summary in GitHub Actions UI

## Coverage Requirements

The Jest configuration (`jest.config.js`) enforces the following coverage thresholds:
- **Branches:** 80%
- **Functions:** 80%
- **Lines:** 80%
- **Statements:** 80%

If coverage falls below these thresholds, the tests will fail.

## Troubleshooting

### Tests Fail Locally but Pass in CI
- Check your `.env` file for misconfigurations
- Ensure you're using Node.js 18
- Clear `node_modules` and reinstall: `rm -rf node_modules package-lock.json && npm install`

### Integration Tests Skip in CI
- Verify `OAUTH_INTEGRATION_TOKEN` secret is set in GitHub repository settings
- Check the workflow logs for conditional step execution

### Server Smoke Test Fails
- Ensure port 3001 is not in use locally
- Check that all required environment variables are set
- Review server logs for startup errors

### Coverage Below Threshold
- Run `npm test` locally to see detailed coverage report
- Review uncovered lines in the coverage report at `coverage/lcov-report/index.html`
- Add tests for uncovered code paths

## CI Artifacts

The workflow uploads the following artifacts (retained for 30 days):

1. **jest-coverage** - Full Jest coverage report
   - HTML report: `coverage/lcov-report/index.html`
   - JSON summary: `coverage/coverage-summary.json`
   - LCOV data: `coverage/lcov.info`

2. **coverage-summary** - Coverage summary JSON for parsing

You can download these artifacts from the GitHub Actions workflow run page.

## Best Practices

1. **Never commit secrets** to the repository
2. **Always use GitHub Secrets** for sensitive credentials
3. **Run tests locally** before pushing changes
4. **Keep the .env file** out of version control (it's in .gitignore)
5. **Monitor CI failures** and fix them promptly
6. **Review coverage reports** to maintain high code quality

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Secrets Management](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [OAuth 2.0 Specification](https://oauth.net/2/)

## Support

For issues or questions about the CI setup:
1. Check the GitHub Actions workflow logs
2. Review this documentation
3. Open an issue in the repository with the `ci` label
