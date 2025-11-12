/**
 * PKCE (Proof Key for Code Exchange) Utilities
 * 
 * تطبيق PKCE للأمان المعزز في OAuth 2.0
 * Implements PKCE for enhanced OAuth 2.0 security
 * 
 * PKCE prevents authorization code interception attacks by:
 * 1. Generating a random code_verifier (43-128 characters)
 * 2. Creating a code_challenge from SHA256(code_verifier)
 * 3. Sending code_challenge in authorization request
 * 4. Sending code_verifier in token exchange
 * 5. Server validates: SHA256(code_verifier) === stored code_challenge
 * 
 * @see https://datatracker.ietf.org/doc/html/rfc7636
 */

const crypto = require('crypto');

/**
 * Generate a cryptographically secure random code verifier
 * معرف التحقق العشوائي الآمن
 * 
 * Requirements:
 * - Length: 43-128 characters
 * - Character set: [A-Z], [a-z], [0-9], "-", ".", "_", "~" (base64url)
 * - Cryptographically random
 * 
 * @param {number} length - Length of the verifier (default: 128)
 * @returns {string} Base64URL-encoded random string
 * @throws {Error} If length is invalid
 */
function generateCodeVerifier(length = 128) {
  // Validate length
  if (length < 43 || length > 128) {
    throw new Error('Code verifier length must be between 43 and 128 characters');
  }

  // Generate random bytes
  const randomBytes = crypto.randomBytes(length);
  
  // Convert to base64url format (RFC 4648 Section 5)
  // Replace +/= with -_~ for URL safety
  const verifier = randomBytes
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .substring(0, length);

  return verifier;
}

/**
 * Generate code challenge from code verifier using S256 method
 * توليد تحدي الكود من معرف التحقق
 * 
 * Method: S256 (SHA-256)
 * - GitHub requires S256, does not support 'plain' method
 * - More secure than plain text transmission
 * 
 * Formula: BASE64URL(SHA256(ASCII(code_verifier)))
 * 
 * @param {string} codeVerifier - The code verifier to hash
 * @returns {string} Base64URL-encoded SHA256 hash of the verifier
 * @throws {Error} If codeVerifier is invalid
 */
function generateCodeChallenge(codeVerifier) {
  // Validate code verifier
  if (!codeVerifier || typeof codeVerifier !== 'string') {
    throw new Error('Code verifier must be a non-empty string');
  }

  if (!validateCodeVerifier(codeVerifier)) {
    throw new Error('Invalid code verifier format');
  }

  // Calculate SHA256 hash
  const hash = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64');

  // Convert to base64url format
  const challenge = hash
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return challenge;
}

/**
 * Validate code verifier format
 * التحقق من صحة معرف التحقق
 * 
 * Checks:
 * - Length between 43 and 128 characters
 * - Contains only allowed characters: [A-Za-z0-9\-._~]
 * 
 * @param {string} codeVerifier - The code verifier to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateCodeVerifier(codeVerifier) {
  if (!codeVerifier || typeof codeVerifier !== 'string') {
    return false;
  }

  // Check length
  if (codeVerifier.length < 43 || codeVerifier.length > 128) {
    return false;
  }

  // Check character set (base64url: A-Za-z0-9-._~)
  const validPattern = /^[A-Za-z0-9\-._~]+$/;
  if (!validPattern.test(codeVerifier)) {
    return false;
  }

  return true;
}

/**
 * Verify code challenge matches code verifier
 * التحقق من تطابق تحدي الكود مع معرف التحقق
 * 
 * Used by server to validate the token exchange request
 * 
 * @param {string} codeVerifier - The code verifier from client
 * @param {string} storedCodeChallenge - The stored code challenge
 * @returns {boolean} True if they match, false otherwise
 */
function verifyCodeChallenge(codeVerifier, storedCodeChallenge) {
  try {
    const calculatedChallenge = generateCodeChallenge(codeVerifier);
    
    // Use constant-time comparison to prevent timing attacks
    // المقارنة بوقت ثابت لمنع هجمات التوقيت
    return crypto.timingSafeEqual(
      Buffer.from(calculatedChallenge),
      Buffer.from(storedCodeChallenge)
    );
  } catch (error) {
    // Invalid verifier or challenge format
    return false;
  }
}

/**
 * Generate PKCE pair (verifier and challenge)
 * توليد زوج PKCE
 * 
 * Convenience function to generate both verifier and challenge at once
 * 
 * @param {number} length - Length of the verifier (default: 128)
 * @returns {Object} Object with codeVerifier and codeChallenge
 */
function generatePKCEPair(length = 128) {
  const codeVerifier = generateCodeVerifier(length);
  const codeChallenge = generateCodeChallenge(codeVerifier);

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256' // GitHub requires S256
  };
}

module.exports = {
  generateCodeVerifier,
  generateCodeChallenge,
  validateCodeVerifier,
  verifyCodeChallenge,
  generatePKCEPair
};
