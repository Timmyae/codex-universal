const tiktokConfig = require('../../../server/config/providers/tiktok.config');
const { generateAccessToken, generateRefreshToken, rotateRefreshToken, revokeToken } = require('../../utils/token.utils');
const { generateCodeVerifier, generateCodeChallenge, verifyCodeChallenge } = require('../../utils/pkce.utils');
const crypto = require('crypto');

/**
 * TikTok OAuth 2.0 Controller
 * 
 * Handles OAuth flow for TikTok authentication:
 * 1. Authorization - Redirects user to TikTok login
 * 2. Callback - Handles OAuth callback and exchanges code for tokens
 * 3. Refresh - Refreshes access token using refresh token
 * 4. Revoke - Revokes tokens
 * 
 * Security features implemented per 01-OAUTH-SPEC.md and 02-SECURITY-CHECKLIST.md:
 * - PKCE (Proof Key for Code Exchange) with S256 challenge method
 * - State parameter for CSRF protection
 * - Token rotation for refresh tokens
 * - Token expiry as per spec: JWT_ACCESS_TOKEN_EXPIRY=15m, JWT_REFRESH_TOKEN_EXPIRY=30d
 */

// In-memory storage for demo purposes (use Redis/database in production)
const authSessions = new Map();
const tiktokTokens = new Map();

/**
 * Initiates the TikTok OAuth authorization flow
 * Generates PKCE code verifier/challenge and state parameter for security
 */
const authorize = async (req, res) => {
  try {
    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    
    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store session data for callback verification
    const sessionId = crypto.randomBytes(16).toString('hex');
    authSessions.set(sessionId, {
      codeVerifier,
      state,
      createdAt: Date.now()
    });
    
    // Store session ID in cookie
    res.cookie('tiktok_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000 // 10 minutes
    });
    
    // Build authorization URL
    const authUrl = new URL(tiktokConfig.authorizationUrl);
    authUrl.searchParams.set('client_key', tiktokConfig.clientId);
    authUrl.searchParams.set('response_type', tiktokConfig.responseType);
    authUrl.searchParams.set('scope', tiktokConfig.scopes.join(','));
    authUrl.searchParams.set('redirect_uri', tiktokConfig.redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', tiktokConfig.pkce.challengeMethod);
    
    // Redirect user to TikTok authorization page
    res.redirect(authUrl.toString());
  } catch (error) {
    console.error('TikTok authorization error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to initiate TikTok authorization'
    });
  }
};

/**
 * Handles the OAuth callback from TikTok
 * Exchanges authorization code for access and refresh tokens
 */
const callback = async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    
    // Handle OAuth errors from TikTok
    if (error) {
      return res.status(400).json({
        error,
        error_description: error_description || 'TikTok authorization failed'
      });
    }
    
    // Validate required parameters
    if (!code || !state) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing authorization code or state parameter'
      });
    }
    
    // Retrieve session data
    const sessionId = req.cookies?.tiktok_session;
    if (!sessionId) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Session not found'
      });
    }
    
    const session = authSessions.get(sessionId);
    if (!session) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Invalid or expired session'
      });
    }
    
    // Verify state parameter (CSRF protection)
    if (state !== session.state) {
      authSessions.delete(sessionId);
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'State parameter mismatch'
      });
    }
    
    // Exchange authorization code for tokens with TikTok
    const tokenResponse = await exchangeCodeForTokens(code, session.codeVerifier);
    
    // Clean up session
    authSessions.delete(sessionId);
    res.clearCookie('tiktok_session');
    
    // Generate our own JWT tokens
    const userId = tokenResponse.open_id || `tiktok_${Date.now()}`;
    const accessToken = generateAccessToken(
      { 
        sub: userId, 
        provider: 'tiktok',
        tiktok_access_token: tokenResponse.access_token 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      tiktokConfig.tokens.accessTokenExpiry
    );
    
    const refreshTokenData = generateRefreshToken(userId);
    
    // Store TikTok tokens for later use
    tiktokTokens.set(userId, {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
      scope: tokenResponse.scope
    });
    
    // Return tokens to client
    res.json({
      access_token: accessToken,
      refresh_token: refreshTokenData.token,
      token_type: 'Bearer',
      expires_in: 900, // 15 minutes
      scope: tiktokConfig.scopes.join(' '),
      provider: 'tiktok'
    });
    
  } catch (error) {
    console.error('TikTok callback error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: error.message || 'Failed to complete TikTok authorization'
    });
  }
};

/**
 * Exchanges authorization code for tokens with TikTok API
 * @private
 */
async function exchangeCodeForTokens(code, codeVerifier) {
  const fetch = require('node-fetch');
  
  const params = new URLSearchParams({
    client_key: tiktokConfig.clientId,
    client_secret: tiktokConfig.clientSecret,
    code: code,
    grant_type: tiktokConfig.grantTypes.authorizationCode,
    redirect_uri: tiktokConfig.redirectUri,
    code_verifier: codeVerifier
  });
  
  const response = await fetch(tiktokConfig.tokenUrl, {
    method: 'POST',
    headers: tiktokConfig.options.tokenHeaders,
    body: params
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error_description || 'Failed to exchange code for tokens');
  }
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }
  
  return data.data || data;
}

/**
 * Refreshes an expired access token using refresh token
 * Implements token rotation for security
 */
const refresh = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'refresh_token is required'
      });
    }
    
    // Verify and rotate refresh token
    const userId = 'user_placeholder'; // Extract from token in production
    const newRefreshTokenData = rotateRefreshToken(refresh_token, userId);
    
    if (!newRefreshTokenData) {
      return res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Invalid or expired refresh_token'
      });
    }
    
    // Generate new access token
    const accessToken = generateAccessToken(
      { sub: userId, provider: 'tiktok' },
      process.env.JWT_SECRET || 'your-secret-key',
      tiktokConfig.tokens.accessTokenExpiry
    );
    
    res.json({
      access_token: accessToken,
      refresh_token: newRefreshTokenData.token,
      token_type: 'Bearer',
      expires_in: 900,
      provider: 'tiktok'
    });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to refresh token'
    });
  }
};

/**
 * Revokes TikTok access and refresh tokens
 */
const revoke = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'token is required'
      });
    }
    
    // Revoke token in our system
    revokeToken(token);
    
    // In production, also revoke token with TikTok API
    // await revokeTokenWithTikTok(token);
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Token revocation error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to revoke token'
    });
  }
};

/**
 * Gets user information from TikTok API
 */
const getUserInfo = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'unauthorized',
        error_description: 'Missing or invalid authorization header'
      });
    }
    
    // In production, extract user ID from JWT and get TikTok token
    const userId = 'user_placeholder';
    const tiktokToken = tiktokTokens.get(userId);
    
    if (!tiktokToken) {
      return res.status(401).json({
        error: 'unauthorized',
        error_description: 'TikTok token not found'
      });
    }
    
    // Fetch user info from TikTok
    const fetch = require('node-fetch');
    const response = await fetch(tiktokConfig.userInfoUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tiktokToken.accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user info from TikTok');
    }
    
    const userInfo = await response.json();
    res.json(userInfo);
    
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to get user information'
    });
  }
};

// Helper function to clear storage (for testing)
const _clearStorage = () => {
  authSessions.clear();
  tiktokTokens.clear();
};

// Helper function to set test session (for testing)
const _setTestSession = (sessionId, sessionData) => {
  authSessions.set(sessionId, sessionData);
};

module.exports = {
  authorize,
  callback,
  refresh,
  revoke,
  getUserInfo,
  _clearStorage,
  _setTestSession
};
