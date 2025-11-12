/**
 * Redirect Validation Unit Tests
 * 
 * اختبارات التحقق من صحة إعادة التوجيه
 */

const {
  validateRedirectUri,
  isWhitelisted,
  verifyProtocol,
  validateState,
  getAllowedRedirectUris,
} = require('../../server/middleware/redirect-validation.middleware');

describe('Redirect Validation - URI Validation', () => {
  beforeEach(() => {
    process.env.ALLOWED_REDIRECT_URIS = 'http://localhost:3000/auth/callback,http://localhost:3000/auth/success';
    process.env.NODE_ENV = 'test';
    process.env.ENFORCE_HTTPS = 'false';
  });

  test('should validate whitelisted URI', () => {
    const uri = 'http://localhost:3000/auth/callback';
    expect(validateRedirectUri(uri)).toBe(true);
  });

  test('should reject non-whitelisted URI', () => {
    const uri = 'http://evil.com/callback';
    expect(validateRedirectUri(uri)).toBe(false);
  });

  test('should reject empty URI', () => {
    expect(validateRedirectUri('')).toBe(false);
  });

  test('should reject null URI', () => {
    expect(validateRedirectUri(null)).toBe(false);
  });

  test('should reject undefined URI', () => {
    expect(validateRedirectUri(undefined)).toBe(false);
  });

  test('should reject malformed URI', () => {
    const uri = 'not a valid uri';
    expect(validateRedirectUri(uri)).toBe(false);
  });

  test('should use exact match (no wildcards)', () => {
    const uri = 'http://localhost:3000/auth/callback/extra';
    expect(validateRedirectUri(uri)).toBe(false);
  });
});

describe('Redirect Validation - Whitelist Check', () => {
  beforeEach(() => {
    process.env.ALLOWED_REDIRECT_URIS = 'http://localhost:3000/auth/callback,https://app.example.com/callback';
  });

  test('should check if URI is whitelisted', () => {
    expect(isWhitelisted('http://localhost:3000/auth/callback')).toBe(true);
    expect(isWhitelisted('https://app.example.com/callback')).toBe(true);
  });

  test('should reject non-whitelisted URI', () => {
    expect(isWhitelisted('http://evil.com/callback')).toBe(false);
  });

  test('should use exact match only', () => {
    expect(isWhitelisted('http://localhost:3000/auth/callback/extra')).toBe(false);
  });

  test('should handle empty whitelist', () => {
    process.env.ALLOWED_REDIRECT_URIS = '';
    expect(isWhitelisted('http://localhost:3000/auth/callback')).toBe(false);
  });
});

describe('Redirect Validation - Protocol Verification', () => {
  test('should accept http in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.ENFORCE_HTTPS = 'false';
    
    expect(verifyProtocol('http:')).toBe(true);
  });

  test('should accept https in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.ENFORCE_HTTPS = 'false';
    
    expect(verifyProtocol('https:')).toBe(true);
  });

  test('should reject http in production', () => {
    process.env.NODE_ENV = 'production';
    
    expect(verifyProtocol('http:')).toBe(false);
  });

  test('should accept https in production', () => {
    process.env.NODE_ENV = 'production';
    
    expect(verifyProtocol('https:')).toBe(true);
  });

  test('should enforce HTTPS when ENFORCE_HTTPS=true', () => {
    process.env.NODE_ENV = 'development';
    process.env.ENFORCE_HTTPS = 'true';
    
    expect(verifyProtocol('http:')).toBe(false);
    expect(verifyProtocol('https:')).toBe(true);
  });

  test('should reject other protocols', () => {
    expect(verifyProtocol('ftp:')).toBe(false);
    expect(verifyProtocol('file:')).toBe(false);
  });
});

describe('Redirect Validation - State Validation', () => {
  test('should validate matching state', () => {
    const state = 'random_state_value';
    expect(validateState(state, state)).toBe(true);
  });

  test('should reject non-matching state', () => {
    const state1 = 'random_state_value_1';
    const state2 = 'random_state_value_2';
    expect(validateState(state1, state2)).toBe(false);
  });

  test('should reject empty state', () => {
    expect(validateState('', 'state')).toBe(false);
    expect(validateState('state', '')).toBe(false);
  });

  test('should reject null state', () => {
    expect(validateState(null, 'state')).toBe(false);
    expect(validateState('state', null)).toBe(false);
  });

  test('should use constant-time comparison', () => {
    const state = 'a'.repeat(64);
    const wrongState1 = 'b' + 'a'.repeat(63);
    const wrongState2 = 'a'.repeat(63) + 'b';
    
    // Both should fail
    expect(validateState(state, wrongState1)).toBe(false);
    expect(validateState(state, wrongState2)).toBe(false);
  });
});

describe('Redirect Validation - Get Allowed URIs', () => {
  test('should return array of allowed URIs', () => {
    process.env.ALLOWED_REDIRECT_URIS = 'http://localhost:3000/auth/callback,https://app.example.com/callback';
    
    const uris = getAllowedRedirectUris();
    expect(Array.isArray(uris)).toBe(true);
    expect(uris.length).toBe(2);
    expect(uris).toContain('http://localhost:3000/auth/callback');
    expect(uris).toContain('https://app.example.com/callback');
  });

  test('should trim whitespace from URIs', () => {
    process.env.ALLOWED_REDIRECT_URIS = ' http://localhost:3000/callback , https://app.example.com/callback ';
    
    const uris = getAllowedRedirectUris();
    expect(uris).toContain('http://localhost:3000/callback');
    expect(uris).toContain('https://app.example.com/callback');
  });

  test('should filter empty URIs', () => {
    process.env.ALLOWED_REDIRECT_URIS = 'http://localhost:3000/callback,,https://app.example.com/callback';
    
    const uris = getAllowedRedirectUris();
    expect(uris.length).toBe(2);
  });

  test('should return empty array when not configured', () => {
    process.env.ALLOWED_REDIRECT_URIS = '';
    
    const uris = getAllowedRedirectUris();
    expect(uris).toEqual([]);
  });
});

describe('Redirect Validation - Middleware', () => {
  const { redirectValidationMiddleware, strictRedirectValidationMiddleware } = require('../../server/middleware/redirect-validation.middleware');

  test('should allow request with valid redirect_uri', () => {
    process.env.ALLOWED_REDIRECT_URIS = 'http://localhost:3000/auth/callback';
    
    const req = {
      query: { redirect_uri: 'http://localhost:3000/auth/callback' },
      ip: '127.0.0.1',
      get: () => 'test-agent'
    };
    const res = {
      status: jest.fn(() => res),
      json: jest.fn()
    };
    const next = jest.fn();

    redirectValidationMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.validatedRedirectUri).toBe('http://localhost:3000/auth/callback');
  });

  test('should reject request with invalid redirect_uri', () => {
    process.env.ALLOWED_REDIRECT_URIS = 'http://localhost:3000/auth/callback';
    
    const req = {
      query: { redirect_uri: 'http://evil.com/callback' },
      ip: '127.0.0.1',
      get: () => 'test-agent'
    };
    const res = {
      status: jest.fn(() => res),
      json: jest.fn()
    };
    const next = jest.fn();

    redirectValidationMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'invalid_request',
      error_description: 'Invalid redirect_uri parameter'
    });
  });

  test('should allow request without redirect_uri (optional middleware)', () => {
    const req = { query: {}, ip: '127.0.0.1', get: () => 'test-agent' };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    const next = jest.fn();

    redirectValidationMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('strict middleware should require redirect_uri', () => {
    const req = { query: {}, ip: '127.0.0.1', get: () => 'test-agent' };
    const res = {
      status: jest.fn(() => res),
      json: jest.fn()
    };
    const next = jest.fn();

    strictRedirectValidationMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'invalid_request',
      error_description: 'Missing redirect_uri parameter'
    });
  });
});
