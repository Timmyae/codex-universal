const crypto = require('crypto');

/**
 * PKCE (Proof Key for Code Exchange) utilities
 * RFC 7636 implementation for OAuth 2.0
 */

/**
 * Generate a cryptographically secure random code verifier
 * @param {number} length - Length of the verifier (43-128 characters)
 * @returns {string} Base64-URL encoded code verifier
 */
function generateCodeVerifier(length = 128) {
  if (length < 43 || length > 128) {
    throw new Error('Code verifier length must be between 43 and 128 characters');
  }
  
  const randomBytes = crypto.randomBytes(length);
  return base64URLEncode(randomBytes).substring(0, length);
}

/**
 * Generate code challenge from code verifier using SHA-256
 * @param {string} codeVerifier - The code verifier
 * @returns {string} Base64-URL encoded code challenge
 */
function generateCodeChallenge(codeVerifier) {
  if (!codeVerifier || typeof codeVerifier !== 'string') {
    throw new Error('Code verifier must be a non-empty string');
  }
  
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  return base64URLEncode(hash);
}

/**
 * Verify that a code verifier matches a code challenge
 * @param {string} codeVerifier - The code verifier to verify
 * @param {string} codeChallenge - The code challenge to verify against
 * @returns {boolean} True if the verifier matches the challenge
 */
function verifyCodeChallenge(codeVerifier, codeChallenge) {
  if (!codeVerifier || !codeChallenge) {
    return false;
  }
  
  try {
    const calculatedChallenge = generateCodeChallenge(codeVerifier);
    return calculatedChallenge === codeChallenge;
  } catch (error) {
    return false;
  }
}

/**
 * Base64-URL encode a buffer (without padding)
 * @param {Buffer} buffer - Buffer to encode
 * @returns {string} Base64-URL encoded string
 */
function base64URLEncode(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

module.exports = {
  generateCodeVerifier,
  generateCodeChallenge,
  verifyCodeChallenge,
  base64URLEncode
};
