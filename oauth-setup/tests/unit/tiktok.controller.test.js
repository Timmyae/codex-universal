const httpMocks = require('node-mocks-http');
const tiktokController = require('../../server/controllers/auth/tiktok.controller');
const tiktokConfig = require('../../server/config/providers/tiktok.config');
const { generateCodeVerifier, generateCodeChallenge } = require('../../server/utils/pkce.utils');

/**
 * Unit Tests for TikTok OAuth Controller
 * 
 * Tests cover all OAuth flows and security features:
 * - Authorization initiation with PKCE
 * - Callback handling with state verification
 * - Token refresh with rotation
 * - Token revocation
 * - User info retrieval
 * 
 * Security validation per 02-SECURITY-CHECKLIST.md
 */

describe('TikTok OAuth Controller', () => {
  beforeEach(() => {
    // Clear controller storage before each test
    tiktokController._clearStorage();
  });

  describe('authorize', () => {
    it('should redirect to TikTok authorization URL with correct parameters', async () => {
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/auth/tiktok'
      });
      const res = httpMocks.createResponse();
      
      // Mock redirect
      res.redirect = jest.fn();
      
      await tiktokController.authorize(req, res);
      
      expect(res.redirect).toHaveBeenCalled();
      const redirectUrl = res.redirect.mock.calls[0][0];
      expect(redirectUrl).toContain(tiktokConfig.authorizationUrl);
      expect(redirectUrl).toContain('client_key=');
      expect(redirectUrl).toContain('response_type=code');
      expect(redirectUrl).toContain('state=');
      expect(redirectUrl).toContain('code_challenge=');
      expect(redirectUrl).toContain('code_challenge_method=S256');
    });

    it('should set session cookie', async () => {
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/auth/tiktok'
      });
      const res = httpMocks.createResponse();
      res.redirect = jest.fn();
      res.cookie = jest.fn();
      
      await tiktokController.authorize(req, res);
      
      expect(res.cookie).toHaveBeenCalledWith(
        'tiktok_session',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax'
        })
      );
    });

    it('should include all required scopes', async () => {
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/auth/tiktok'
      });
      const res = httpMocks.createResponse();
      res.redirect = jest.fn();
      
      await tiktokController.authorize(req, res);
      
      const redirectUrl = res.redirect.mock.calls[0][0];
      const url = new URL(redirectUrl);
      const scopes = url.searchParams.get('scope');
      
      expect(scopes).toContain('user.info.basic');
      expect(scopes).toContain('video.list');
      expect(scopes).toContain('video.upload');
    });

    it('should handle errors gracefully', async () => {
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/auth/tiktok'
      });
      const res = httpMocks.createResponse();
      
      // Force an error by breaking cookie function
      res.cookie = () => {
        throw new Error('Cookie error');
      };
      
      await tiktokController.authorize(req, res);
      
      const data = res._getJSONData();
      expect(res.statusCode).toBe(500);
      expect(data.error).toBe('server_error');
    });
  });

  describe('callback', () => {
    it('should return error if authorization failed', async () => {
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/auth/tiktok/callback',
        query: {
          error: 'access_denied',
          error_description: 'User denied access'
        }
      });
      const res = httpMocks.createResponse();
      
      await tiktokController.callback(req, res);
      
      const data = res._getJSONData();
      expect(res.statusCode).toBe(400);
      expect(data.error).toBe('access_denied');
      expect(data.error_description).toBe('User denied access');
    });

    it('should return error if code is missing', async () => {
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/auth/tiktok/callback',
        query: {
          state: 'test-state'
        }
      });
      const res = httpMocks.createResponse();
      
      await tiktokController.callback(req, res);
      
      const data = res._getJSONData();
      expect(res.statusCode).toBe(400);
      expect(data.error).toBe('invalid_request');
    });

    it('should return error if state is missing', async () => {
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/auth/tiktok/callback',
        query: {
          code: 'test-code'
        }
      });
      const res = httpMocks.createResponse();
      
      await tiktokController.callback(req, res);
      
      const data = res._getJSONData();
      expect(res.statusCode).toBe(400);
      expect(data.error).toBe('invalid_request');
    });

    it('should return error if session not found', async () => {
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/auth/tiktok/callback',
        query: {
          code: 'test-code',
          state: 'test-state'
        },
        cookies: {}
      });
      const res = httpMocks.createResponse();
      
      await tiktokController.callback(req, res);
      
      const data = res._getJSONData();
      expect(res.statusCode).toBe(400);
      expect(data.error).toBe('invalid_request');
      expect(data.error_description).toContain('Session not found');
    });

    it('should verify state parameter for CSRF protection', async () => {
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/auth/tiktok/callback',
        query: {
          code: 'test-code',
          state: 'wrong-state'
        },
        cookies: {
          tiktok_session: 'test-session-id'
        }
      });
      const res = httpMocks.createResponse();
      
      // Set up a session with different state
      tiktokController._setTestSession('test-session-id', {
        state: 'correct-state',
        codeVerifier: 'test-verifier',
        createdAt: Date.now()
      });
      
      await tiktokController.callback(req, res);
      
      const data = res._getJSONData();
      expect(res.statusCode).toBe(400);
      expect(data.error).toBe('invalid_request');
      expect(data.error_description).toContain('State parameter mismatch');
    });
  });

  describe('refresh', () => {
    it('should return error if refresh_token is missing', async () => {
      const req = httpMocks.createRequest({
        method: 'POST',
        url: '/auth/tiktok/refresh',
        body: {}
      });
      const res = httpMocks.createResponse();
      
      await tiktokController.refresh(req, res);
      
      const data = res._getJSONData();
      expect(res.statusCode).toBe(400);
      expect(data.error).toBe('invalid_request');
      expect(data.error_description).toContain('refresh_token is required');
    });

    it('should return error for invalid refresh token', async () => {
      const req = httpMocks.createRequest({
        method: 'POST',
        url: '/auth/tiktok/refresh',
        body: {
          refresh_token: 'invalid-token'
        }
      });
      const res = httpMocks.createResponse();
      
      await tiktokController.refresh(req, res);
      
      const data = res._getJSONData();
      expect(res.statusCode).toBe(400);
      expect(data.error).toBe('invalid_grant');
    });
  });

  describe('revoke', () => {
    it('should return error if token is missing', async () => {
      const req = httpMocks.createRequest({
        method: 'POST',
        url: '/auth/tiktok/revoke',
        body: {}
      });
      const res = httpMocks.createResponse();
      
      await tiktokController.revoke(req, res);
      
      const data = res._getJSONData();
      expect(res.statusCode).toBe(400);
      expect(data.error).toBe('invalid_request');
    });

    it('should successfully revoke a token', async () => {
      const req = httpMocks.createRequest({
        method: 'POST',
        url: '/auth/tiktok/revoke',
        body: {
          token: 'test-token'
        }
      });
      const res = httpMocks.createResponse();
      
      await tiktokController.revoke(req, res);
      
      const data = res._getJSONData();
      expect(res.statusCode).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('getUserInfo', () => {
    it('should return error if authorization header is missing', async () => {
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/auth/tiktok/user',
        headers: {}
      });
      const res = httpMocks.createResponse();
      
      await tiktokController.getUserInfo(req, res);
      
      const data = res._getJSONData();
      expect(res.statusCode).toBe(401);
      expect(data.error).toBe('unauthorized');
    });

    it('should return error if authorization header is invalid', async () => {
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/auth/tiktok/user',
        headers: {
          authorization: 'Invalid header'
        }
      });
      const res = httpMocks.createResponse();
      
      await tiktokController.getUserInfo(req, res);
      
      const data = res._getJSONData();
      expect(res.statusCode).toBe(401);
      expect(data.error).toBe('unauthorized');
    });

    it('should return error if TikTok token not found', async () => {
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/auth/tiktok/user',
        headers: {
          authorization: 'Bearer test-token'
        }
      });
      const res = httpMocks.createResponse();
      
      await tiktokController.getUserInfo(req, res);
      
      const data = res._getJSONData();
      expect(res.statusCode).toBe(401);
      expect(data.error).toBe('unauthorized');
    });
  });

  describe('Security', () => {
    it('should generate unique state for each authorization', async () => {
      const req1 = httpMocks.createRequest();
      const res1 = httpMocks.createResponse();
      res1.redirect = jest.fn();
      
      const req2 = httpMocks.createRequest();
      const res2 = httpMocks.createResponse();
      res2.redirect = jest.fn();
      
      await tiktokController.authorize(req1, res1);
      await tiktokController.authorize(req2, res2);
      
      const url1 = new URL(res1.redirect.mock.calls[0][0]);
      const url2 = new URL(res2.redirect.mock.calls[0][0]);
      
      const state1 = url1.searchParams.get('state');
      const state2 = url2.searchParams.get('state');
      
      expect(state1).not.toBe(state2);
    });

    it('should generate unique code_challenge for each authorization', async () => {
      const req1 = httpMocks.createRequest();
      const res1 = httpMocks.createResponse();
      res1.redirect = jest.fn();
      
      const req2 = httpMocks.createRequest();
      const res2 = httpMocks.createResponse();
      res2.redirect = jest.fn();
      
      await tiktokController.authorize(req1, res1);
      await tiktokController.authorize(req2, res2);
      
      const url1 = new URL(res1.redirect.mock.calls[0][0]);
      const url2 = new URL(res2.redirect.mock.calls[0][0]);
      
      const challenge1 = url1.searchParams.get('code_challenge');
      const challenge2 = url2.searchParams.get('code_challenge');
      
      expect(challenge1).not.toBe(challenge2);
    });

    it('should use S256 challenge method', async () => {
      const req = httpMocks.createRequest();
      const res = httpMocks.createResponse();
      res.redirect = jest.fn();
      
      await tiktokController.authorize(req, res);
      
      const url = new URL(res.redirect.mock.calls[0][0]);
      const method = url.searchParams.get('code_challenge_method');
      
      expect(method).toBe('S256');
    });

    it('should set httpOnly cookie flag', async () => {
      const req = httpMocks.createRequest();
      const res = httpMocks.createResponse();
      res.redirect = jest.fn();
      res.cookie = jest.fn();
      
      await tiktokController.authorize(req, res);
      
      const cookieCall = res.cookie.mock.calls[0];
      expect(cookieCall[2].httpOnly).toBe(true);
    });

    it('should set sameSite cookie attribute', async () => {
      const req = httpMocks.createRequest();
      const res = httpMocks.createResponse();
      res.redirect = jest.fn();
      res.cookie = jest.fn();
      
      await tiktokController.authorize(req, res);
      
      const cookieCall = res.cookie.mock.calls[0];
      expect(cookieCall[2].sameSite).toBe('lax');
    });
  });
});
