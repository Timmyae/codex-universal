module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/server.js', // Exclude server entry point
    '!server/**/*.test.js',
    '!server/**/*.spec.js',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Critical security functions must have 100% coverage
    './server/utils/pkce.utils.js': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './server/utils/token.utils.js': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
  ],
  verbose: true,
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  // Coverage reporters
  coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json'],
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
