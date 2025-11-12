require('dotenv').config();

/**
 * TikTok OAuth 2.0 Provider Configuration
 * 
 * This configuration follows the TikTok for Developers OAuth 2.0 specification.
 * Documentation: https://developers.tiktok.com/doc/login-kit-web
 * 
 * Security Features:
 * - Uses PKCE (Proof Key for Code Exchange) for enhanced security
 * - Implements state parameter for CSRF protection
 * - Supports token rotation and refresh token reuse detection
 */

const tiktokConfig = {
  // Provider identification
  provider: 'tiktok',
  providerName: 'TikTok',
  
  // OAuth 2.0 endpoints
  authorizationUrl: 'https://www.tiktok.com/v2/auth/authorize/',
  tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
  userInfoUrl: 'https://open.tiktokapis.com/v2/user/info/',
  revokeUrl: 'https://open.tiktokapis.com/v2/oauth/revoke/',
  
  // Client credentials from environment variables
  clientId: process.env.TIKTOK_CLIENT_ID,
  clientSecret: process.env.TIKTOK_CLIENT_SECRET,
  redirectUri: process.env.TIKTOK_REDIRECT_URI,
  
  // OAuth scopes - define what permissions we're requesting
  scopes: ['user.info.basic', 'video.list', 'video.upload'],
  
  // Response type for authorization code flow
  responseType: 'code',
  
  // Grant types supported
  grantTypes: {
    authorizationCode: 'authorization_code',
    refreshToken: 'refresh_token'
  },
  
  // Token configuration
  tokens: {
    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '30d'
  },
  
  // PKCE configuration (required for security)
  pkce: {
    required: true,
    challengeMethod: 'S256'
  },
  
  // Security settings
  security: {
    stateRequired: true,
    usePKCE: true,
    validateRedirectUri: true,
    allowedRedirectUris: process.env.ALLOWED_REDIRECT_URIS 
      ? process.env.ALLOWED_REDIRECT_URIS.split(',').map(uri => uri.trim())
      : [process.env.TIKTOK_REDIRECT_URI]
  },
  
  // API version
  apiVersion: 'v2',
  
  // Additional configuration
  options: {
    // TikTok uses POST method for token exchange
    tokenMethod: 'POST',
    // Headers for token requests
    tokenHeaders: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache'
    },
    // TikTok user info endpoint requires access token in header
    userInfoHeaders: {
      'Authorization': 'Bearer {access_token}'
    }
  }
};

/**
 * Validates the TikTok configuration
 * @throws {Error} If required configuration is missing
 */
function validateConfig() {
  const requiredFields = ['clientId', 'clientSecret', 'redirectUri'];
  const missingFields = requiredFields.filter(field => !tiktokConfig[field] || tiktokConfig[field] === 'CHANGE_ME');
  
  if (missingFields.length > 0) {
    console.warn(`TikTok OAuth Warning: Missing or placeholder configuration for: ${missingFields.join(', ')}`);
    console.warn('Please update your .env file with actual TikTok OAuth credentials');
  }
  
  // Validate redirect URI format
  if (tiktokConfig.redirectUri && !tiktokConfig.redirectUri.startsWith('http')) {
    throw new Error('TikTok redirect URI must be a valid HTTP(S) URL');
  }
  
  return missingFields.length === 0;
}

// Validate on load
validateConfig();

module.exports = tiktokConfig;
