/**
 * Token Management Utilities / أدوات إدارة الرموز
 * 
 * JWT token generation, verification, and management
 * إنشاء رمز JWT والتحقق منه وإدارته
 */

const jwt = require('jsonwebtoken');

// Get JWT secret from environment / احصل على سر JWT من البيئة
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate JWT token for authenticated user
 * إنشاء رمز JWT للمستخدم المصادق عليه
 * 
 * @param {Object} user - User object containing user information
 * @param {string} user.id - User ID
 * @param {string} user.email - User email
 * @param {string} user.provider - OAuth provider used
 * @returns {string} JWT token
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
    // Add timestamp for token tracking / إضافة الطابع الزمني لتتبع الرمز
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
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
    iat: Math.floor(Date.now() / 1000)
  };

  // Refresh tokens expire in 30 days / تنتهي صلاحية رموز التحديث في 30 يومًا
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '30d',
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

    const decoded = jwt.verify(refreshToken, JWT_SECRET, {
      issuer: 'codex-universal-oauth',
      audience: 'codex-universal-app'
    });

    // Ensure it's a refresh token / تأكد من أنه رمز تحديث
    if (decoded.type !== 'refresh') {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Refresh token verification error:', error.message);
    return null;
  }
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
  extractTokenFromHeader,
  decodeToken,
  isTokenExpired
};
