# CI and GitHub Secrets Configuration

This document describes how to configure GitHub repository secrets for the OAuth Setup CI pipeline and how to run tests locally and in CI.

## Overview

The OAuth Setup CI workflow (`oauth-setup-ci.yml`) runs automated tests for the TikTok OAuth provider implementation. Tests can run with either real TikTok OAuth credentials (stored as GitHub Secrets) or with dummy values when secrets are not available.

## Required GitHub Secrets

To enable full CI testing with actual TikTok OAuth credentials, add the following secrets to your GitHub repository:

### Adding Secrets to GitHub Repository

1. Navigate to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each of the following secrets:

### TikTok OAuth Secrets

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `TIKTOK_CLIENT_ID` | Your TikTok App Client ID | `aw123456789abcdef` |
| `TIKTOK_CLIENT_SECRET` | Your TikTok App Client Secret | `secret_abc123xyz...` |
| `TIKTOK_REDIRECT_URI` | Primary redirect URI for OAuth callbacks | `https://yourdomain.com/auth/tiktok/callback` |
| `ALLOWED_REDIRECT_URIS` | Comma-separated list of allowed redirect URIs | `https://yourdomain.com/auth/tiktok/callback,http://localhost:3000/auth/tiktok/callback` |

### How to Get TikTok OAuth Credentials

1. Visit [TikTok for Developers](https://developers.tiktok.com/)
2. Create or select an existing app
3. Navigate to your app's settings
4. Copy the **Client Key** (use as `TIKTOK_CLIENT_ID`)
5. Copy the **Client Secret** (use as `TIKTOK_CLIENT_SECRET`)
6. Configure redirect URIs in your TikTok app settings to match your `TIKTOK_REDIRECT_URI` and `ALLOWED_REDIRECT_URIS`

## CI Behavior

### With Secrets Configured
When GitHub Secrets are properly configured, the CI pipeline will:
- Use real TikTok OAuth credentials for testing
- Validate configuration against actual TikTok API constraints
- Run full integration tests with realistic scenarios

### Without Secrets (Default)
When secrets are not configured, the CI pipeline will:
- Use dummy/placeholder values for credentials
- Run tests with mocked external API calls
- Validate code logic and structure without hitting real TikTok APIs
- Tests will still pass as they mock external dependencies

## Running Tests Locally

### Prerequisites
```bash
cd oauth-setup
npm ci
```

### Setup Environment Variables
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your TikTok OAuth credentials:
   ```bash
   TIKTOK_CLIENT_ID=your-actual-client-id
   TIKTOK_CLIENT_SECRET=your-actual-client-secret
   TIKTOK_REDIRECT_URI=http://localhost:3000/auth/tiktok/callback
   ALLOWED_REDIRECT_URIS=http://localhost:3000/auth/tiktok/callback,http://localhost:8080/auth/tiktok/callback
   ```

### Run Tests

#### Run all tests:
```bash
npm test
```

#### Run only unit tests:
```bash
npm run test:unit
```

#### Run tests in CI mode (same as CI pipeline):
```bash
npm run ci
```

#### Watch mode for development:
```bash
npm run test:watch
```

## CI Workflow Details

The workflow file is located at `.github/workflows/oauth-setup-ci.yml` and runs:
- On push to any branch affecting `oauth-setup/**` or `.github/workflows/**`
- On pull requests affecting the same paths
- Using Node.js 18.x
- With Jest coverage reporting
- Coverage artifacts are uploaded and retained for 30 days

### Environment Variables in CI

The CI workflow sets these environment variables for tests:

```yaml
TIKTOK_CLIENT_ID: ${{ secrets.TIKTOK_CLIENT_ID || 'dummy_client_id_for_ci' }}
TIKTOK_CLIENT_SECRET: ${{ secrets.TIKTOK_CLIENT_SECRET || 'dummy_client_secret_for_ci' }}
TIKTOK_REDIRECT_URI: ${{ secrets.TIKTOK_REDIRECT_URI || 'http://localhost:3000/auth/tiktok/callback' }}
ALLOWED_REDIRECT_URIS: ${{ secrets.ALLOWED_REDIRECT_URIS || 'http://localhost:3000/auth/tiktok/callback,http://localhost:8080/auth/tiktok/callback' }}
JWT_SECRET: test-jwt-secret-for-ci
SESSION_SECRET: test-session-secret-for-ci
NODE_ENV: test
```

The `||` operator provides fallback values when secrets are not configured, ensuring tests can still run with mocked values.

## Troubleshooting

### Tests fail with "Missing or placeholder configuration"
This is a warning, not an error. The tests mock external API calls and should pass even with dummy credentials.

### Coverage threshold not met
The CI pipeline requires 80% code coverage. If you modify code, ensure tests are added or updated to maintain coverage.

### Environment variables not loading
1. Check that `.env` file exists in `oauth-setup/` directory (not in project root)
2. Verify `dotenv` is loading correctly in configuration files
3. Ensure variable names match exactly (case-sensitive)

## Security Notes

- **Never commit** `.env` file with real credentials to version control
- `.env` is in `.gitignore` to prevent accidental commits
- Always use `.env.example` as a template and add real values to `.env` locally
- GitHub Secrets are encrypted and only exposed during workflow execution
- Rotate credentials immediately if they are accidentally exposed

## Additional Resources

- [TikTok Login Kit Documentation](https://developers.tiktok.com/doc/login-kit-web)
- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Jest Testing Documentation](https://jestjs.io/docs/getting-started)
