/**
 * Authentication Controller
 * 
 * متحكم المصادقة
 * OAuth authentication flow with PKCE and token rotation
 */

const axios = require('axios');
const { generatePKCEPair, verifyCodeChallenge } = require('../utils/pkce.utils');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  rotateRefreshToken,
  verifyToken,
  revokeToken
} = require('../utils/token.utils');
const { generateSecureRandom } = require('../utils/crypto.utils');
const { 
  logAuthAttempt, 
  logTokenOperation,
  logSecurityViolation 
} = require('../utils/logger.utils');
const { oauthConfig, getGitHubAuthUrl } = require('../config/oauth.config');

/**
 * Initialize OAuth flow
 * بدء تدفق OAuth
 * 
 * Generates PKCE parameters and redirects to GitHub authorization
 */
async function initiateAuth(req, res) {
  try {
    const { redirect_uri } = req.query;

    // Generate CSRF state token
    // توليد رمز الحالة لمنع CSRF
    const state = generateSecureRandom(32);

    // Generate PKCE pair if enabled
    let codeChallenge = null;
    let codeVerifier = null;

    if (oauthConfig.enablePKCE) {
      const pkcePair = generatePKCEPair();
      codeVerifier = pkcePair.codeVerifier;
      codeChallenge = pkcePair.codeChallenge;

      // Store code_verifier in session (NEVER in localStorage)
      // تخزين code_verifier في الجلسة (أبداً في localStorage)
      req.session.codeVerifier = codeVerifier;
      
      logTokenOperation('generate', 'pkce', {
        codeChallengeMethod: 'S256'
      });
    }

    // Store state in session for validation
    req.session.oauthState = state;

    // Store redirect URI if provided
    if (redirect_uri) {
      req.session.redirectUri = redirect_uri;
    }

    // Save session before redirect
    req.session.save((err) => {
      if (err) {
        console.error('[Auth] Session save error:', err);
        return res.status(500).json({
          error: 'server_error',
          error_description: 'Failed to initialize authentication'
        });
      }

      // Build authorization URL
      const authUrl = getGitHubAuthUrl(
        state, 
        codeChallenge,
        redirect_uri || oauthConfig.github.callbackUrl
      );

      // Redirect to GitHub authorization page
      res.redirect(authUrl);
    });

  } catch (error) {
    console.error('[Auth] Initiate error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to initialize authentication'
    });
  }
}

/**
 * Handle OAuth callback
 * معالجة استدعاء OAuth
 * 
 * Validates state, exchanges code for tokens with PKCE verification
 */
async function handleCallback(req, res) {
  try {
    const { code, state, error, error_description } = req.query;

    // Check for OAuth errors
    if (error) {
      logAuthAttempt(false, 'unknown', 'github', { error, error_description });
      return res.status(400).json({
        error,
        error_description: error_description || 'OAuth authorization failed'
      });
    }

    // Validate required parameters
    if (!code || !state) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing code or state parameter'
      });
    }

    // Validate state (CSRF protection)
    if (state !== req.session.oauthState) {
      logSecurityViolation('INVALID_OAUTH_STATE', {
        expected: req.session.oauthState,
        received: state,
        ip: req.ip
      });
      
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Invalid state parameter'
      });
    }

    // Exchange authorization code for access token
    const tokenResponse = await exchangeCodeForToken(
      code,
      req.session.codeVerifier
    );

    if (!tokenResponse) {
      logAuthAttempt(false, 'unknown', 'github', { reason: 'Token exchange failed' });
      return res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Failed to exchange authorization code'
      });
    }

    // Get user profile from GitHub
    const userProfile = await getUserProfile(tokenResponse.access_token);

    if (!userProfile) {
      return res.status(500).json({
        error: 'server_error',
        error_description: 'Failed to retrieve user profile'
      });
    }

    // Generate our own tokens
    const userId = userProfile.id.toString();
    const accessToken = generateAccessToken(userId, {
      username: userProfile.login,
      email: userProfile.email
    });

    const refreshTokenData = generateRefreshToken(userId);

    // Log successful authentication
    logAuthAttempt(true, userId, 'github', {
      username: userProfile.login
    });

    // Clear session data
    delete req.session.oauthState;
    delete req.session.codeVerifier;
    const redirectUri = req.session.redirectUri;
    delete req.session.redirectUri;

    // Respond with tokens
    const response = {
      access_token: accessToken,
      refresh_token: refreshTokenData.token,
      token_type: 'Bearer',
      expires_in: 900, // 15 minutes
      user: {
        id: userProfile.id,
        username: userProfile.login,
        email: userProfile.email,
        avatar_url: userProfile.avatar_url
      }
    };

    // If redirect URI was provided, redirect with tokens in URL fragment
    if (redirectUri) {
      const params = new URLSearchParams({
        access_token: accessToken,
        refresh_token: refreshTokenData.token,
        token_type: 'Bearer',
        expires_in: '900'
      });
      
      return res.redirect(`${redirectUri}#${params.toString()}`);
    }

    // Otherwise, return JSON response
    res.json(response);

  } catch (error) {
    console.error('[Auth] Callback error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Authentication failed'
    });
  }
}

/**
 * Exchange authorization code for access token
 * تبديل رمز التفويض برمز الوصول
 * 
 * @param {string} code - Authorization code
 * @param {string} codeVerifier - PKCE code verifier
 * @returns {Object|null} Token response or null
 */
async function exchangeCodeForToken(code, codeVerifier) {
  try {
    const params = {
      client_id: oauthConfig.github.clientId,
      client_secret: oauthConfig.github.clientSecret,
      code,
      redirect_uri: oauthConfig.github.callbackUrl
    };

    // Add PKCE code_verifier if enabled
    if (oauthConfig.enablePKCE && codeVerifier) {
      params.code_verifier = codeVerifier;
    }

    const response = await axios.post(
      oauthConfig.github.tokenUrl,
      params,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (response.data.error) {
      console.error('[Auth] Token exchange error:', response.data);
      return null;
    }

    return response.data;

  } catch (error) {
    console.error('[Auth] Token exchange error:', error.message);
    return null;
  }
}

/**
 * Get user profile from GitHub
 * الحصول على ملف تعريف المستخدم من GitHub
 * 
 * @param {string} accessToken - GitHub access token
 * @returns {Object|null} User profile or null
 */
async function getUserProfile(accessToken) {
  try {
    const response = await axios.get(oauthConfig.github.userUrl, {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    return response.data;

  } catch (error) {
    console.error('[Auth] User profile error:', error.message);
    return null;
  }
}

/**
 * Refresh access token
 * تجديد رمز الوصول
 * 
 * Uses refresh token to get new access token (with rotation)
 */
async function refreshAccessToken(req, res) {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing refresh_token parameter'
      });
    }

    // Rotate refresh token (one-time-use)
    const newTokens = await rotateRefreshToken(refresh_token);

    if (!newTokens) {
      logSecurityViolation('INVALID_REFRESH_TOKEN', {
        ip: req.ip,
        userAgent: req.get('user-agent')
      });

      return res.status(401).json({
        error: 'invalid_grant',
        error_description: 'Invalid or expired refresh token'
      });
    }

    logTokenOperation('rotate', 'refresh', {
      userId: req.user?.userId
    });

    res.json({
      access_token: newTokens.accessToken,
      refresh_token: newTokens.refreshToken,
      token_type: 'Bearer',
      expires_in: 900 // 15 minutes
    });

  } catch (error) {
    console.error('[Auth] Refresh token error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to refresh token'
    });
  }
}

/**
 * Revoke token (logout)
 * إبطال الرمز (تسجيل الخروج)
 */
async function revokeTokenEndpoint(req, res) {
  try {
    const { token, token_type_hint } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing token parameter'
      });
    }

    // Revoke token
    revokeToken(token);

    logTokenOperation('revoke', token_type_hint || 'unknown', {
      userId: req.user?.userId
    });

    res.json({
      success: true,
      message: 'Token revoked successfully'
    });

  } catch (error) {
    console.error('[Auth] Revoke token error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to revoke token'
    });
  }
}

/**
 * Get current user info
 * الحصول على معلومات المستخدم الحالي
 */
async function getCurrentUser(req, res) {
  try {
    // User info is attached by authMiddleware
    if (!req.user) {
      return res.status(401).json({
        error: 'unauthorized',
        error_description: 'No user authenticated'
      });
    }

    res.json({
      userId: req.user.userId,
      tokenId: req.user.tokenId
    });

  } catch (error) {
    console.error('[Auth] Get user error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to get user info'
    });
  }
}

module.exports = {
  initiateAuth,
  handleCallback,
  refreshAccessToken,
  revokeTokenEndpoint,
  getCurrentUser
};
