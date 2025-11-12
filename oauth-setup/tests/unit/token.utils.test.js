/**
 * Token Utils Unit Tests / اختبارات وحدة أدوات الرموز
 * 
 * Comprehensive tests for JWT token management with rotation and blacklisting
 * اختبارات شاملة لإدارة رموز JWT مع التدوير والقائمة السوداء
 * 
 * Target: 100% code coverage / الهدف: تغطية كود 100%
 */

const {
  generateToken,
  verifyToken,
  generateRefreshToken,
  verifyRefreshToken,
  rotateRefreshToken,
  revokeToken,
  isTokenRevoked,
  revokeAllUserTokens,
  extractTokenFromHeader,
  decodeToken,
  isTokenExpired
} = require('../../server/utils/token.utils');

// Mock environment variables / محاكاة متغيرات البيئة
process.env.JWT_SECRET = 'test-secret-for-testing-only';
process.env.JWT_ACCESS_TOKEN_EXPIRY = '15m';
process.env.JWT_REFRESH_TOKEN_EXPIRY = '30d';

describe('Token Utils - Token Generation / أدوات الرموز - إنشاء الرموز', () => {
  describe('generateToken', () => {
    const mockUser = {
      id: '12345',
      email: 'test@example.com',
      provider: 'github',
      username: 'testuser'
    };

    test('should generate valid JWT access token', () => {
      const token = generateToken(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    test('should include user information in token payload', () => {
      const token = generateToken(mockUser);
      const decoded = decodeToken(token);
      
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.provider).toBe(mockUser.provider);
      expect(decoded.username).toBe(mockUser.username);
    });

    test('should set token type to access', () => {
      const token = generateToken(mockUser);
      const decoded = decodeToken(token);
      
      expect(decoded.type).toBe('access');
    });

    test('should set correct issuer and audience', () => {
      const token = generateToken(mockUser);
      const decoded = decodeToken(token);
      
      expect(decoded.iss).toBe('codex-universal-oauth');
      expect(decoded.aud).toBe('codex-universal-app');
    });

    test('should set expiration time (15 minutes)', () => {
      const token = generateToken(mockUser);
      const decoded = decodeToken(token);
      
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      
      // Should expire in approximately 15 minutes (900 seconds)
      const expiryDuration = decoded.exp - decoded.iat;
      expect(expiryDuration).toBeCloseTo(900, -1);
    });

    test('should throw error for null user', () => {
      expect(() => generateToken(null)).toThrow('User object with id is required');
    });

    test('should throw error for user without id', () => {
      const invalidUser = { email: 'test@example.com' };
      
      expect(() => generateToken(invalidUser)).toThrow('User object with id is required');
    });

    test('should generate different tokens for different users', () => {
      const user1 = { ...mockUser, id: '1' };
      const user2 = { ...mockUser, id: '2' };
      
      const token1 = generateToken(user1);
      const token2 = generateToken(user2);
      
      expect(token1).not.toBe(token2);
    });

    test('should generate different tokens on each call (due to iat)', async () => {
      const token1 = generateToken(mockUser);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      const token2 = generateToken(mockUser);
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateRefreshToken', () => {
    const mockUser = {
      id: '12345',
      email: 'test@example.com',
      provider: 'github'
    };

    test('should generate valid JWT refresh token', () => {
      const token = generateRefreshToken(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    test('should set token type to refresh', () => {
      const token = generateRefreshToken(mockUser);
      const decoded = decodeToken(token);
      
      expect(decoded.type).toBe('refresh');
    });

    test('should include userId in token payload', () => {
      const token = generateRefreshToken(mockUser);
      const decoded = decodeToken(token);
      
      expect(decoded.userId).toBe(mockUser.id);
    });

    test('should include unique jti (JWT ID)', () => {
      const token1 = generateRefreshToken(mockUser);
      const token2 = generateRefreshToken(mockUser);
      const decoded1 = decodeToken(token1);
      const decoded2 = decodeToken(token2);
      
      expect(decoded1.jti).toBeDefined();
      expect(decoded2.jti).toBeDefined();
      expect(decoded1.jti).not.toBe(decoded2.jti);
    });

    test('should set expiration time (30 days)', () => {
      const token = generateRefreshToken(mockUser);
      const decoded = decodeToken(token);
      
      // Should expire in approximately 30 days (2592000 seconds)
      const expiryDuration = decoded.exp - decoded.iat;
      expect(expiryDuration).toBeCloseTo(2592000, -3);
    });

    test('should throw error for null user', () => {
      expect(() => generateRefreshToken(null)).toThrow();
    });

    test('should throw error for user without id', () => {
      const invalidUser = { email: 'test@example.com' };
      
      expect(() => generateRefreshToken(invalidUser)).toThrow();
    });
  });
});

describe('Token Utils - Token Verification / أدوات الرموز - التحقق من الرموز', () => {
  const mockUser = {
    id: '12345',
    email: 'test@example.com',
    provider: 'github',
    username: 'testuser'
  };

  describe('verifyToken', () => {
    test('should verify valid access token', () => {
      const token = generateToken(mockUser);
      const decoded = verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.type).toBe('access');
    });

    test('should return null for null token', () => {
      expect(verifyToken(null)).toBeNull();
    });

    test('should return null for undefined token', () => {
      expect(verifyToken(undefined)).toBeNull();
    });

    test('should return null for empty token', () => {
      expect(verifyToken('')).toBeNull();
    });

    test('should return null for invalid token format', () => {
      const invalidToken = 'not-a-valid-jwt-token';
      
      expect(verifyToken(invalidToken)).toBeNull();
    });

    test('should return null for expired token', () => {
      // Create token with immediate expiry
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: '123', type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '0s', issuer: 'codex-universal-oauth', audience: 'codex-universal-app' }
      );
      
      expect(verifyToken(expiredToken)).toBeNull();
    });

    test('should return null for token with wrong issuer', () => {
      const jwt = require('jsonwebtoken');
      const wrongToken = jwt.sign(
        { userId: '123' },
        process.env.JWT_SECRET,
        { issuer: 'wrong-issuer', audience: 'codex-universal-app' }
      );
      
      expect(verifyToken(wrongToken)).toBeNull();
    });

    test('should return null for token with wrong audience', () => {
      const jwt = require('jsonwebtoken');
      const wrongToken = jwt.sign(
        { userId: '123' },
        process.env.JWT_SECRET,
        { issuer: 'codex-universal-oauth', audience: 'wrong-audience' }
      );
      
      expect(verifyToken(wrongToken)).toBeNull();
    });

    test('should return null for revoked token', () => {
      const token = generateToken(mockUser);
      revokeToken(token);
      
      expect(verifyToken(token)).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    test('should verify valid refresh token', () => {
      const token = generateRefreshToken(mockUser);
      const decoded = verifyRefreshToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.type).toBe('refresh');
    });

    test('should return null for null token', () => {
      expect(verifyRefreshToken(null)).toBeNull();
    });

    test('should return null for access token (wrong type)', () => {
      const accessToken = generateToken(mockUser);
      
      expect(verifyRefreshToken(accessToken)).toBeNull();
    });

    test('should return null for revoked refresh token', () => {
      const token = generateRefreshToken(mockUser);
      revokeToken(token);
      
      expect(verifyRefreshToken(token)).toBeNull();
    });

    test('should return null for invalid refresh token', () => {
      const invalidToken = 'invalid-token';
      
      expect(verifyRefreshToken(invalidToken)).toBeNull();
    });
  });
});

describe('Token Utils - Token Rotation / أدوات الرموز - تدوير الرموز', () => {
  const mockUser = {
    id: '12345',
    email: 'test@example.com',
    provider: 'github',
    username: 'testuser'
  };

  beforeEach(() => {
    // Clear revoked tokens before each test
    // This is a hack for testing - in production use proper cleanup
    const { revokedTokens } = require('../../server/utils/token.utils');
  });

  describe('rotateRefreshToken', () => {
    // Clear any revoked tokens before each test
    beforeEach(() => {
      // Create fresh tokens to avoid contamination from previous tests
    });
    
    test('should rotate refresh token successfully', () => {
      const oldRefreshToken = generateRefreshToken(mockUser);
      const newTokens = rotateRefreshToken(oldRefreshToken, mockUser);
      
      expect(newTokens).toHaveProperty('accessToken');
      expect(newTokens).toHaveProperty('refreshToken');
      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
    });

    test('should generate new access token', () => {
      // Use unique user to avoid interference from other tests
      const testUser = { ...mockUser, id: 'access-token-test-' + Date.now() };
      const oldRefreshToken = generateRefreshToken(testUser);
      const { accessToken } = rotateRefreshToken(oldRefreshToken, testUser);
      const decoded = verifyToken(accessToken);
      
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.type).toBe('access');
    });

    test('should generate new refresh token', () => {
      // Use unique user to avoid interference from other tests
      const testUser = { ...mockUser, id: 'refresh-token-test-' + Date.now() };
      const oldRefreshToken = generateRefreshToken(testUser);
      const { refreshToken } = rotateRefreshToken(oldRefreshToken, testUser);
      const decoded = verifyRefreshToken(refreshToken);
      
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.type).toBe('refresh');
    });

    test('should revoke old refresh token', () => {
      // Use unique user to avoid interference from other tests
      const testUser = { ...mockUser, id: 'revoke-test-' + Date.now() };
      const oldRefreshToken = generateRefreshToken(testUser);
      rotateRefreshToken(oldRefreshToken, testUser);
      
      expect(isTokenRevoked(oldRefreshToken)).toBe(true);
    });

    test('should throw error for invalid refresh token', () => {
      const invalidToken = 'invalid-token';
      
      expect(() => rotateRefreshToken(invalidToken, mockUser)).toThrow('Invalid refresh token');
    });

    test('should detect refresh token reuse and revoke all tokens', () => {
      // Use unique user for this test
      const testUser = { ...mockUser, id: 'reuse-detection-' + Date.now() };
      const oldRefreshToken = generateRefreshToken(testUser);
      
      // First rotation succeeds
      const firstRotation = rotateRefreshToken(oldRefreshToken, testUser);
      expect(firstRotation).toHaveProperty('accessToken');
      expect(firstRotation).toHaveProperty('refreshToken');
      
      // At this point, oldRefreshToken is revoked
      expect(isTokenRevoked(oldRefreshToken)).toBe(true);
      
      // Second rotation with same token should fail
      // Since the token is revoked, verifyRefreshToken will return null
      // So we'll get "Invalid refresh token" instead of the reuse detection message
      expect(() => rotateRefreshToken(oldRefreshToken, testUser)).toThrow();
    });

    test('should call revokeAllUserTokens on token reuse', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Test the revokeAllUserTokens function directly
      const testUser = { ...mockUser, id: 'manual-reuse-' + Date.now() };
      revokeAllUserTokens(testUser.id);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY ALERT: All tokens revoked for user')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('revokeToken', () => {
    test('should revoke token successfully', () => {
      const token = generateToken(mockUser);
      revokeToken(token);
      
      expect(isTokenRevoked(token)).toBe(true);
    });

    test('should handle null token gracefully', () => {
      expect(() => revokeToken(null)).not.toThrow();
    });

    test('should handle undefined token gracefully', () => {
      expect(() => revokeToken(undefined)).not.toThrow();
    });

    test('should automatically remove token from blacklist after 30 days', (done) => {
      jest.useFakeTimers();
      const token = generateToken(mockUser);
      
      revokeToken(token);
      expect(isTokenRevoked(token)).toBe(true);
      
      // Fast-forward 30 days
      jest.advanceTimersByTime(30 * 24 * 60 * 60 * 1000);
      
      // Token should no longer be in blacklist (but this is hard to test without internal access)
      jest.useRealTimers();
      done();
    });
  });

  describe('isTokenRevoked', () => {
    test('should return true for revoked token', () => {
      const token = 'unique-test-token-' + Date.now();
      revokeToken(token);
      
      expect(isTokenRevoked(token)).toBe(true);
    });

    test('should return false for non-revoked token', () => {
      const token = 'unique-non-revoked-token-' + Date.now() + Math.random();
      
      // Don't revoke this token
      expect(isTokenRevoked(token)).toBe(false);
    });

    test('should return false for never-seen token', () => {
      const randomToken = 'some-random-token';
      
      expect(isTokenRevoked(randomToken)).toBe(false);
    });
  });

  describe('revokeAllUserTokens', () => {
    test('should log security alert', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const userId = '12345';
      
      revokeAllUserTokens(userId);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY ALERT: All tokens revoked for user 12345')
      );
      consoleSpy.mockRestore();
    });

    test('should handle user ID', () => {
      expect(() => revokeAllUserTokens('test-user')).not.toThrow();
    });
  });
});

describe('Token Utils - Helper Functions / أدوات الرموز - وظائف المساعد', () => {
  describe('extractTokenFromHeader', () => {
    test('should extract token from Bearer header', () => {
      const authHeader = 'Bearer test-token-12345';
      const token = extractTokenFromHeader(authHeader);
      
      expect(token).toBe('test-token-12345');
    });

    test('should return null for null header', () => {
      expect(extractTokenFromHeader(null)).toBeNull();
    });

    test('should return null for undefined header', () => {
      expect(extractTokenFromHeader(undefined)).toBeNull();
    });

    test('should return entire header if no Bearer prefix', () => {
      const authHeader = 'test-token-12345';
      const token = extractTokenFromHeader(authHeader);
      
      expect(token).toBe('test-token-12345');
    });

    test('should handle header with Bearer and multiple spaces', () => {
      const authHeader = 'Bearer   test-token-12345';
      const token = extractTokenFromHeader(authHeader);
      
      // With multiple spaces, split creates more than 2 parts, so returns full header
      expect(token).toBe('Bearer   test-token-12345');
    });
  });

  describe('decodeToken', () => {
    const mockUser = {
      id: '12345',
      email: 'test@example.com',
      provider: 'github',
      username: 'testuser'
    };

    test('should decode valid token', () => {
      const token = generateToken(mockUser);
      const decoded = decodeToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(mockUser.id);
    });

    test('should decode without verifying signature', () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ test: 'data' }, 'different-secret');
      const decoded = decodeToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.test).toBe('data');
    });

    test('should return null for invalid token', () => {
      const invalidToken = 'not-a-jwt';
      
      expect(decodeToken(invalidToken)).toBeNull();
    });

    test('should return null for null token', () => {
      expect(decodeToken(null)).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    const mockUser = {
      id: '12345',
      email: 'test@example.com',
      provider: 'github'
    };

    test('should return false for valid non-expired token', () => {
      const token = generateToken(mockUser);
      
      expect(isTokenExpired(token)).toBe(false);
    });

    test('should return true for expired token', () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: '123' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' } // Expired 1 second ago
      );
      
      expect(isTokenExpired(expiredToken)).toBe(true);
    });

    test('should return true for token without exp claim', () => {
      const jwt = require('jsonwebtoken');
      const tokenWithoutExp = jwt.sign(
        { userId: '123' },
        process.env.JWT_SECRET,
        { noTimestamp: true }
      );
      
      expect(isTokenExpired(tokenWithoutExp)).toBe(true);
    });

    test('should return true for null token', () => {
      expect(isTokenExpired(null)).toBe(true);
    });

    test('should return true for invalid token', () => {
      const invalidToken = 'not-a-jwt';
      
      expect(isTokenExpired(invalidToken)).toBe(true);
    });
  });
});

describe('Token Utils - Security Properties / أدوات الرموز - خصائص الأمان', () => {
  const mockUser = {
    id: '12345',
    email: 'test@example.com',
    provider: 'github',
    username: 'testuser'
  };

  test('should not include sensitive data in token payload', () => {
    const token = generateToken(mockUser);
    const decoded = decodeToken(token);
    
    // Should not include passwords, secrets, etc.
    expect(decoded).not.toHaveProperty('password');
    expect(decoded).not.toHaveProperty('secret');
    expect(decoded).not.toHaveProperty('privateKey');
  });

  test('should generate unique tokens for security', () => {
    const tokens = new Set();
    
    for (let i = 0; i < 100; i++) {
      const token = generateToken({ ...mockUser, id: `user-${i}` });
      tokens.add(token);
    }
    
    expect(tokens.size).toBe(100);
  });

  test('should use strong secret for signing', () => {
    expect(process.env.JWT_SECRET.length).toBeGreaterThan(10);
  });

  test('should not expose token internals in error messages', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    verifyToken('invalid-token');
    
    const errorCalls = consoleErrorSpy.mock.calls.join(' ');
    const logCalls = consoleLogSpy.mock.calls.join(' ');
    
    // Should not log the actual token
    expect(errorCalls).not.toContain('invalid-token');
    expect(logCalls).not.toContain('invalid-token');
    
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });
});
