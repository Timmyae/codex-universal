const {
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  revokeToken,
  revokeTokenFamily,
  cleanupRevokedTokens,
  _clearStorage
} = require('../../server/utils/token.utils');

describe('Token Utils', () => {
  const testSecret = 'test-secret-key';
  const testUserId = 'user123';

  beforeEach(() => {
    // Clear storage before each test
    _clearStorage();
  });

  describe('generateAccessToken', () => {
    it('should generate a valid JWT access token', () => {
      const payload = { sub: testUserId, email: 'test@example.com' };
      const token = generateAccessToken(payload, testSecret);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });

    it('should include custom expiration', () => {
      const payload = { sub: testUserId };
      const token = generateAccessToken(payload, testSecret, '1h');
      
      expect(token).toBeDefined();
      const decoded = verifyAccessToken(token, testSecret);
      expect(decoded).toBeDefined();
      expect(decoded.sub).toBe(testUserId);
    });

    it('should throw error for invalid payload', () => {
      expect(() => generateAccessToken(null, testSecret)).toThrow('Payload must be an object');
      expect(() => generateAccessToken('invalid', testSecret)).toThrow('Payload must be an object');
    });

    it('should throw error for missing secret', () => {
      expect(() => generateAccessToken({ sub: testUserId }, null)).toThrow('Secret is required');
      expect(() => generateAccessToken({ sub: testUserId }, '')).toThrow('Secret is required');
    });

    it('should include issuer and audience', () => {
      const payload = { sub: testUserId };
      const token = generateAccessToken(payload, testSecret);
      const decoded = verifyAccessToken(token, testSecret);
      
      expect(decoded.iss).toBe('oauth-server');
      expect(decoded.aud).toBe('oauth-client');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token', () => {
      const result = generateRefreshToken(testUserId);
      
      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.familyId).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(typeof result.familyId).toBe('string');
    });

    it('should generate unique tokens', () => {
      const token1 = generateRefreshToken(testUserId);
      const token2 = generateRefreshToken(testUserId);
      
      expect(token1.token).not.toBe(token2.token);
      expect(token1.familyId).not.toBe(token2.familyId);
    });

    it('should use provided family ID', () => {
      const familyId = 'test-family-id';
      const result = generateRefreshToken(testUserId, familyId);
      
      expect(result.familyId).toBe(familyId);
    });

    it('should throw error for missing user ID', () => {
      expect(() => generateRefreshToken(null)).toThrow('User ID is required');
      expect(() => generateRefreshToken('')).toThrow('User ID is required');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const payload = { sub: testUserId };
      const token = generateAccessToken(payload, testSecret);
      const decoded = verifyAccessToken(token, testSecret);
      
      expect(decoded).toBeDefined();
      expect(decoded.sub).toBe(testUserId);
    });

    it('should return null for invalid token', () => {
      const decoded = verifyAccessToken('invalid-token', testSecret);
      expect(decoded).toBeNull();
    });

    it('should return null for token with wrong secret', () => {
      const payload = { sub: testUserId };
      const token = generateAccessToken(payload, testSecret);
      const decoded = verifyAccessToken(token, 'wrong-secret');
      
      expect(decoded).toBeNull();
    });

    it('should return null for revoked token', () => {
      const payload = { sub: testUserId };
      const token = generateAccessToken(payload, testSecret);
      
      revokeToken(token);
      
      const decoded = verifyAccessToken(token, testSecret);
      expect(decoded).toBeNull();
    });

    it('should return null for null token', () => {
      expect(verifyAccessToken(null, testSecret)).toBeNull();
    });

    it('should return null for null secret', () => {
      const token = generateAccessToken({ sub: testUserId }, testSecret);
      expect(verifyAccessToken(token, null)).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const { token } = generateRefreshToken(testUserId);
      const isValid = verifyRefreshToken(token, testUserId);
      
      expect(isValid).toBe(true);
    });

    it('should reject token for wrong user', () => {
      const { token } = generateRefreshToken(testUserId);
      const isValid = verifyRefreshToken(token, 'different-user');
      
      expect(isValid).toBe(false);
    });

    it('should reject revoked token', () => {
      const { token } = generateRefreshToken(testUserId);
      revokeToken(token);
      
      const isValid = verifyRefreshToken(token, testUserId);
      expect(isValid).toBe(false);
    });

    it('should reject non-existent token', () => {
      const isValid = verifyRefreshToken('non-existent-token', testUserId);
      expect(isValid).toBe(false);
    });

    it('should return false for null inputs', () => {
      expect(verifyRefreshToken(null, testUserId)).toBe(false);
      expect(verifyRefreshToken('token', null)).toBe(false);
    });
  });

  describe('rotateRefreshToken', () => {
    it('should rotate refresh token successfully', () => {
      const { token: oldToken, familyId } = generateRefreshToken(testUserId);
      const result = rotateRefreshToken(oldToken, testUserId);
      
      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.token).not.toBe(oldToken);
      expect(result.familyId).toBe(familyId); // Same family
    });

    it('should revoke old token after rotation', () => {
      const { token: oldToken } = generateRefreshToken(testUserId);
      rotateRefreshToken(oldToken, testUserId);
      
      const isValid = verifyRefreshToken(oldToken, testUserId);
      expect(isValid).toBe(false);
    });

    it('should verify new token after rotation', () => {
      const { token: oldToken } = generateRefreshToken(testUserId);
      const { token: newToken } = rotateRefreshToken(oldToken, testUserId);
      
      const isValid = verifyRefreshToken(newToken, testUserId);
      expect(isValid).toBe(true);
    });

    it('should return null for non-existent token', () => {
      const result = rotateRefreshToken('non-existent-token', testUserId);
      expect(result).toBeNull();
    });

    it('should return null for wrong user ID', () => {
      const { token } = generateRefreshToken(testUserId);
      const result = rotateRefreshToken(token, 'different-user');
      expect(result).toBeNull();
    });

    it('should detect token reuse and revoke family', () => {
      const { token: token1, familyId } = generateRefreshToken(testUserId);
      const { token: token2 } = rotateRefreshToken(token1, testUserId);
      
      // Try to reuse old token (security breach)
      const result = rotateRefreshToken(token1, testUserId);
      expect(result).toBeNull();
      
      // New token should also be revoked (family revoked)
      const isValid = verifyRefreshToken(token2, testUserId);
      expect(isValid).toBe(false);
    });

    it('should throw error for missing parameters', () => {
      expect(() => rotateRefreshToken(null, testUserId)).toThrow('Old token and user ID are required');
      expect(() => rotateRefreshToken('token', null)).toThrow('Old token and user ID are required');
    });
  });

  describe('revokeToken', () => {
    it('should revoke a token', () => {
      const { token } = generateRefreshToken(testUserId);
      revokeToken(token);
      
      const isValid = verifyRefreshToken(token, testUserId);
      expect(isValid).toBe(false);
    });

    it('should throw error for null token', () => {
      expect(() => revokeToken(null)).toThrow('Token is required');
    });
  });

  describe('revokeTokenFamily', () => {
    it('should revoke all tokens in a family', () => {
      const { token: token1, familyId } = generateRefreshToken(testUserId);
      const { token: token2 } = rotateRefreshToken(token1, testUserId);
      const { token: token3 } = rotateRefreshToken(token2, testUserId);
      
      revokeTokenFamily(familyId);
      
      // All tokens in family should be revoked
      expect(verifyRefreshToken(token2, testUserId)).toBe(false);
      expect(verifyRefreshToken(token3, testUserId)).toBe(false);
    });

    it('should not affect tokens from different families', () => {
      const { token: token1, familyId: family1 } = generateRefreshToken(testUserId);
      const { token: token2 } = generateRefreshToken(testUserId);
      
      revokeTokenFamily(family1);
      
      expect(verifyRefreshToken(token1, testUserId)).toBe(false);
      expect(verifyRefreshToken(token2, testUserId)).toBe(true);
    });

    it('should throw error for null family ID', () => {
      expect(() => revokeTokenFamily(null)).toThrow('Family ID is required');
    });
  });

  describe('cleanupRevokedTokens', () => {
    it('should remove old tokens', () => {
      const { token } = generateRefreshToken(testUserId);
      
      // Cleanup with 0 maxAge should remove all
      cleanupRevokedTokens(0);
      
      const isValid = verifyRefreshToken(token, testUserId);
      expect(isValid).toBe(false);
    });

    it('should keep recent tokens', () => {
      const { token } = generateRefreshToken(testUserId);
      
      // Cleanup with large maxAge should keep all
      cleanupRevokedTokens(24 * 60 * 60 * 1000);
      
      const isValid = verifyRefreshToken(token, testUserId);
      expect(isValid).toBe(true);
    });
  });

  describe('Integration tests', () => {
    it('should complete full token lifecycle', () => {
      // Generate tokens
      const payload = { sub: testUserId };
      const accessToken = generateAccessToken(payload, testSecret);
      const { token: refreshToken } = generateRefreshToken(testUserId);
      
      // Verify tokens
      expect(verifyAccessToken(accessToken, testSecret)).toBeDefined();
      expect(verifyRefreshToken(refreshToken, testUserId)).toBe(true);
      
      // Rotate refresh token
      const { token: newRefreshToken } = rotateRefreshToken(refreshToken, testUserId);
      expect(verifyRefreshToken(newRefreshToken, testUserId)).toBe(true);
      expect(verifyRefreshToken(refreshToken, testUserId)).toBe(false);
      
      // Revoke
      revokeToken(newRefreshToken);
      expect(verifyRefreshToken(newRefreshToken, testUserId)).toBe(false);
    });

    it('should handle multiple concurrent token families', () => {
      const users = ['user1', 'user2', 'user3'];
      const tokens = {};
      
      users.forEach(userId => {
        tokens[userId] = generateRefreshToken(userId);
      });
      
      // Each token should be valid for its user
      users.forEach(userId => {
        expect(verifyRefreshToken(tokens[userId].token, userId)).toBe(true);
      });
      
      // Cross-verification should fail
      expect(verifyRefreshToken(tokens['user1'].token, 'user2')).toBe(false);
    });
  });
});
