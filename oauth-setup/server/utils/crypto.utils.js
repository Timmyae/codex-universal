/**
 * Cryptographic Utilities
 * 
 * أدوات التشفير
 * Cryptographic helper functions for secure operations
 */

const crypto = require('crypto');

/**
 * Generate cryptographically secure random string
 * توليد سلسلة عشوائية آمنة
 * 
 * @param {number} length - Length in bytes
 * @returns {string} Hex-encoded random string
 */
function generateSecureRandom(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate base64url-encoded random string
 * توليد سلسلة عشوائية مشفرة بـ base64url
 * 
 * @param {number} length - Length in bytes
 * @returns {string} Base64URL-encoded random string
 */
function generateBase64UrlRandom(length = 32) {
  return crypto.randomBytes(length)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Hash string using SHA256
 * تجزئة سلسلة باستخدام SHA256
 * 
 * @param {string} data - Data to hash
 * @returns {string} Hex-encoded hash
 */
function sha256(data) {
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
}

/**
 * Hash string using SHA256 and return base64url
 * تجزئة سلسلة باستخدام SHA256 وإرجاع base64url
 * 
 * @param {string} data - Data to hash
 * @returns {string} Base64URL-encoded hash
 */
function sha256Base64Url(data) {
  const hash = crypto
    .createHash('sha256')
    .update(data)
    .digest('base64');
  
  return hash
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Constant-time string comparison
 * مقارنة السلاسل بوقت ثابت
 * 
 * Prevents timing attacks by comparing strings in constant time
 * 
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} True if strings match
 */
function timingSafeEqual(a, b) {
  try {
    if (typeof a !== 'string' || typeof b !== 'string') {
      return false;
    }

    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    if (bufA.length !== bufB.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
  } catch (error) {
    return false;
  }
}

/**
 * Encrypt data using AES-256-GCM
 * تشفير البيانات باستخدام AES-256-GCM
 * 
 * @param {string} plaintext - Data to encrypt
 * @param {string} key - Encryption key (32 bytes hex)
 * @returns {Object} Encrypted data with iv and authTag
 */
function encrypt(plaintext, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

/**
 * Decrypt data using AES-256-GCM
 * فك تشفير البيانات باستخدام AES-256-GCM
 * 
 * @param {string} encrypted - Encrypted data
 * @param {string} key - Decryption key (32 bytes hex)
 * @param {string} iv - Initialization vector (hex)
 * @param {string} authTag - Authentication tag (hex)
 * @returns {string} Decrypted plaintext
 */
function decrypt(encrypted, key, iv, authTag) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(key, 'hex'),
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate encryption key
 * توليد مفتاح تشفير
 * 
 * @returns {string} Hex-encoded 256-bit key
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * HMAC-SHA256 signature
 * توقيع HMAC-SHA256
 * 
 * @param {string} data - Data to sign
 * @param {string} secret - Secret key
 * @returns {string} Hex-encoded signature
 */
function hmacSha256(data, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

/**
 * Verify HMAC-SHA256 signature
 * التحقق من توقيع HMAC-SHA256
 * 
 * @param {string} data - Original data
 * @param {string} signature - Signature to verify
 * @param {string} secret - Secret key
 * @returns {boolean} True if signature is valid
 */
function verifyHmacSha256(data, signature, secret) {
  const expectedSignature = hmacSha256(data, secret);
  return timingSafeEqual(expectedSignature, signature);
}

module.exports = {
  generateSecureRandom,
  generateBase64UrlRandom,
  sha256,
  sha256Base64Url,
  timingSafeEqual,
  encrypt,
  decrypt,
  generateEncryptionKey,
  hmacSha256,
  verifyHmacSha256
};
