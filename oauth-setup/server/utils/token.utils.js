const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// In-memory storage for revoked tokens and refresh token families
// In production, use Redis or a database
const revokedTokens = new Map(); // Changed to Map to store family ID
const refreshTokenFamilies = new Map(); // Maps refresh token to its family ID

/**
 * Token lifecycle management with rotation and revocation
 */

/**
 * Generate an access token (JWT)
 * @param {object} payload - Token payload
 * @param {string} secret - JWT secret
 * @param {string} expiresIn - Token expiration (e.g., '15m')
 * @returns {string} JWT access token
 */
function generateAccessToken(payload, secret, expiresIn = '15m') {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload must be an object');
  }
  if (!secret) {
    throw new Error('Secret is required');
  }
  
  return jwt.sign(payload, secret, {
    expiresIn,
    issuer: 'oauth-server',
    audience: 'oauth-client'
  });
}

/**
 * Generate a refresh token
 * @param {string} userId - User identifier
 * @param {string} familyId - Token family ID (optional, for rotation)
 * @returns {object} Refresh token and its family ID
 */
function generateRefreshToken(userId, familyId = null) {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  const token = crypto.randomBytes(64).toString('hex');
  const family = familyId || crypto.randomBytes(16).toString('hex');
  
  refreshTokenFamilies.set(token, {
    familyId: family,
    userId,
    createdAt: Date.now()
  });
  
  return { token, familyId: family };
}

/**
 * Rotate refresh token (invalidate old, issue new in same family)
 * @param {string} oldToken - The old refresh token
 * @param {string} userId - User identifier
 * @returns {object} New refresh token or null if invalid
 */
function rotateRefreshToken(oldToken, userId) {
  if (!oldToken || !userId) {
    throw new Error('Old token and user ID are required');
  }
  
  // Check if token is revoked first (detect reuse)
  if (revokedTokens.has(oldToken)) {
    // Token was already used - this is a potential security breach
    const revokedData = revokedTokens.get(oldToken);
    if (revokedData && revokedData.familyId) {
      // Revoke entire family
      revokeTokenFamily(revokedData.familyId);
    }
    return null;
  }
  
  const tokenData = refreshTokenFamilies.get(oldToken);
  
  if (!tokenData) {
    return null; // Token not found
  }
  
  if (tokenData.userId !== userId) {
    return null; // Token doesn't belong to this user
  }
  
  // Store family ID before any modifications
  const familyId = tokenData.familyId;
  
  // Revoke old token
  revokeToken(oldToken, familyId);
  
  // Generate new token in same family
  return generateRefreshToken(userId, familyId);
}

/**
 * Verify and decode access token
 * @param {string} token - JWT access token
 * @param {string} secret - JWT secret
 * @returns {object} Decoded token payload or null if invalid
 */
function verifyAccessToken(token, secret) {
  if (!token || !secret) {
    return null;
  }
  
  try {
    // Check if token is revoked
    if (revokedTokens.has(token)) {
      return null;
    }
    
    const decoded = jwt.verify(token, secret, {
      issuer: 'oauth-server',
      audience: 'oauth-client'
    });
    
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Verify refresh token
 * @param {string} token - Refresh token
 * @param {string} userId - User identifier
 * @returns {boolean} True if token is valid
 */
function verifyRefreshToken(token, userId) {
  if (!token || !userId) {
    return false;
  }
  
  const tokenData = refreshTokenFamilies.get(token);
  
  if (!tokenData) {
    return false;
  }
  
  if (tokenData.userId !== userId) {
    return false;
  }
  
  if (revokedTokens.has(token)) {
    return false;
  }
  
  return true;
}

/**
 * Revoke a specific token
 * @param {string} token - Token to revoke
 * @param {string} familyId - Optional family ID to store with revoked token
 */
function revokeToken(token, familyId = null) {
  if (!token) {
    throw new Error('Token is required');
  }
  
  // Get family ID from token data if not provided
  if (!familyId) {
    const tokenData = refreshTokenFamilies.get(token);
    familyId = tokenData?.familyId;
  }
  
  revokedTokens.set(token, { familyId, revokedAt: Date.now() });
  refreshTokenFamilies.delete(token);
}

/**
 * Revoke all tokens in a family (for security breach detection)
 * @param {string} familyId - Token family ID
 */
function revokeTokenFamily(familyId) {
  if (!familyId) {
    throw new Error('Family ID is required');
  }
  
  for (const [token, data] of refreshTokenFamilies.entries()) {
    if (data.familyId === familyId) {
      revokedTokens.set(token, { familyId, revokedAt: Date.now() });
      refreshTokenFamilies.delete(token);
    }
  }
}

/**
 * Clean up expired revoked tokens (should be run periodically)
 * @param {number} maxAge - Maximum age in milliseconds
 */
function cleanupRevokedTokens(maxAge = 24 * 60 * 60 * 1000) {
  const now = Date.now();
  const tokensToCleanup = [];
  
  for (const [token, data] of refreshTokenFamilies.entries()) {
    if (now - data.createdAt >= maxAge) {
      tokensToCleanup.push(token);
    }
  }
  
  // Revoke old tokens
  for (const token of tokensToCleanup) {
    const tokenData = refreshTokenFamilies.get(token);
    revokedTokens.set(token, { 
      familyId: tokenData?.familyId, 
      revokedAt: now 
    });
    refreshTokenFamilies.delete(token);
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  revokeToken,
  revokeTokenFamily,
  cleanupRevokedTokens,
  // Export for testing
  _getRevokedTokens: () => revokedTokens,
  _getRefreshTokenFamilies: () => refreshTokenFamilies,
  _clearStorage: () => {
    revokedTokens.clear();
    refreshTokenFamilies.clear();
  }
};
