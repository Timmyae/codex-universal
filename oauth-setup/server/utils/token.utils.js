/**
 * Token Management Utilities
 * 
 * إدارة الرموز المميزة (JWT)
 * JWT Token Management with Rotation and Revocation
 * 
 * Features:
 * - Access token generation (short-lived: 15 minutes)
 * - Refresh token generation with rotation (30 days)
 * - Token revocation and blacklist
 * - Token verification with security checks
 * - Automatic token refresh before expiry
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// In-memory token blacklist (use Redis in production)
// قائمة الرموز المحظورة في الذاكرة (استخدم Redis في الإنتاج)
const tokenBlacklist = new Map();
const refreshTokenStore = new Map(); // Store refresh token metadata

/**
 * Generate JWT access token
 * توليد رمز الوصول
 * 
 * Access tokens are short-lived (15 minutes) to minimize damage if compromised
 * 
 * @param {string} userId - User identifier
 * @param {Object} payload - Additional claims to include
 * @param {string} expiresIn - Token expiration time (default: 15m)
 * @returns {string} JWT access token
 */
function generateAccessToken(userId, payload = {}, expiresIn = '15m') {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const tokenPayload = {
    userId,
    type: 'access',
    tokenId: uuidv4(), // Unique token ID for revocation
    ...payload
  };

  const token = jwt.sign(tokenPayload, secret, {
    expiresIn,
    issuer: 'codex-universal-oauth',
    audience: 'codex-universal-api'
  });

  return token;
}

/**
 * Generate refresh token with metadata
 * توليد رمز التحديث
 * 
 * Refresh tokens are longer-lived (30 days) but:
 * - Must be rotated on each use (one-time-use)
 * - Stored with metadata for security tracking
 * - Invalidated after use to prevent replay attacks
 * 
 * @param {string} userId - User identifier
 * @param {Object} payload - Additional claims to include
 * @param {string} expiresIn - Token expiration time (default: 30d)
 * @returns {Object} Object with token and tokenId
 */
function generateRefreshToken(userId, payload = {}, expiresIn = '30d') {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not configured');
  }

  const tokenId = uuidv4();
  const tokenPayload = {
    userId,
    type: 'refresh',
    tokenId,
    ...payload
  };

  const token = jwt.sign(tokenPayload, secret, {
    expiresIn,
    issuer: 'codex-universal-oauth',
    audience: 'codex-universal-api'
  });

  // Store refresh token metadata
  // تخزين بيانات رمز التحديث
  refreshTokenStore.set(tokenId, {
    userId,
    issuedAt: Date.now(),
    used: false,
    familyId: payload.familyId || uuidv4() // For token family tracking
  });

  return { token, tokenId };
}

/**
 * Rotate refresh token (issue new, invalidate old)
 * تدوير رمز التحديث (إصدار جديد، إبطال القديم)
 * 
 * Security measure: One-time-use refresh tokens
 * - Prevents token replay attacks
 * - Detects token theft (reuse attempt)
 * - Invalidates entire token family on suspicious activity
 * 
 * @param {string} oldToken - The refresh token to rotate
 * @returns {Object} New tokens (access + refresh) or null if invalid
 */
async function rotateRefreshToken(oldToken) {
  try {
    // Verify old refresh token
    const decoded = verifyToken(oldToken, 'refresh');
    
    if (!decoded) {
      return null;
    }

    const { userId, tokenId, familyId } = decoded;

    // Check if token has been used
    const tokenMetadata = refreshTokenStore.get(tokenId);
    
    if (!tokenMetadata) {
      // Token not found - might be expired or invalid
      return null;
    }

    if (tokenMetadata.used) {
      // SECURITY ALERT: Token reuse detected!
      // رمز مستخدم مرة أخرى - احتمال سرقة الرمز!
      console.error(`[SECURITY] Refresh token reuse detected for user ${userId}, token ${tokenId}`);
      
      // Revoke all tokens in this family (security measure)
      revokeTokenFamily(familyId);
      
      return null;
    }

    // Mark old token as used
    tokenMetadata.used = true;
    refreshTokenStore.set(tokenId, tokenMetadata);

    // Also add to blacklist
    addToBlacklist(oldToken);

    // Generate new token pair
    const accessToken = generateAccessToken(userId);
    const newRefreshToken = generateRefreshToken(userId, { familyId });

    return {
      accessToken,
      refreshToken: newRefreshToken.token,
      refreshTokenId: newRefreshToken.tokenId
    };

  } catch (error) {
    console.error('[Token Rotation Error]', error.message);
    return null;
  }
}

/**
 * Verify JWT token
 * التحقق من الرمز المميز
 * 
 * @param {string} token - JWT token to verify
 * @param {string} type - Token type: 'access' or 'refresh'
 * @returns {Object|null} Decoded token payload or null if invalid
 */
function verifyToken(token, type = 'access') {
  try {
    // Check if token is blacklisted
    if (isTokenRevoked(token)) {
      return null;
    }

    const secret = type === 'refresh' 
      ? (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET)
      : process.env.JWT_SECRET;

    const decoded = jwt.verify(token, secret, {
      issuer: 'codex-universal-oauth',
      audience: 'codex-universal-api'
    });

    // Verify token type matches
    if (decoded.type !== type) {
      return null;
    }

    return decoded;

  } catch (error) {
    // Token verification failed (expired, invalid signature, etc.)
    return null;
  }
}

/**
 * Revoke a token (add to blacklist)
 * إبطال رمز
 * 
 * @param {string} token - Token to revoke
 * @param {number} expirySeconds - How long to keep in blacklist (default: 24 hours)
 */
function revokeToken(token, expirySeconds = 86400) {
  addToBlacklist(token, expirySeconds);
}

/**
 * Check if token is revoked
 * التحقق من إبطال الرمز
 * 
 * @param {string} token - Token to check
 * @returns {boolean} True if revoked, false otherwise
 */
function isTokenRevoked(token) {
  const hash = hashToken(token);
  return tokenBlacklist.has(hash);
}

/**
 * Add token to blacklist
 * إضافة رمز إلى القائمة السوداء
 * 
 * @param {string} token - Token to blacklist
 * @param {number} expirySeconds - Time to keep in blacklist
 */
function addToBlacklist(token, expirySeconds = 86400) {
  const hash = hashToken(token);
  const expiresAt = Date.now() + (expirySeconds * 1000);
  
  tokenBlacklist.set(hash, {
    expiresAt,
    revokedAt: Date.now()
  });

  // Schedule cleanup
  setTimeout(() => {
    tokenBlacklist.delete(hash);
  }, expirySeconds * 1000);
}

/**
 * Revoke all tokens in a token family
 * إبطال جميع الرموز في عائلة الرمز
 * 
 * Security measure when token reuse is detected
 * 
 * @param {string} familyId - Token family identifier
 */
function revokeTokenFamily(familyId) {
  // Find all tokens with this family ID and mark as used
  for (const [tokenId, metadata] of refreshTokenStore.entries()) {
    if (metadata.familyId === familyId) {
      metadata.used = true;
      refreshTokenStore.set(tokenId, metadata);
    }
  }
  
  console.log(`[SECURITY] Revoked entire token family: ${familyId}`);
}

/**
 * Hash token for storage (don't store plain tokens)
 * تجزئة الرمز للتخزين (لا تخزن الرموز بصيغة نصية)
 * 
 * @param {string} token - Token to hash
 * @returns {string} SHA256 hash of token
 */
function hashToken(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

/**
 * Decode token without verification (for inspection only)
 * فك تشفير الرمز بدون التحقق (للفحص فقط)
 * 
 * WARNING: Do not use for authentication/authorization
 * 
 * @param {string} token - Token to decode
 * @returns {Object|null} Decoded payload or null
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
}

/**
 * Check if token is about to expire (within threshold)
 * التحقق من اقتراب انتهاء صلاحية الرمز
 * 
 * @param {string} token - Token to check
 * @param {number} thresholdSeconds - Time threshold in seconds (default: 300 = 5 minutes)
 * @returns {boolean} True if token expires within threshold
 */
function isTokenExpiringSoon(token, thresholdSeconds = 300) {
  const decoded = decodeToken(token);
  
  if (!decoded || !decoded.exp) {
    return false;
  }

  const expiresAt = decoded.exp * 1000; // Convert to milliseconds
  const now = Date.now();
  const timeUntilExpiry = expiresAt - now;

  return timeUntilExpiry < (thresholdSeconds * 1000);
}

/**
 * Clean up expired tokens from blacklist
 * تنظيف الرموز منتهية الصلاحية من القائمة السوداء
 */
function cleanupBlacklist() {
  const now = Date.now();
  
  for (const [hash, data] of tokenBlacklist.entries()) {
    if (data.expiresAt < now) {
      tokenBlacklist.delete(hash);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupBlacklist, 3600000);

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  verifyToken,
  revokeToken,
  isTokenRevoked,
  addToBlacklist,
  revokeTokenFamily,
  decodeToken,
  isTokenExpiringSoon,
  cleanupBlacklist,
  // For testing
  _testing: {
    tokenBlacklist,
    refreshTokenStore,
    hashToken
  }
};
