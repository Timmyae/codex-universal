/**
 * PKCE (Proof Key for Code Exchange) Utilities
 * أدوات PKCE (إثبات المفتاح لتبادل الرمز)
 * 
 * Implements RFC 7636 - Proof Key for Code Exchange (PKCE) with S256 method
 * تطبيق RFC 7636 - إثبات المفتاح لتبادل الرمز (PKCE) بطريقة S256
 * 
 * PKCE adds security for OAuth 2.0 public clients by using cryptographic proof
 * يضيف PKCE الأمان لعملاء OAuth 2.0 العامين باستخدام إثبات التشفير
 */

const crypto = require('crypto');

/**
 * Generate cryptographically secure code verifier
 * إنشاء محقق رمز آمن من الناحية التشفيرية
 * 
 * RFC 7636 Section 4.1: code_verifier = high-entropy cryptographic random string
 * using unreserved characters [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
 * with a minimum length of 43 characters and a maximum length of 128 characters
 * 
 * @returns {string} Base64URL-encoded code verifier (43-128 chars)
 */
function generateCodeVerifier() {
  // Generate 32 random bytes (256 bits) for high entropy
  // إنشاء 32 بايت عشوائية (256 بت) لإنتروبيا عالية
  const randomBytes = crypto.randomBytes(32);
  
  // Convert to base64url format (RFC 4648 Section 5)
  // تحويل إلى تنسيق base64url (RFC 4648 القسم 5)
  const codeVerifier = base64UrlEncode(randomBytes);
  
  return codeVerifier;
}

/**
 * Generate code challenge from code verifier
 * إنشاء تحدي الرمز من محقق الرمز
 * 
 * RFC 7636 Section 4.2: code_challenge = BASE64URL(SHA256(ASCII(code_verifier)))
 * 
 * @param {string} codeVerifier - The code verifier string
 * @returns {string} Base64URL-encoded SHA256 hash of code verifier
 */
function generateCodeChallenge(codeVerifier) {
  if (!codeVerifier || typeof codeVerifier !== 'string') {
    throw new Error('Code verifier must be a non-empty string');
  }
  
  // Validate code verifier format
  // التحقق من صحة تنسيق محقق الرمز
  if (!validateCodeVerifier(codeVerifier)) {
    throw new Error('Invalid code verifier format');
  }
  
  // Create SHA256 hash of code verifier
  // إنشاء تجزئة SHA256 لمحقق الرمز
  const hash = crypto
    .createHash('sha256')
    .update(codeVerifier, 'ascii')
    .digest();
  
  // Encode as base64url
  // الترميز كـ base64url
  const codeChallenge = base64UrlEncode(hash);
  
  return codeChallenge;
}

/**
 * Validate code verifier format
 * التحقق من صحة تنسيق محقق الرمز
 * 
 * RFC 7636 Section 4.1: Validates that code verifier:
 * - Length between 43 and 128 characters
 * - Only contains unreserved characters [A-Za-z0-9-._~]
 * 
 * @param {string} codeVerifier - The code verifier to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateCodeVerifier(codeVerifier) {
  if (!codeVerifier || typeof codeVerifier !== 'string') {
    return false;
  }
  
  // Check length (43-128 characters)
  // التحقق من الطول (43-128 حرفًا)
  if (codeVerifier.length < 43 || codeVerifier.length > 128) {
    return false;
  }
  
  // Check that it only contains base64url characters
  // التحقق من احتوائه على أحرف base64url فقط
  const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
  if (!base64UrlPattern.test(codeVerifier)) {
    return false;
  }
  
  return true;
}

/**
 * Verify that code challenge matches code verifier
 * التحقق من أن تحدي الرمز يطابق محقق الرمز
 * 
 * Uses constant-time comparison to prevent timing attacks
 * يستخدم مقارنة الوقت الثابت لمنع هجمات التوقيت
 * 
 * @param {string} codeVerifier - The code verifier
 * @param {string} codeChallenge - The code challenge to verify
 * @returns {boolean} True if challenge matches verifier
 */
function verifyChallenge(codeVerifier, codeChallenge) {
  if (!codeVerifier || !codeChallenge) {
    return false;
  }
  
  try {
    // Generate expected challenge from verifier
    // إنشاء التحدي المتوقع من المحقق
    const expectedChallenge = generateCodeChallenge(codeVerifier);
    
    // Use constant-time comparison to prevent timing attacks
    // استخدام مقارنة الوقت الثابت لمنع هجمات التوقيت
    const expectedBuffer = Buffer.from(expectedChallenge, 'utf8');
    const receivedBuffer = Buffer.from(codeChallenge, 'utf8');
    
    // Buffers must be same length for timingSafeEqual
    // يجب أن تكون المخازن المؤقتة بنفس الطول لـ timingSafeEqual
    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }
    
    // Constant-time comparison
    // مقارنة الوقت الثابت
    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch (error) {
    console.error('Error verifying PKCE challenge:', error.message);
    return false;
  }
}

/**
 * Encode buffer to Base64URL format (RFC 4648 Section 5)
 * ترميز المخزن المؤقت إلى تنسيق Base64URL (RFC 4648 القسم 5)
 * 
 * Base64URL encoding:
 * - Replace + with -
 * - Replace / with _
 * - Remove padding =
 * 
 * @param {Buffer} buffer - Buffer to encode
 * @returns {string} Base64URL-encoded string
 */
function base64UrlEncode(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Decode Base64URL string to buffer
 * فك تشفير سلسلة Base64URL إلى المخزن المؤقت
 * 
 * @param {string} base64url - Base64URL-encoded string
 * @returns {Buffer} Decoded buffer
 */
function base64UrlDecode(base64url) {
  // Add padding if needed
  // إضافة الحشو إذا لزم الأمر
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  
  return Buffer.from(base64, 'base64');
}

/**
 * Generate PKCE pair (verifier and challenge)
 * إنشاء زوج PKCE (المحقق والتحدي)
 * 
 * Convenience method to generate both verifier and challenge
 * طريقة ملائمة لإنشاء كل من المحقق والتحدي
 * 
 * @returns {Object} Object with codeVerifier and codeChallenge
 */
function generatePKCEPair() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  
  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256' // RFC 7636 mandates S256 method
  };
}

module.exports = {
  generateCodeVerifier,
  generateCodeChallenge,
  validateCodeVerifier,
  verifyChallenge,
  base64UrlEncode,
  base64UrlDecode,
  generatePKCEPair
};
