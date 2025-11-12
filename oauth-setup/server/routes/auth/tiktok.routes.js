const express = require('express');
const router = express.Router();
const tiktokController = require('../../controllers/auth/tiktok.controller');

/**
 * TikTok OAuth Routes
 * 
 * These routes handle the complete OAuth 2.0 flow for TikTok authentication:
 * - Authorization initiation
 * - OAuth callback handling
 * - Token refresh
 * - Token revocation
 * - User information retrieval
 * 
 * All routes follow security best practices as outlined in 02-SECURITY-CHECKLIST.md
 */

/**
 * @route   GET /auth/tiktok
 * @desc    Initiates TikTok OAuth authorization flow
 * @access  Public
 * 
 * This endpoint redirects the user to TikTok's authorization page.
 * PKCE and state parameters are automatically generated for security.
 */
router.get('/tiktok', tiktokController.authorize);

/**
 * @route   GET /auth/tiktok/callback
 * @desc    Handles OAuth callback from TikTok
 * @access  Public
 * 
 * This endpoint receives the authorization code from TikTok,
 * verifies the state parameter, and exchanges the code for tokens.
 * 
 * Query parameters:
 * - code: Authorization code from TikTok
 * - state: CSRF protection token
 * - error: Error code if authorization failed
 * - error_description: Human-readable error description
 */
router.get('/tiktok/callback', tiktokController.callback);

/**
 * @route   POST /auth/tiktok/refresh
 * @desc    Refreshes an expired access token
 * @access  Public
 * 
 * Body parameters:
 * - refresh_token: Valid refresh token
 * 
 * Implements automatic token rotation for security.
 */
router.post('/tiktok/refresh', tiktokController.refresh);

/**
 * @route   POST /auth/tiktok/revoke
 * @desc    Revokes TikTok access and refresh tokens
 * @access  Public
 * 
 * Body parameters:
 * - token: Token to revoke (access or refresh token)
 */
router.post('/tiktok/revoke', tiktokController.revoke);

/**
 * @route   GET /auth/tiktok/user
 * @desc    Gets authenticated user information from TikTok
 * @access  Protected
 * 
 * Requires Bearer token in Authorization header.
 */
router.get('/tiktok/user', tiktokController.getUserInfo);

module.exports = router;
