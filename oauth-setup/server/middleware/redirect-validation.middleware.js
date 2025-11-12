/**
 * Redirect URI Validation Middleware
 * 
 * التحقق من صحة عنوان URL للإعادة توجيه
 * Strict redirect URI validation to prevent open redirect attacks
 * 
 * Security measures:
 * - Exact match validation ONLY (no wildcards)
 * - Whitelist from environment variables
 * - Protocol verification (https in production)
 * - Reject external domains
 */

const url = require('url');
const { logSecurityViolation } = require('../utils/logger.utils');

/**
 * Get allowed redirect URIs from environment
 * الحصول على عناوين URL المسموح بها للإعادة توجيه
 * 
 * @returns {Array<string>} Array of allowed URIs
 */
function getAllowedRedirectUris() {
  const envUris = process.env.ALLOWED_REDIRECT_URIS || '';
  return envUris.split(',').map(uri => uri.trim()).filter(Boolean);
}

/**
 * Validate redirect URI
 * التحقق من صحة URI للإعادة توجيه
 * 
 * @param {string} redirectUri - URI to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateRedirectUri(redirectUri) {
  if (!redirectUri || typeof redirectUri !== 'string') {
    return false;
  }

  try {
    // Parse URI
    const parsedUri = url.parse(redirectUri);

    // Check protocol
    if (!verifyProtocol(parsedUri.protocol)) {
      return false;
    }

    // Check if URI is whitelisted
    if (!isWhitelisted(redirectUri)) {
      return false;
    }

    return true;

  } catch (error) {
    return false;
  }
}

/**
 * Check if URI is in whitelist
 * التحقق من وجود URI في القائمة البيضاء
 * 
 * Uses exact match - no wildcards or pattern matching
 * 
 * @param {string} redirectUri - URI to check
 * @returns {boolean} True if whitelisted
 */
function isWhitelisted(redirectUri) {
  const allowedUris = getAllowedRedirectUris();
  
  if (allowedUris.length === 0) {
    console.warn('[Security] No redirect URIs configured in ALLOWED_REDIRECT_URIS');
    return false;
  }

  // Exact match only - no wildcards
  // مطابقة تامة فقط - لا توجد أحرف بدل
  return allowedUris.includes(redirectUri);
}

/**
 * Verify protocol is secure
 * التحقق من أن البروتوكول آمن
 * 
 * @param {string} protocol - Protocol to verify (e.g., 'http:', 'https:')
 * @returns {boolean} True if protocol is allowed
 */
function verifyProtocol(protocol) {
  const isProduction = process.env.NODE_ENV === 'production';
  const enforceHttps = process.env.ENFORCE_HTTPS === 'true';

  // In production or when ENFORCE_HTTPS is true, only allow https
  if (isProduction || enforceHttps) {
    return protocol === 'https:';
  }

  // In development, allow both http and https
  return protocol === 'http:' || protocol === 'https:';
}

/**
 * Middleware to validate redirect_uri parameter
 * البرمجية الوسيطة للتحقق من معامل redirect_uri
 * 
 * Validates redirect_uri in query parameters or request body
 */
function redirectValidationMiddleware(req, res, next) {
  const redirectUri = req.query.redirect_uri || req.body.redirect_uri;

  if (!redirectUri) {
    // No redirect_uri provided
    // May be optional for some endpoints
    return next();
  }

  if (!validateRedirectUri(redirectUri)) {
    // Invalid or not whitelisted redirect URI
    logSecurityViolation('INVALID_REDIRECT_URI', {
      redirectUri,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'Invalid redirect_uri parameter'
    });
  }

  // Store validated redirect URI in request for later use
  req.validatedRedirectUri = redirectUri;
  next();
}

/**
 * Strict redirect validation middleware (requires redirect_uri)
 * البرمجية الوسيطة للتحقق الصارم (يتطلب redirect_uri)
 */
function strictRedirectValidationMiddleware(req, res, next) {
  const redirectUri = req.query.redirect_uri || req.body.redirect_uri;

  if (!redirectUri) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'Missing redirect_uri parameter'
    });
  }

  if (!validateRedirectUri(redirectUri)) {
    logSecurityViolation('INVALID_REDIRECT_URI', {
      redirectUri,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'Invalid redirect_uri parameter'
    });
  }

  req.validatedRedirectUri = redirectUri;
  next();
}

/**
 * Validate callback state parameter
 * التحقق من معامل الحالة في الاستدعاء
 * 
 * Prevents CSRF attacks by validating state parameter
 * 
 * @param {string} state - State from callback
 * @param {string} sessionState - State stored in session
 * @returns {boolean} True if state is valid
 */
function validateState(state, sessionState) {
  if (!state || !sessionState) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  const crypto = require('crypto');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(state),
      Buffer.from(sessionState)
    );
  } catch (error) {
    return false;
  }
}

module.exports = {
  validateRedirectUri,
  isWhitelisted,
  verifyProtocol,
  redirectValidationMiddleware,
  strictRedirectValidationMiddleware,
  validateState,
  getAllowedRedirectUris
};
