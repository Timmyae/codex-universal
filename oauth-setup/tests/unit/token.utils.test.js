/**
 * Token Utilities Unit Tests
 * 
 * اختبارات وحدة أدوات الرموز
 * Comprehensive tests for token generation, rotation, and revocation
 */

const {
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  verifyToken,
  revokeToken,
  isTokenRevoked,
  decodeToken,
  isTokenExpiringSoon,
  _testing,
} = require('../../server/utils/token.utils');

describe('Token Utils - Access Token Generation', () => {
  test('should generate valid access token', () => {
    const userId = 'user123';
    const token = generateAccessToken(userId);
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT format: header.payload.signature
  });

  test('should include userId in token payload', () => {
    const userId = 'user123';
    const token = generateAccessToken(userId);
    const decoded = decodeToken(token);
    
    expect(decoded.userId).toBe(userId);
  });

  test('should include type "access" in token', () => {
    const userId = 'user123';
    const token = generateAccessToken(userId);
    const decoded = decodeToken(token);
    
    expect(decoded.type).toBe('access');
  });

  test('should include unique tokenId', () => {
    const userId = 'user123';
    const token1 = generateAccessToken(userId);
    const token2 = generateAccessToken(userId);
    const decoded1 = decodeToken(token1);
    const decoded2 = decodeToken(token2);
    
    expect(decoded1.tokenId).toBeDefined();
    expect(decoded2.tokenId).toBeDefined();
    expect(decoded1.tokenId).not.toBe(decoded2.tokenId);
  });

  test('should include custom payload data', () => {
    const userId = 'user123';
    const customData = { role: 'admin', email: 'test@example.com' };
    const token = generateAccessToken(userId, customData);
    const decoded = decodeToken(token);
    
    expect(decoded.role).toBe('admin');
    expect(decoded.email).toBe('test@example.com');
  });

  test('should use default expiry (15m)', () => {
    const userId = 'user123';
    const token = generateAccessToken(userId);
    const decoded = decodeToken(token);
    
    const now = Math.floor(Date.now() / 1000);
    const expectedExpiry = now + (15 * 60); // 15 minutes
    
    expect(decoded.exp).toBeDefined();
    expect(decoded.exp).toBeGreaterThan(now);
    expect(decoded.exp).toBeLessThanOrEqual(expectedExpiry + 5); // Allow 5 second margin
  });

  test('should use custom expiry', () => {
    const userId = 'user123';
    const token = generateAccessToken(userId, {}, '1h');
    const decoded = decodeToken(token);
    
    const now = Math.floor(Date.now() / 1000);
    const expectedExpiry = now + (60 * 60); // 1 hour
    
    expect(decoded.exp).toBeGreaterThan(now);
    expect(decoded.exp).toBeLessThanOrEqual(expectedExpiry + 5);
  });

  test('should throw error if JWT_SECRET not configured', () => {
    const originalSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    
    expect(() => generateAccessToken('user123')).toThrow('JWT_SECRET is not configured');
    
    process.env.JWT_SECRET = originalSecret;
  });
});

describe('Token Utils - Refresh Token Generation', () => {
  test('should generate valid refresh token', () => {
    const userId = 'user123';
    const result = generateRefreshToken(userId);
    
    expect(result).toBeDefined();
    expect(result.token).toBeDefined();
    expect(result.tokenId).toBeDefined();
    expect(typeof result.token).toBe('string');
  });

  test('should include type "refresh" in token', () => {
    const userId = 'user123';
    const result = generateRefreshToken(userId);
    const decoded = decodeToken(result.token);
    
    expect(decoded.type).toBe('refresh');
  });

  test('should store token metadata', () => {
    const userId = 'user123';
    const result = generateRefreshToken(userId);
    const metadata = _testing.refreshTokenStore.get(result.tokenId);
    
    expect(metadata).toBeDefined();
    expect(metadata.userId).toBe(userId);
    expect(metadata.used).toBe(false);
    expect(metadata.familyId).toBeDefined();
  });

  test('should use default expiry (30d)', () => {
    const userId = 'user123';
    const result = generateRefreshToken(userId);
    const decoded = decodeToken(result.token);
    
    const now = Math.floor(Date.now() / 1000);
    const expectedExpiry = now + (30 * 24 * 60 * 60); // 30 days
    
    expect(decoded.exp).toBeGreaterThan(now);
    expect(decoded.exp).toBeLessThanOrEqual(expectedExpiry + 5);
  });
});

describe('Token Utils - Token Verification', () => {
  test('should verify valid access token', () => {
    const userId = 'user123';
    const token = generateAccessToken(userId);
    const decoded = verifyToken(token, 'access');
    
    expect(decoded).toBeDefined();
    expect(decoded.userId).toBe(userId);
  });

  test('should verify valid refresh token', () => {
    const userId = 'user123';
    const result = generateRefreshToken(userId);
    const decoded = verifyToken(result.token, 'refresh');
    
    expect(decoded).toBeDefined();
    expect(decoded.userId).toBe(userId);
  });

  test('should reject invalid token', () => {
    const invalidToken = 'invalid.token.here';
    const decoded = verifyToken(invalidToken, 'access');
    
    expect(decoded).toBeNull();
  });

  test('should reject token with wrong type', () => {
    const userId = 'user123';
    const accessToken = generateAccessToken(userId);
    const decoded = verifyToken(accessToken, 'refresh'); // Wrong type
    
    expect(decoded).toBeNull();
  });

  test('should reject revoked token', () => {
    const userId = 'user123';
    const token = generateAccessToken(userId);
    
    revokeToken(token);
    const decoded = verifyToken(token, 'access');
    
    expect(decoded).toBeNull();
  });

  test('should reject expired token', async () => {
    const userId = 'user123';
    const token = generateAccessToken(userId, {}, '1ms'); // Expire immediately
    
    await new Promise(resolve => setTimeout(resolve, 10)); // Wait for expiry
    
    const decoded = verifyToken(token, 'access');
    expect(decoded).toBeNull();
  });
});

describe('Token Utils - Token Rotation', () => {
  test('should rotate refresh token successfully', async () => {
    const userId = 'user123';
    const result = generateRefreshToken(userId);
    
    const rotated = await rotateRefreshToken(result.token);
    
    expect(rotated).toBeDefined();
    expect(rotated.accessToken).toBeDefined();
    expect(rotated.refreshToken).toBeDefined();
    expect(rotated.refreshTokenId).toBeDefined();
  });

  test('should mark old token as used', async () => {
    const userId = 'user123';
    const result = generateRefreshToken(userId);
    
    await rotateRefreshToken(result.token);
    
    const metadata = _testing.refreshTokenStore.get(result.tokenId);
    expect(metadata.used).toBe(true);
  });

  test('should reject reused refresh token', async () => {
    const userId = 'user123';
    const result = generateRefreshToken(userId);
    
    // Use token once
    await rotateRefreshToken(result.token);
    
    // Try to use again - should fail
    const secondAttempt = await rotateRefreshToken(result.token);
    expect(secondAttempt).toBeNull();
  });

  test('should revoke token family on reuse attempt', async () => {
    const userId = 'user123';
    const result = generateRefreshToken(userId);
    const familyId = decodeToken(result.token).familyId;
    
    // Use token once
    const rotated = await rotateRefreshToken(result.token);
    
    // Try to reuse old token
    await rotateRefreshToken(result.token);
    
    // New token should also be marked as used
    const newTokenId = rotated.refreshTokenId;
    const newMetadata = _testing.refreshTokenStore.get(newTokenId);
    expect(newMetadata.used).toBe(true);
  });

  test('should reject invalid refresh token', async () => {
    const invalidToken = 'invalid.token.here';
    const rotated = await rotateRefreshToken(invalidToken);
    
    expect(rotated).toBeNull();
  });

  test('should reject non-existent token', async () => {
    const userId = 'user123';
    const token = generateAccessToken(userId); // Wrong type
    const rotated = await rotateRefreshToken(token);
    
    expect(rotated).toBeNull();
  });
});

describe('Token Utils - Token Revocation', () => {
  test('should revoke token', () => {
    const userId = 'user123';
    const token = generateAccessToken(userId);
    
    revokeToken(token);
    
    expect(isTokenRevoked(token)).toBe(true);
  });

  test('should check non-revoked token', () => {
    const userId = 'user123';
    const token = generateAccessToken(userId);
    
    expect(isTokenRevoked(token)).toBe(false);
  });

  test('should handle multiple revocations', () => {
    const userId = 'user123';
    const token1 = generateAccessToken(userId);
    const token2 = generateAccessToken(userId);
    
    revokeToken(token1);
    revokeToken(token2);
    
    expect(isTokenRevoked(token1)).toBe(true);
    expect(isTokenRevoked(token2)).toBe(true);
  });
});

describe('Token Utils - Token Decoding', () => {
  test('should decode valid token', () => {
    const userId = 'user123';
    const token = generateAccessToken(userId);
    const decoded = decodeToken(token);
    
    expect(decoded).toBeDefined();
    expect(decoded.userId).toBe(userId);
  });

  test('should decode without verification', () => {
    const userId = 'user123';
    const token = generateAccessToken(userId);
    
    revokeToken(token); // Revoke it
    
    const decoded = decodeToken(token); // Should still decode
    expect(decoded).toBeDefined();
    expect(decoded.userId).toBe(userId);
  });

  test('should return null for invalid token', () => {
    const decoded = decodeToken('invalid.token');
    expect(decoded).toBeNull();
  });
});

describe('Token Utils - Token Expiry Check', () => {
  test('should detect expiring token', () => {
    const userId = 'user123';
    const token = generateAccessToken(userId, {}, '1m'); // 1 minute
    
    const expiring = isTokenExpiringSoon(token, 120); // Within 2 minutes
    expect(expiring).toBe(true);
  });

  test('should detect non-expiring token', () => {
    const userId = 'user123';
    const token = generateAccessToken(userId, {}, '1h'); // 1 hour
    
    const expiring = isTokenExpiringSoon(token, 300); // Within 5 minutes
    expect(expiring).toBe(false);
  });

  test('should handle token without expiry', () => {
    const invalidToken = 'invalid.token';
    const expiring = isTokenExpiringSoon(invalidToken);
    
    expect(expiring).toBe(false);
  });
});

describe('Token Utils - Cleanup', () => {
  beforeEach(() => {
    // Clear blacklist before each test
    _testing.tokenBlacklist.clear();
  });

  test('should clean up expired blacklist entries', async () => {
    const userId = 'user123';
    const token = generateAccessToken(userId);
    
    // Add to blacklist with 1ms expiry
    _testing.tokenBlacklist.set(_testing.hashToken(token), {
      expiresAt: Date.now() + 1,
      revokedAt: Date.now()
    });
    
    expect(isTokenRevoked(token)).toBe(true);
    
    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Manual cleanup (normally runs on interval)
    const { cleanupBlacklist } = require('../../server/utils/token.utils');
    cleanupBlacklist();
    
    expect(isTokenRevoked(token)).toBe(false);
  });
});
