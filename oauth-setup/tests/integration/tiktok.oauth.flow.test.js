const request = require('supertest');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const tiktokRoutes = require('../../server/routes/auth/tiktok.routes');
const tiktokController = require('../../server/controllers/auth/tiktok.controller');

/**
 * Integration Tests for TikTok OAuth Flow
 * 
 * Tests the complete OAuth flow from start to finish:
 * - Authorization initiation
 * - Callback handling
 * - Token management
 * - Error scenarios
 * 
 * These tests verify proper integration of routes, controllers, and middleware
 * as specified in 01-OAUTH-SPEC.md
 */

describe('TikTok OAuth Integration Tests', () => {
  let app;

  beforeEach(() => {
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Session middleware
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true
      }
    }));
    
    // Cookie parser
    app.use(cookieParser());
    
    // Mount TikTok routes
    app.use('/auth', tiktokRoutes);
    
    // Clear controller storage
    tiktokController._clearStorage();
  });

  describe('Authorization Flow', () => {
    it('should initiate authorization and redirect to TikTok', async () => {
      const response = await request(app)
        .get('/auth/tiktok')
        .expect(302);

      expect(response.headers.location).toBeDefined();
      expect(response.headers.location).toContain('tiktok.com');
      expect(response.headers.location).toContain('client_key=');
      expect(response.headers.location).toContain('code_challenge=');
      expect(response.headers.location).toContain('state=');
    });

    it('should set session cookie during authorization', async () => {
      const response = await request(app)
        .get('/auth/tiktok')
        .expect(302);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(cookie => cookie.startsWith('tiktok_session='))).toBe(true);
    });

    it('should include PKCE parameters in authorization URL', async () => {
      const response = await request(app)
        .get('/auth/tiktok')
        .expect(302);

      const redirectUrl = response.headers.location;
      expect(redirectUrl).toContain('code_challenge=');
      expect(redirectUrl).toContain('code_challenge_method=S256');
    });

    it('should include all required scopes', async () => {
      const response = await request(app)
        .get('/auth/tiktok')
        .expect(302);

      const redirectUrl = response.headers.location;
      const url = new URL(redirectUrl);
      const scopes = url.searchParams.get('scope');
      
      expect(scopes).toContain('user.info.basic');
      expect(scopes).toContain('video.list');
      expect(scopes).toContain('video.upload');
    });

    it('should include redirect_uri parameter', async () => {
      const response = await request(app)
        .get('/auth/tiktok')
        .expect(302);

      const redirectUrl = response.headers.location;
      expect(redirectUrl).toContain('redirect_uri=');
    });
  });

  describe('Callback Handling', () => {
    it('should return error when authorization fails', async () => {
      const response = await request(app)
        .get('/auth/tiktok/callback')
        .query({
          error: 'access_denied',
          error_description: 'User denied authorization'
        })
        .expect(400);

      expect(response.body.error).toBe('access_denied');
      expect(response.body.error_description).toBe('User denied authorization');
    });

    it('should return error when code is missing', async () => {
      const response = await request(app)
        .get('/auth/tiktok/callback')
        .query({
          state: 'test-state'
        })
        .expect(400);

      expect(response.body.error).toBe('invalid_request');
      expect(response.body.error_description).toContain('code');
    });

    it('should return error when state is missing', async () => {
      const response = await request(app)
        .get('/auth/tiktok/callback')
        .query({
          code: 'test-code'
        })
        .expect(400);

      expect(response.body.error).toBe('invalid_request');
      expect(response.body.error_description).toContain('state');
    });

    it('should return error when session is not found', async () => {
      const response = await request(app)
        .get('/auth/tiktok/callback')
        .query({
          code: 'test-code',
          state: 'test-state'
        })
        .expect(400);

      expect(response.body.error).toBe('invalid_request');
      expect(response.body.error_description).toContain('Session');
    });
  });

  describe('Token Refresh', () => {
    it('should return error when refresh_token is missing', async () => {
      const response = await request(app)
        .post('/auth/tiktok/refresh')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('invalid_request');
      expect(response.body.error_description).toContain('refresh_token is required');
    });

    it('should return error for invalid refresh_token', async () => {
      const response = await request(app)
        .post('/auth/tiktok/refresh')
        .send({
          refresh_token: 'invalid-token-123'
        })
        .expect(400);

      expect(response.body.error).toBe('invalid_grant');
    });

    it('should accept JSON content type', async () => {
      const response = await request(app)
        .post('/auth/tiktok/refresh')
        .set('Content-Type', 'application/json')
        .send({
          refresh_token: 'test-token'
        })
        .expect(400);

      expect(response.body).toBeDefined();
    });
  });

  describe('Token Revocation', () => {
    it('should return error when token is missing', async () => {
      const response = await request(app)
        .post('/auth/tiktok/revoke')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('invalid_request');
    });

    it('should successfully revoke a token', async () => {
      const response = await request(app)
        .post('/auth/tiktok/revoke')
        .send({
          token: 'test-token-to-revoke'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should accept form-urlencoded content type', async () => {
      const response = await request(app)
        .post('/auth/tiktok/revoke')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('token=test-token')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('User Info Endpoint', () => {
    it('should return error when authorization header is missing', async () => {
      const response = await request(app)
        .get('/auth/tiktok/user')
        .expect(401);

      expect(response.body.error).toBe('unauthorized');
    });

    it('should return error for invalid authorization header format', async () => {
      const response = await request(app)
        .get('/auth/tiktok/user')
        .set('Authorization', 'InvalidFormat token123')
        .expect(401);

      expect(response.body.error).toBe('unauthorized');
    });

    it('should accept Bearer token format', async () => {
      const response = await request(app)
        .get('/auth/tiktok/user')
        .set('Authorization', 'Bearer valid-token')
        .expect(401); // Will fail due to no user data, but validates format

      expect(response.body.error).toBe('unauthorized');
    });
  });

  describe('Security Features', () => {
    it('should use httpOnly cookies', async () => {
      const response = await request(app)
        .get('/auth/tiktok')
        .expect(302);

      const cookies = response.headers['set-cookie'];
      const sessionCookie = cookies.find(c => c.startsWith('tiktok_session='));
      
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain('HttpOnly');
    });

    it('should implement CSRF protection with state parameter', async () => {
      const authResponse = await request(app)
        .get('/auth/tiktok')
        .expect(302);

      const redirectUrl = authResponse.headers.location;
      const url = new URL(redirectUrl);
      const state = url.searchParams.get('state');
      
      expect(state).toBeDefined();
      expect(state.length).toBeGreaterThan(20);
    });

    it('should validate redirect_uri', async () => {
      const response = await request(app)
        .get('/auth/tiktok')
        .expect(302);

      const redirectUrl = response.headers.location;
      const url = new URL(redirectUrl);
      const redirectUri = url.searchParams.get('redirect_uri');
      
      expect(redirectUri).toBeDefined();
      expect(redirectUri).toMatch(/^https?:\/\//);
    });

    it('should use PKCE S256 method', async () => {
      const response = await request(app)
        .get('/auth/tiktok')
        .expect(302);

      const redirectUrl = response.headers.location;
      const url = new URL(redirectUrl);
      const method = url.searchParams.get('code_challenge_method');
      
      expect(method).toBe('S256');
    });

    it('should generate unique state for each request', async () => {
      const response1 = await request(app)
        .get('/auth/tiktok')
        .expect(302);

      const response2 = await request(app)
        .get('/auth/tiktok')
        .expect(302);

      const url1 = new URL(response1.headers.location);
      const url2 = new URL(response2.headers.location);
      
      const state1 = url1.searchParams.get('state');
      const state2 = url2.searchParams.get('state');
      
      expect(state1).not.toBe(state2);
    });

    it('should generate unique code_challenge for each request', async () => {
      const response1 = await request(app)
        .get('/auth/tiktok')
        .expect(302);

      const response2 = await request(app)
        .get('/auth/tiktok')
        .expect(302);

      const url1 = new URL(response1.headers.location);
      const url2 = new URL(response2.headers.location);
      
      const challenge1 = url1.searchParams.get('code_challenge');
      const challenge2 = url2.searchParams.get('code_challenge');
      
      expect(challenge1).not.toBe(challenge2);
    });
  });

  describe('Route Configuration', () => {
    it('should have GET /auth/tiktok route', async () => {
      await request(app)
        .get('/auth/tiktok')
        .expect(302);
    });

    it('should have GET /auth/tiktok/callback route', async () => {
      await request(app)
        .get('/auth/tiktok/callback')
        .expect(400); // Expects 400 due to missing params, but route exists
    });

    it('should have POST /auth/tiktok/refresh route', async () => {
      await request(app)
        .post('/auth/tiktok/refresh')
        .expect(400); // Expects 400 due to missing params, but route exists
    });

    it('should have POST /auth/tiktok/revoke route', async () => {
      await request(app)
        .post('/auth/tiktok/revoke')
        .expect(400); // Expects 400 due to missing params, but route exists
    });

    it('should have GET /auth/tiktok/user route', async () => {
      await request(app)
        .get('/auth/tiktok/user')
        .expect(401); // Expects 401 due to no auth, but route exists
    });

    it('should return 404 for non-existent routes', async () => {
      await request(app)
        .get('/auth/tiktok/nonexistent')
        .expect(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/auth/tiktok/refresh')
        .set('Content-Type', 'application/json')
        .send('{"invalid json')
        .expect(400);
    });

    it('should return proper error format', async () => {
      const response = await request(app)
        .post('/auth/tiktok/refresh')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('error_description');
    });

    it('should handle callback errors from TikTok', async () => {
      const response = await request(app)
        .get('/auth/tiktok/callback')
        .query({
          error: 'server_error',
          error_description: 'TikTok encountered an error'
        })
        .expect(400);

      expect(response.body.error).toBe('server_error');
      expect(response.body.error_description).toBe('TikTok encountered an error');
    });
  });

  describe('Content Type Handling', () => {
    it('should accept application/json for refresh', async () => {
      const response = await request(app)
        .post('/auth/tiktok/refresh')
        .set('Content-Type', 'application/json')
        .send({ refresh_token: 'test' });

      expect(response.status).toBeLessThan(500);
    });

    it('should accept application/x-www-form-urlencoded for revoke', async () => {
      const response = await request(app)
        .post('/auth/tiktok/revoke')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('token=test');

      expect(response.status).toBeLessThan(500);
    });
  });
});
