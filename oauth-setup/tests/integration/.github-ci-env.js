/**
 * GitHub CI Environment Configuration Shim
 * 
 * This file ensures that tests can run in CI environments even when
 * GitHub Secrets are not configured. It provides fallback dummy values
 * that allow tests with mocked external API calls to pass.
 * 
 * Usage: This is automatically loaded by tests when environment variables
 * are not present. The tests mock all external TikTok API calls, so 
 * dummy credentials are sufficient for validating code logic.
 */

// Only set dummy values if environment variables are not already set
if (!process.env.TIKTOK_CLIENT_ID || process.env.TIKTOK_CLIENT_ID === 'CHANGE_ME') {
  process.env.TIKTOK_CLIENT_ID = 'dummy_client_id_for_ci';
}

if (!process.env.TIKTOK_CLIENT_SECRET || process.env.TIKTOK_CLIENT_SECRET === 'CHANGE_ME') {
  process.env.TIKTOK_CLIENT_SECRET = 'dummy_client_secret_for_ci';
}

if (!process.env.TIKTOK_REDIRECT_URI || process.env.TIKTOK_REDIRECT_URI === 'CHANGE_ME') {
  process.env.TIKTOK_REDIRECT_URI = 'http://localhost:3000/auth/tiktok/callback';
}

if (!process.env.ALLOWED_REDIRECT_URIS) {
  process.env.ALLOWED_REDIRECT_URIS = 'http://localhost:3000/auth/tiktok/callback,http://localhost:8080/auth/tiktok/callback';
}

// Ensure other required environment variables have test values
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-for-ci';
}

if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'test-session-secret-for-ci';
}

if (!process.env.JWT_ACCESS_TOKEN_EXPIRY) {
  process.env.JWT_ACCESS_TOKEN_EXPIRY = '15m';
}

if (!process.env.JWT_REFRESH_TOKEN_EXPIRY) {
  process.env.JWT_REFRESH_TOKEN_EXPIRY = '7d';
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

module.exports = {
  // Export for visibility/documentation
  CI_DUMMY_VALUES: {
    TIKTOK_CLIENT_ID: process.env.TIKTOK_CLIENT_ID,
    TIKTOK_CLIENT_SECRET: '***hidden***',
    TIKTOK_REDIRECT_URI: process.env.TIKTOK_REDIRECT_URI,
    ALLOWED_REDIRECT_URIS: process.env.ALLOWED_REDIRECT_URIS
  }
};
