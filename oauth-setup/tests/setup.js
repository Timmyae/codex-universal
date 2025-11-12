/**
 * Test Environment Setup
 * 
 * إعداد بيئة الاختبار
 * Global test configuration and setup
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_only_min_256_bits';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_for_testing_only';
process.env.SESSION_SECRET = 'test_session_secret_for_testing_only';
process.env.GITHUB_CLIENT_ID = 'test_github_client_id';
process.env.GITHUB_CLIENT_SECRET = 'test_github_client_secret';
process.env.GITHUB_CALLBACK_URL = 'http://localhost:3000/auth/github/callback';
process.env.ALLOWED_REDIRECT_URIS = 'http://localhost:3000/auth/callback,http://localhost:3000/auth/success';
process.env.ENABLE_PKCE = 'true';
process.env.ENFORCE_HTTPS = 'false';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';

// Suppress console output during tests (optional)
global.console = {
  ...console,
  // Uncomment to suppress logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};

// Global test utilities
global.testUtils = {
  /**
   * Wait for specified time
   */
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate random string
   */
  randomString: (length = 32) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Generate mock user ID
   */
  mockUserId: () => `user_${Date.now()}_${Math.random().toString(36).substring(7)}`,
};

// Setup and teardown
beforeAll(() => {
  console.log('🧪 Starting test suite...');
});

afterAll(() => {
  console.log('✅ Test suite completed');
});
