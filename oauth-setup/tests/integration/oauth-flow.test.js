/**
 * OAuth Flow Integration Tests
 * 
 * اختبارات التكامل لتدفق OAuth
 * End-to-end OAuth flow with PKCE
 */

const request = require('supertest');
const app = require('../../server/app');
const { generatePKCEPair } = require('../../server/utils/pkce.utils');
const { generateAccessToken } = require('../../server/utils/token.utils');

describe('OAuth Flow Integration - Authorization', () => {
  test('should initiate OAuth flow with PKCE', async () => {
    const response = await request(app)
      .get('/auth/github')
      .expect(302); // Redirect to GitHub

    expect(response.headers.location).toContain('https://github.com/login/oauth/authorize');
    expect(response.headers.location).toContain('code_challenge=');
    expect(response.headers.location).toContain('code_challenge_method=S256');
    expect(response.headers.location).toContain('state=');
  });

  test('should include redirect_uri in authorization URL', async () => {
    const redirectUri = 'http://localhost:3000/auth/callback';
    const response = await request(app)
      .get('/auth/github')
      .query({ redirect_uri: redirectUri })
      .expect(302);

    expect(response.headers.location).toContain(encodeURIComponent(redirectUri));
  });

  test('should reject invalid redirect_uri', async () => {
    const response = await request(app)
      .get('/auth/github')
      .query({ redirect_uri: 'http://evil.com/callback' })
      .expect(400);

    expect(response.body.error).toBe('invalid_request');
  });

  test('should store state and code_verifier in session', async () => {
    const agent = request.agent(app);
    
    const response = await agent
      .get('/auth/github')
      .expect(302);

    // Session should be set (can't easily test contents without session store access)
    expect(response.headers['set-cookie']).toBeDefined();
  });
});

describe('OAuth Flow Integration - Token Endpoints', () => {
  test('should refresh access token with valid refresh token', async () => {
    const { generateRefreshToken } = require('../../server/utils/token.utils');
    const userId = 'test_user_123';
    const refreshTokenData = generateRefreshToken(userId);

    const response = await request(app)
      .post('/auth/refresh')
      .send({ refresh_token: refreshTokenData.token })
      .expect(200);

    expect(response.body.access_token).toBeDefined();
    expect(response.body.refresh_token).toBeDefined();
    expect(response.body.token_type).toBe('Bearer');
    expect(response.body.expires_in).toBe(900);
  });

  test('should reject invalid refresh token', async () => {
    const response = await request(app)
      .post('/auth/refresh')
      .send({ refresh_token: 'invalid_token' })
      .expect(401);

    expect(response.body.error).toBe('invalid_grant');
  });

  test('should reject reused refresh token', async () => {
    const { generateRefreshToken } = require('../../server/utils/token.utils');
    const userId = 'test_user_123';
    const refreshTokenData = generateRefreshToken(userId);

    // Use token once
    await request(app)
      .post('/auth/refresh')
      .send({ refresh_token: refreshTokenData.token })
      .expect(200);

    // Try to reuse - should fail
    const response = await request(app)
      .post('/auth/refresh')
      .send({ refresh_token: refreshTokenData.token })
      .expect(401);

    expect(response.body.error).toBe('invalid_grant');
  });

  test('should revoke token successfully', async () => {
    const userId = 'test_user_123';
    const token = generateAccessToken(userId);

    const response = await request(app)
      .post('/auth/revoke')
      .send({ token, token_type_hint: 'access_token' })
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});

describe('OAuth Flow Integration - Protected Endpoints', () => {
  test('should access protected endpoint with valid token', async () => {
    const userId = 'test_user_123';
    const token = generateAccessToken(userId);

    const response = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.userId).toBe(userId);
  });

  test('should reject access without token', async () => {
    const response = await request(app)
      .get('/auth/me')
      .expect(401);

    expect(response.body.error).toBe('unauthorized');
  });

  test('should reject access with invalid token', async () => {
    const response = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid_token')
      .expect(401);

    expect(response.body.error).toBe('unauthorized');
  });

  test('should reject access with revoked token', async () => {
    const { revokeToken } = require('../../server/utils/token.utils');
    const userId = 'test_user_123';
    const token = generateAccessToken(userId);

    revokeToken(token);

    const response = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(response.body.error).toBe('unauthorized');
  });
});

describe('OAuth Flow Integration - Rate Limiting', () => {
  test('should enforce rate limiting on auth endpoints', async () => {
    const agent = request.agent(app);
    
    // Make requests up to the limit (set high in test env)
    // This is a basic check - proper rate limit testing requires more setup
    const response = await agent
      .get('/auth/github')
      .expect(302);

    expect(response.headers['ratelimit-limit']).toBeDefined();
  });
});

describe('OAuth Flow Integration - Health Check', () => {
  test('should return health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
  });
});

describe('OAuth Flow Integration - API Info', () => {
  test('should return API information', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    expect(response.body.name).toBeDefined();
    expect(response.body.endpoints).toBeDefined();
    expect(response.body.security).toBeDefined();
  });
});

describe('OAuth Flow Integration - Error Handling', () => {
  test('should return 404 for non-existent endpoint', async () => {
    const response = await request(app)
      .get('/non-existent')
      .expect(404);

    expect(response.body.error).toBe('not_found');
  });

  test('should handle malformed JSON', async () => {
    const response = await request(app)
      .post('/auth/refresh')
      .set('Content-Type', 'application/json')
      .send('invalid json')
      .expect(400);
  });
});
