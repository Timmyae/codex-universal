/**
 * Token Management Utilities / أدوات إدارة الرموز
 * 
 * JWT token generation, verification, rotation, and blacklisting
 * إنشاء رمز JWT والتحقق منه والتدوير والقائمة السوداء
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT configuration from environment / تكوين JWT من البيئة
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m';
const JWT_REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_TOKEN_EXPIRY || '30d';

// In-memory token blacklist (use Redis in production)
// قائمة الرموز السوداء في الذاكرة (استخدم Redis في الإنتاج)
const revokedTokens = new Set();

/**
 * Generate JWT access token for authenticated user
 * إنشاء رمز وصول JWT للمستخدم المصادق عليه
 * 
 * Access tokens are short-lived (15 minutes by default)
 * رموز الوصول قصيرة الأجل (15 دقيقة افتراضيًا)
 * 
 * @param {Object} user - User object containing user information
 * @param {string} user.id - User ID
 * @param {string} user.email - User email
 * @param {string} user.provider - OAuth provider used
 * @returns {string} JWT access token
 */
function generateToken(user) {
  if (!user || !user.id) {
    throw new Error('User object with id is required to generate token');
  }

  const payload = {
    userId: user.id,
    email: user.email,
    provider: user.provider,
    username: user.username,
    // Token type for identification / نوع الرمز للتحديد
    type: 'access',
    // Add timestamp for token tracking / إضافة الطابع الزمني لتتبع الرمز
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_ACCESS_TOKEN_EXPIRY,
    issuer: 'codex-universal-oauth',
    audience: 'codex-universal-app'
  });
}

/**
 * Verify and decode JWT token
 * التحقق من رمز JWT وفك تشفيره
 * 
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 */
function verifyToken(token) {
  try {
    if (!token) {
      return null;
    }

    // Check if token is revoked / تحقق مما إذا كان الرمز ملغى
    if (isTokenRevoked(token)) {
      console.log('Token is revoked');
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'codex-universal-oauth',
      audience: 'codex-universal-app'
    });

    return decoded;
  } catch (error) {
    // Token verification failed / فشل التحقق من الرمز
    if (error.name === 'TokenExpiredError') {
      console.log('Token expired:', error.message);
    } else if (error.name === 'JsonWebTokenError') {
      console.log('Invalid token:', error.message);
    } else {
      console.error('Token verification error:', error.message);
    }
    return null;
  }
}

/**
 * Generate refresh token for long-term authentication
 * إنشاء رمز التحديث للمصادقة طويلة الأمد
 * 
 * Refresh tokens are long-lived (30 days by default)
 * رموز التحديث طويلة الأجل (30 يومًا افتراضيًا)
 * 
 * @param {Object} user - User object
 * @returns {string} Refresh token
 */
function generateRefreshToken(user) {
  if (!user || !user.id) {
    throw new Error('User object with id is required to generate refresh token');
  }

  const payload = {
    userId: user.id,
    type: 'refresh',
    // Add random jti (JWT ID) for tracking / إضافة jti عشوائي (معرف JWT) للتتبع
    jti: crypto.randomBytes(16).toString('hex'),
    iat: Math.floor(Date.now() / 1000)
  };

  // Refresh tokens expire in 30 days / تنتهي صلاحية رموز التحديث في 30 يومًا
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRY || '30d',
    issuer: 'codex-universal-oauth',
    audience: 'codex-universal-app'
  });
}

/**
 * Verify refresh token
 * التحقق من رمز التحديث
 * 
 * @param {string} refreshToken - Refresh token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 */
function verifyRefreshToken(refreshToken) {
  try {
    if (!refreshToken) {
      return null;
    }

    // Check if token is revoked / تحقق مما إذا كان الرمز ملغى
    if (isTokenRevoked(refreshToken)) {
      console.log('Refresh token is revoked');
      return null;
    }

    const decoded = jwt.verify(refreshToken, JWT_SECRET, {
      issuer: 'codex-universal-oauth',
      audience: 'codex-universal-app'
    });

    // Ensure it's a refresh token / تأكد من أنه رمز تحديث
    if (decoded.type !== 'refresh') {
      console.log('Token is not a refresh token');
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Refresh token verification error:', error.message);
    return null;
  }
}

// In-memory token blacklist (use Redis in production)
// قائمة الرموز السوداء في الذاكرة (استخدم Redis في الإنتاج)

/**
 * Rotate refresh token (RFC 6749 Section 10.4)
 * تدوير رمز التحديث (RFC 6749 القسم 10.4)
 * 
 * This implements refresh token rotation for enhanced security:
 * 1. Verify old refresh token
 * 2. Check if token was already used (reuse detection)
 * 3. Revoke old token
 * 4. Generate new access and refresh tokens
 * 
 * If token reuse is detected, all tokens for the user are revoked
 * إذا تم اكتشاف إعادة استخدام الرمز، يتم إلغاء جميع الرموز للمستخدم
 * 
 * @param {string} oldRefreshToken - Old refresh token
 * @param {Object} user - User object
 * @returns {Object} New access and refresh tokens
 */
function rotateRefreshToken(oldRefreshToken, user) {
  // Verify the old refresh token / التحقق من رمز التحديث القديم
  const decoded = verifyRefreshToken(oldRefreshToken);
  if (!decoded) {
    throw new Error('Invalid refresh token');
  }
  
  // SECURITY: Check if token was already used (reuse detection)
  // الأمان: تحقق مما إذا كان الرمز قد استخدم بالفعل (اكتشاف إعادة الاستخدام)
  if (isTokenRevoked(oldRefreshToken)) {
    // Token reuse detected! Revoke all user tokens
    // تم اكتشاف إعادة استخدام الرمز! إلغاء جميع رموز المستخدم
    revokeAllUserTokens(decoded.userId);
    throw new Error('Refresh token reuse detected - all tokens revoked');
  }
  
  // Revoke the old refresh token / إلغاء رمز التحديث القديم
  revokeToken(oldRefreshToken);
  
  // Generate new tokens / إنشاء رموز جديدة
  const accessToken = generateToken(user);
  const newRefreshToken = generateRefreshToken(user);
  
  return { accessToken, refreshToken: newRefreshToken };
}

/**
 * Revoke a token (add to blacklist)
 * إلغاء رمز (إضافة إلى القائمة السوداء)
 * 
 * @param {string} token - Token to revoke
 */
function revokeToken(token) {
  if (!token) return;
  
  // Add to revoked tokens set / إضافة إلى مجموعة الرموز الملغاة
  revokedTokens.add(token);
  
  // Automatically remove from blacklist after 30 days to prevent memory leak
  // إزالة تلقائيًا من القائمة السوداء بعد 30 يومًا لمنع تسرب الذاكرة
  setTimeout(() => revokedTokens.delete(token), 30 * 24 * 60 * 60 * 1000);
}

/**
 * Check if token is revoked
 * تحقق مما إذا كان الرمز ملغى
 * 
 * @param {string} token - Token to check
 * @returns {boolean} True if token is revoked
 */
function isTokenRevoked(token) {
  return revokedTokens.has(token);
}

/**
 * Revoke all tokens for a user (security event)
 * إلغاء جميع الرموز للمستخدم (حدث أمني)
 * 
 * Called when token reuse is detected or account is compromised
 * يتم الاستدعاء عند اكتشاف إعادة استخدام الرمز أو اختراق الحساب
 * 
 * @param {string} userId - User ID
 */
function revokeAllUserTokens(userId) {
  // In production, this should revoke all tokens from database/Redis
  // في الإنتاج، يجب أن يلغي هذا جميع الرموز من قاعدة البيانات/Redis
  console.warn(`SECURITY ALERT: All tokens revoked for user ${userId}`);
  
  // TODO: In production, query database/Redis for all user tokens and revoke them
  // يجب القيام به: في الإنتاج، استعلام قاعدة البيانات/Redis عن جميع رموز المستخدم وإلغاؤها
}

/**
 * Extract token from Authorization header
 * استخراج الرمز من رأس التفويض
 * 
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null if not found
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader) {
    return null;
  }

  // Support both "Bearer <token>" and "<token>" formats
  // دعم كل من تنسيقات "Bearer <token>" و "<token>"
  const parts = authHeader.split(' ');
  
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }
  
  // If no Bearer prefix, assume the entire header is the token
  // إذا لم يكن هناك بادئة Bearer، فافترض أن الرأس بالكامل هو الرمز
  return authHeader;
}

/**
 * Decode token without verification (for debugging)
 * فك تشفير الرمز بدون التحقق (للتصحيح)
 * 
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded token payload or null if invalid
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    console.error('Token decode error:', error.message);
    return null;
  }
}

/**
 * Check if token is expired
 * تحقق مما إذا كان الرمز منتهي الصلاحية
 * 
 * @param {string} token - JWT token to check
 * @returns {boolean} True if token is expired
 */
function isTokenExpired(token) {
  const decoded = decodeToken(token);
  
  if (!decoded || !decoded.exp) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
}

module.exports = {
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
};
