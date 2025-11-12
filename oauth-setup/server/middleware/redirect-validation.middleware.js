/**
 * Redirect URI validation middleware for OAuth 2.0
 * Prevents open redirect vulnerabilities
 */

// Whitelist of allowed redirect URIs
// In production, load from database or environment variables
const allowedRedirectUris = [
  'http://localhost:3000/callback',
  'http://localhost:8080/callback',
  'https://example.com/oauth/callback',
  'myapp://oauth/callback'
];

/**
 * Validate redirect URI against whitelist
 * @param {string} redirectUri - The redirect URI to validate
 * @returns {boolean} True if URI is valid
 */
function isValidRedirectUri(redirectUri) {
  if (!redirectUri || typeof redirectUri !== 'string') {
    return false;
  }
  
  // Check exact match first
  if (allowedRedirectUris.includes(redirectUri)) {
    return true;
  }
  
  // Check for pattern matches (e.g., subdomains)
  try {
    const url = new URL(redirectUri);
    
    // Additional validation rules
    // 1. Must use HTTPS in production (except localhost)
    if (process.env.NODE_ENV === 'production' && url.protocol === 'http:' && url.hostname !== 'localhost') {
      return false;
    }
    
    // 2. No fragments allowed in redirect URI
    if (url.hash) {
      return false;
    }
    
    // 3. Check against patterns
    for (const allowedUri of allowedRedirectUris) {
      if (matchesPattern(redirectUri, allowedUri)) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    // Invalid URL format
    return false;
  }
}

/**
 * Check if URI matches a pattern (simple wildcard support)
 * @param {string} uri - URI to check
 * @param {string} pattern - Pattern to match against
 * @returns {boolean} True if matches
 */
function matchesPattern(uri, pattern) {
  if (pattern.includes('*')) {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(uri);
  }
  return uri === pattern;
}

/**
 * Add redirect URI to whitelist (for dynamic registration)
 * @param {string} redirectUri - URI to add
 * @returns {boolean} True if added successfully
 */
function addRedirectUri(redirectUri) {
  if (!redirectUri || typeof redirectUri !== 'string') {
    return false;
  }
  
  try {
    new URL(redirectUri); // Validate URL format
    
    if (!allowedRedirectUris.includes(redirectUri)) {
      allowedRedirectUris.push(redirectUri);
    }
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Remove redirect URI from whitelist
 * @param {string} redirectUri - URI to remove
 * @returns {boolean} True if removed successfully
 */
function removeRedirectUri(redirectUri) {
  const index = allowedRedirectUris.indexOf(redirectUri);
  if (index > -1) {
    allowedRedirectUris.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Get all allowed redirect URIs
 * @returns {Array<string>} List of allowed URIs
 */
function getAllowedRedirectUris() {
  return [...allowedRedirectUris];
}

/**
 * Express middleware for redirect URI validation
 */
function validateRedirectUri(req, res, next) {
  const redirectUri = req.query.redirect_uri || req.body.redirect_uri;
  
  if (!redirectUri) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'redirect_uri parameter is required'
    });
  }
  
  if (!isValidRedirectUri(redirectUri)) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'Invalid redirect_uri'
    });
  }
  
  // Store validated redirect URI for later use
  req.validatedRedirectUri = redirectUri;
  next();
}

module.exports = {
  isValidRedirectUri,
  addRedirectUri,
  removeRedirectUri,
  getAllowedRedirectUris,
  validateRedirectUri,
  matchesPattern
};
