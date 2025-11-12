/**
 * Security Tests - Attack Prevention
 * 
 * اختبارات الأمان - منع الهجمات
 * Tests for replay attacks, token reuse, and redirect injection
 */

const request = require('supertest');
const app = require('../../server/app');
const { generateAccessToken, generateRefreshToken, revokeToken } = require('../../server/utils/token.utils');

describe('Security Tests - Replay Attack Prevention', () => {
  test('should reject reused refresh token (replay attack)', async () => {
    const userId = 'test_user_123';
    const refreshTokenData = generateRefreshToken(userId);

    // Use token first time - should succeed
    const firstResponse = await request(app)
      .post('/auth/refresh')
      .send({ refresh_token: refreshTokenData.token })
      .expect(200);

    expect(firstResponse.body.access_token).toBeDefined();

    // Try to reuse same token - should fail (replay attack prevention)
    const secondResponse = await request(app)
      .post('/auth/refresh')
      .send({ refresh_token: refreshTokenData.token })
      .expect(401);

    expect(secondResponse.body.error).toBe('invalid_grant');
  });

  test('should invalidate entire token family on reuse attempt', async () => {
    const userId = 'test_user_123';
    const originalToken = generateRefreshToken(userId);

    // First rotation
    const firstRotation = await request(app)
      .post('/auth/refresh')
      .send({ refresh_token: originalToken.token })
      .expect(200);

    const newToken = firstRotation.body.refresh_token;

    // Try to reuse original token (attack detected)
    await request(app)
      .post('/auth/refresh')
      .send({ refresh_token: originalToken.token })
      .expect(401);

    // New token should also be invalidated (token family revoked)
    const attemptWithNewToken = await request(app)
      .post('/auth/refresh')
      .send({ refresh_token: newToken })
      .expect(401);

    expect(attemptWithNewToken.body.error).toBe('invalid_grant');
  });

  test('should reject revoked access token', async () => {
    const userId = 'test_user_123';
    const token = generateAccessToken(userId);

    // First access - should work
    await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Revoke token
    revokeToken(token);

    // Try to use revoked token - should fail
    const response = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(response.body.error).toBe('unauthorized');
  });
});

describe('Security Tests - Open Redirect Prevention', () => {
  test('should reject redirect to external domain', async () => {
    const maliciousUri = 'http://evil.com/steal-tokens';

    const response = await request(app)
      .get('/auth/github')
      .query({ redirect_uri: maliciousUri })
      .expect(400);

    expect(response.body.error).toBe('invalid_request');
    expect(response.body.error_description).toContain('redirect_uri');
  });

  test('should reject redirect with path traversal', async () => {
    const maliciousUri = 'http://localhost:3000/auth/callback/../../../etc/passwd';

    const response = await request(app)
      .get('/auth/github')
      .query({ redirect_uri: maliciousUri })
      .expect(400);

    expect(response.body.error).toBe('invalid_request');
  });

  test('should only allow exact match URIs (no wildcards)', async () => {
    // Even if URI starts with allowed URI, reject if not exact match
    const almostValidUri = 'http://localhost:3000/auth/callback/extra';

    const response = await request(app)
      .get('/auth/github')
      .query({ redirect_uri: almostValidUri })
      .expect(400);

    expect(response.body.error).toBe('invalid_request');
  });

  test('should reject JavaScript protocol', async () => {
    const maliciousUri = 'javascript:alert(1)';

    const response = await request(app)
      .get('/auth/github')
      .query({ redirect_uri: maliciousUri })
      .expect(400);

    expect(response.body.error).toBe('invalid_request');
  });

  test('should reject data URI', async () => {
    const maliciousUri = 'data:text/html,<script>alert(1)</script>';

    const response = await request(app)
      .get('/auth/github')
      .query({ redirect_uri: maliciousUri })
      .expect(400);

    expect(response.body.error).toBe('invalid_request');
  });
});

describe('Security Tests - Token Security', () => {
  test('should reject expired access token', async () => {
    const userId = 'test_user_123';
    const token = generateAccessToken(userId, {}, '1ms'); // Expire immediately

    // Wait for token to expire
    await new Promise(resolve => setTimeout(resolve, 10));

    const response = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(response.body.error).toBe('unauthorized');
  });

  test('should reject token with invalid signature', async () => {
    const userId = 'test_user_123';
    const validToken = generateAccessToken(userId);
    
    // Tamper with token signature
    const parts = validToken.split('.');
    parts[2] = parts[2].substring(0, parts[2].length - 1) + 'X';
    const tamperedToken = parts.join('.');

    const response = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${tamperedToken}`)
      .expect(401);

    expect(response.body.error).toBe('unauthorized');
  });

  test('should reject token with wrong type', async () => {
    const userId = 'test_user_123';
    const refreshTokenData = generateRefreshToken(userId);

    // Try to use refresh token as access token
    const response = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${refreshTokenData.token}`)
      .expect(401);

    expect(response.body.error).toBe('unauthorized');
  });

  test('should enforce Authorization header format', async () => {
    const userId = 'test_user_123';
    const token = generateAccessToken(userId);

    // Missing "Bearer " prefix
    const response = await request(app)
      .get('/auth/me')
      .set('Authorization', token)
      .expect(401);

    expect(response.body.error).toBe('unauthorized');
  });

  test('should reject missing Authorization header', async () => {
    const response = await request(app)
      .get('/auth/me')
      .expect(401);

    expect(response.body.error).toBe('unauthorized');
  });
});

describe('Security Tests - CSRF Protection', () => {
  test('should include state parameter in authorization URL', async () => {
    const response = await request(app)
      .get('/auth/github')
      .expect(302);

    const location = response.headers.location;
    expect(location).toContain('state=');
    
    // State should be a long random string
    const stateMatch = location.match(/state=([^&]+)/);
    expect(stateMatch).toBeTruthy();
    expect(stateMatch[1].length).toBeGreaterThan(20);
  });
});

describe('Security Tests - PKCE Security', () => {
  test('should require code_challenge in authorization', async () => {
    const response = await request(app)
      .get('/auth/github')
      .expect(302);

    const location = response.headers.location;
    expect(location).toContain('code_challenge=');
    expect(location).toContain('code_challenge_method=S256');
  });

  test('should use S256 challenge method (not plain)', async () => {
    const response = await request(app)
      .get('/auth/github')
      .expect(302);

    const location = response.headers.location;
    expect(location).toContain('code_challenge_method=S256');
    expect(location).not.toContain('code_challenge_method=plain');
  });
});

describe('Security Tests - Input Validation', () => {
  test('should sanitize SQL injection attempt in redirect_uri', async () => {
    const sqlInjection = "http://localhost:3000'; DROP TABLE users; --";

    const response = await request(app)
      .get('/auth/github')
      .query({ redirect_uri: sqlInjection })
      .expect(400);

    expect(response.body.error).toBe('invalid_request');
  });

  test('should reject XSS attempt in redirect_uri', async () => {
    const xssAttempt = 'http://localhost:3000<script>alert(1)</script>';

    const response = await request(app)
      .get('/auth/github')
      .query({ redirect_uri: xssAttempt })
      .expect(400);

    expect(response.body.error).toBe('invalid_request');
  });

  test('should reject extremely long redirect_uri', async () => {
    const longUri = 'http://localhost:3000/' + 'a'.repeat(10000);

    const response = await request(app)
      .get('/auth/github')
      .query({ redirect_uri: longUri })
      .expect(400);

    expect(response.body.error).toBe('invalid_request');
  });
});
