/**
 * Redirect URI Validation Middleware
 * وسيطة التحقق من صحة URI لإعادة التوجيه
 * 
 * Prevents open redirect vulnerabilities by validating redirect URIs
 * يمنع ثغرات إعادة التوجيه المفتوحة من خلال التحقق من صحة URIs لإعادة التوجيه
 */

/**
 * Validate redirect URI against whitelist
 * التحقق من صحة URI لإعادة التوجيه مقابل القائمة البيضاء
 * 
 * OWASP: Open redirect prevention requires exact string matching
 * OWASP: يتطلب منع إعادة التوجيه المفتوحة مطابقة السلسلة الدقيقة
 * 
 * @param {string} redirectUri - The redirect URI to validate
 * @returns {boolean} True if URI is valid and whitelisted
 */
function validateRedirectUri(redirectUri) {
  if (!redirectUri || typeof redirectUri !== 'string') {
    return false;
  }

  // Get allowed redirect URIs from environment
  // الحصول على URIs المسموح بها لإعادة التوجيه من البيئة
  const allowedUris = process.env.ALLOWED_REDIRECT_URIS 
    ? process.env.ALLOWED_REDIRECT_URIS.split(',').map(uri => uri.trim())
    : [];

  // SECURITY: Use exact match, not startsWith or regex
  // الأمان: استخدم مطابقة دقيقة، وليس startsWith أو regex
  return allowedUris.includes(redirectUri);
}

/**
 * Verify protocol is secure
 * التحقق من أن البروتوكول آمن
 * 
 * In production, only https:// should be allowed
 * في الإنتاج، يجب السماح فقط بـ https://
 * In development, http://localhost is acceptable
 * في التطوير، http://localhost مقبول
 * 
 * @param {string} redirectUri - The redirect URI to check
 * @returns {boolean} True if protocol is secure
 */
function verifyProtocol(redirectUri) {
  if (!redirectUri) {
    return false;
  }

  try {
    const url = new URL(redirectUri);
    const protocol = url.protocol;
    const hostname = url.hostname;

    // Production: Require HTTPS / الإنتاج: يتطلب HTTPS
    if (process.env.NODE_ENV === 'production') {
      return protocol === 'https:';
    }

    // Development: Allow HTTPS or HTTP localhost
    // التطوير: السماح بـ HTTPS أو HTTP localhost
    if (protocol === 'https:') {
      return true;
    }

    if (protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1')) {
      return true;
    }

    return false;
  } catch (error) {
    // Invalid URL / URL غير صالح
    console.error('Invalid redirect URI format:', error.message);
    return false;
  }
}

/**
 * Express middleware to validate redirect URI
 * وسيطة Express للتحقق من صحة URI لإعادة التوجيه
 * 
 * Usage: app.get('/auth/callback', redirectValidationMiddleware, handler)
 * الاستخدام: app.get('/auth/callback', redirectValidationMiddleware, handler)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function redirectValidationMiddleware(req, res, next) {
  // Extract redirect URI from query or body
  // استخراج URI لإعادة التوجيه من الاستعلام أو الجسم
  const redirectUri = req.query.redirect_uri || req.body.redirect_uri;

  if (!redirectUri) {
    return res.status(400).json({
      success: false,
      error: 'Missing redirect_uri',
      message: 'redirect_uri parameter is required',
      message_ar: 'معامل redirect_uri مطلوب'
    });
  }

  // Validate redirect URI is in whitelist
  // التحقق من أن URI لإعادة التوجيه في القائمة البيضاء
  if (!validateRedirectUri(redirectUri)) {
    console.warn(`SECURITY: Invalid redirect URI attempted: ${redirectUri}`);
    return res.status(400).json({
      success: false,
      error: 'Invalid redirect_uri',
      message: 'The redirect_uri is not whitelisted',
      message_ar: 'redirect_uri ليس في القائمة البيضاء'
    });
  }

  // Verify protocol is secure
  // التحقق من أن البروتوكول آمن
  if (!verifyProtocol(redirectUri)) {
    console.warn(`SECURITY: Insecure redirect URI protocol: ${redirectUri}`);
    return res.status(400).json({
      success: false,
      error: 'Insecure redirect_uri',
      message: 'HTTPS is required for redirect_uri in production',
      message_ar: 'HTTPS مطلوب لـ redirect_uri في الإنتاج'
    });
  }

  // Validation passed, continue / اجتاز التحقق، تابع
  next();
}

/**
 * Validate and sanitize redirect URI for OAuth callback
 * التحقق من صحة وتعقيم URI لإعادة التوجيه لرد اتصال OAuth
 * 
 * @param {string} redirectUri - The redirect URI to validate
 * @param {string} state - OAuth state parameter
 * @param {string} code - OAuth authorization code
 * @returns {string} Sanitized redirect URI with parameters
 */
function buildSafeRedirectUrl(redirectUri, state, code) {
  if (!validateRedirectUri(redirectUri)) {
    throw new Error('Invalid redirect URI');
  }

  if (!verifyProtocol(redirectUri)) {
    throw new Error('Insecure redirect URI protocol');
  }

  try {
    const url = new URL(redirectUri);
    
    // Add OAuth parameters / إضافة معاملات OAuth
    if (state) {
      url.searchParams.append('state', state);
    }
    
    if (code) {
      url.searchParams.append('code', code);
    }

    return url.toString();
  } catch (error) {
    throw new Error('Failed to build redirect URL');
  }
}

/**
 * Check if redirect URI is localhost (for development)
 * تحقق مما إذا كان URI لإعادة التوجيه هو localhost (للتطوير)
 * 
 * @param {string} redirectUri - The redirect URI to check
 * @returns {boolean} True if URI is localhost
 */
function isLocalhostUri(redirectUri) {
  try {
    const url = new URL(redirectUri);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch (error) {
    return false;
  }
}

/**
 * Get allowed redirect URIs from environment
 * الحصول على URIs المسموح بها لإعادة التوجيه من البيئة
 * 
 * @returns {string[]} Array of allowed redirect URIs
 */
function getAllowedRedirectUris() {
  const allowedUris = process.env.ALLOWED_REDIRECT_URIS 
    ? process.env.ALLOWED_REDIRECT_URIS.split(',').map(uri => uri.trim())
    : [];
  
  return allowedUris;
}

module.exports = {
  validateRedirectUri,
  verifyProtocol,
  redirectValidationMiddleware,
  buildSafeRedirectUrl,
  isLocalhostUri,
  getAllowedRedirectUris
};
