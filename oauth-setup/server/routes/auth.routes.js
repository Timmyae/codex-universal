/**
 * Authentication Routes
 * 
 * مسارات المصادقة
 * OAuth authentication endpoints
 */

const express = require('express');
const router = express.Router();

const {
  initiateAuth,
  handleCallback,
  refreshAccessToken,
  revokeTokenEndpoint,
  getCurrentUser
} = require('../controllers/auth.controller');

const { authMiddleware } = require('../middleware/auth.middleware');
const { redirectValidationMiddleware } = require('../middleware/redirect-validation.middleware');
const { 
  authLimiter, 
  tokenRefreshLimiter, 
  callbackLimiter 
} = require('../middleware/rate-limiter.middleware');

/**
 * @route   GET /auth/github
 * @desc    Initiate GitHub OAuth flow
 * @access  Public
 * 
 * Query params:
 * - redirect_uri (optional): Custom redirect URI after authentication
 */
router.get(
  '/github',
  authLimiter,
  redirectValidationMiddleware,
  initiateAuth
);

/**
 * @route   GET /auth/github/callback
 * @desc    Handle GitHub OAuth callback
 * @access  Public
 * 
 * Query params:
 * - code: Authorization code from GitHub
 * - state: CSRF protection state
 */
router.get(
  '/github/callback',
  callbackLimiter,
  handleCallback
);

/**
 * @route   POST /auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 * 
 * Body:
 * - refresh_token: The refresh token to use
 * 
 * Response:
 * - access_token: New access token
 * - refresh_token: New refresh token (old one is invalidated)
 * - token_type: Bearer
 * - expires_in: Token expiry in seconds
 */
router.post(
  '/refresh',
  tokenRefreshLimiter,
  refreshAccessToken
);

/**
 * @route   POST /auth/revoke
 * @desc    Revoke token (logout)
 * @access  Public
 * 
 * Body:
 * - token: Token to revoke
 * - token_type_hint (optional): Type of token (access or refresh)
 */
router.post(
  '/revoke',
  authLimiter,
  revokeTokenEndpoint
);

/**
 * @route   GET /auth/me
 * @desc    Get current user info
 * @access  Protected
 * 
 * Headers:
 * - Authorization: Bearer <access_token>
 */
router.get(
  '/me',
  authMiddleware,
  getCurrentUser
);

module.exports = router;
