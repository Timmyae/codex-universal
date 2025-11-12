/**
 * Redirect Validation Middleware Unit Tests
 * اختبارات وحدة وسيطة التحقق من إعادة التوجيه
 * 
 * Tests for open redirect prevention
 * اختبارات لمنع إعادة التوجيه المفتوحة
 */

const {
  validateRedirectUri,
  verifyProtocol,
  redirectValidationMiddleware,
  buildSafeRedirectUrl,
  isLocalhostUri,
  getAllowedRedirectUris
} = require('../../server/middleware/redirect-validation.middleware');

// Mock environment variables
process.env.ALLOWED_REDIRECT_URIS = 'http://localhost:3000/callback,https://example.com/callback,http://127.0.0.1:3000/auth';
process.env.NODE_ENV = 'development';

describe('Redirect Validation - URI Validation', () => {
  describe('validateRedirectUri', () => {
    test('should accept whitelisted URI', () => {
      const uri = 'http://localhost:3000/callback';
      
      expect(validateRedirectUri(uri)).toBe(true);
    });

    test('should accept HTTPS whitelisted URI', () => {
      const uri = 'https://example.com/callback';
      
      expect(validateRedirectUri(uri)).toBe(true);
    });

    test('should reject non-whitelisted URI', () => {
      const uri = 'http://evil.com/steal-tokens';
      
      expect(validateRedirectUri(uri)).toBe(false);
    });

    test('should reject null URI', () => {
      expect(validateRedirectUri(null)).toBe(false);
    });

    test('should reject undefined URI', () => {
      expect(validateRedirectUri(undefined)).toBe(false);
    });

    test('should reject non-string URI', () => {
      expect(validateRedirectUri(12345)).toBe(false);
      expect(validateRedirectUri({})).toBe(false);
      expect(validateRedirectUri([])).toBe(false);
    });

    test('should reject empty string', () => {
      expect(validateRedirectUri('')).toBe(false);
    });

    test('should use exact match, not startsWith', () => {
      // If whitelisted URI is "http://localhost:3000/callback"
      // Should NOT accept "http://localhost:3000/callback/evil"
      const uri = 'http://localhost:3000/callback/evil';
      
      expect(validateRedirectUri(uri)).toBe(false);
    });

    test('should be case-sensitive', () => {
      const uri = 'HTTP://LOCALHOST:3000/CALLBACK';
      
      // Should fail if exact match is lowercase
      expect(validateRedirectUri(uri)).toBe(false);
    });

    test('should reject similar but different URIs', () => {
      const uri = 'http://localhost:3001/callback'; // Port 3001 instead of 3000
      
      expect(validateRedirectUri(uri)).toBe(false);
    });
  });

  describe('verifyProtocol', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    test('should accept HTTPS in any environment', () => {
      const uri = 'https://example.com/callback';
      
      expect(verifyProtocol(uri)).toBe(true);
    });

    test('should accept HTTP localhost in development', () => {
      process.env.NODE_ENV = 'development';
      const uri = 'http://localhost:3000/callback';
      
      expect(verifyProtocol(uri)).toBe(true);
    });

    test('should accept HTTP 127.0.0.1 in development', () => {
      process.env.NODE_ENV = 'development';
      const uri = 'http://127.0.0.1:3000/callback';
      
      expect(verifyProtocol(uri)).toBe(true);
    });

    test('should reject HTTP non-localhost in production', () => {
      process.env.NODE_ENV = 'production';
      const uri = 'http://example.com/callback';
      
      expect(verifyProtocol(uri)).toBe(false);
    });

    test('should reject HTTP localhost in production', () => {
      process.env.NODE_ENV = 'production';
      const uri = 'http://localhost:3000/callback';
      
      expect(verifyProtocol(uri)).toBe(false);
    });

    test('should accept HTTPS in production', () => {
      process.env.NODE_ENV = 'production';
      const uri = 'https://example.com/callback';
      
      expect(verifyProtocol(uri)).toBe(true);
    });

    test('should reject null URI', () => {
      expect(verifyProtocol(null)).toBe(false);
    });

    test('should reject undefined URI', () => {
      expect(verifyProtocol(undefined)).toBe(false);
    });

    test('should reject invalid URI format', () => {
      const invalidUri = 'not-a-valid-url';
      
      expect(verifyProtocol(invalidUri)).toBe(false);
    });

    test('should reject FTP protocol', () => {
      const uri = 'ftp://example.com/file';
      
      expect(verifyProtocol(uri)).toBe(false);
    });

    test('should reject file protocol', () => {
      const uri = 'file:///etc/passwd';
      
      expect(verifyProtocol(uri)).toBe(false);
    });

    test('should reject javascript protocol', () => {
      const uri = 'javascript:alert(1)';
      
      expect(verifyProtocol(uri)).toBe(false);
    });
  });
});

describe('Redirect Validation - Middleware', () => {
  describe('redirectValidationMiddleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        query: {},
        body: {}
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });

    test('should call next() for valid redirect URI in query', () => {
      req.query.redirect_uri = 'http://localhost:3000/callback';
      
      redirectValidationMiddleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should call next() for valid redirect URI in body', () => {
      req.body.redirect_uri = 'http://localhost:3000/callback';
      
      redirectValidationMiddleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 400 for missing redirect_uri', () => {
      redirectValidationMiddleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Missing redirect_uri'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 400 for non-whitelisted redirect_uri', () => {
      req.query.redirect_uri = 'http://evil.com/steal';
      
      redirectValidationMiddleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid redirect_uri'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 400 for insecure protocol in production', () => {
      process.env.NODE_ENV = 'production';
      req.query.redirect_uri = 'http://localhost:3000/callback';
      
      redirectValidationMiddleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Insecure redirect_uri'
        })
      );
      expect(next).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = 'development'; // Reset
    });

    test('should log security warning for invalid redirect attempt', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      req.query.redirect_uri = 'http://evil.com/steal';
      
      redirectValidationMiddleware(req, res, next);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY: Invalid redirect URI attempted')
      );
      consoleWarnSpy.mockRestore();
    });

    test('should prefer query parameter over body parameter', () => {
      req.query.redirect_uri = 'http://localhost:3000/callback';
      req.body.redirect_uri = 'http://evil.com/steal';
      
      redirectValidationMiddleware(req, res, next);
      
      // Should use query parameter and succeed
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});

describe('Redirect Validation - Safe URL Building', () => {
  describe('buildSafeRedirectUrl', () => {
    test('should build safe redirect URL with state and code', () => {
      const baseUri = 'http://localhost:3000/callback';
      const state = 'random-state-123';
      const code = 'auth-code-456';
      
      const url = buildSafeRedirectUrl(baseUri, state, code);
      
      expect(url).toContain(baseUri);
      expect(url).toContain(`state=${state}`);
      expect(url).toContain(`code=${code}`);
    });

    test('should handle URI without query parameters', () => {
      const baseUri = 'http://localhost:3000/callback';
      const state = 'state123';
      const code = 'code456';
      
      const url = buildSafeRedirectUrl(baseUri, state, code);
      
      expect(url).toBe(`${baseUri}?state=${state}&code=${code}`);
    });

    test('should handle URI with existing query parameters', () => {
      const baseUri = 'http://localhost:3000/callback?existing=param';
      const state = 'state123';
      const code = 'code456';
      
      const url = buildSafeRedirectUrl(baseUri, state, code);
      
      expect(url).toContain('existing=param');
      expect(url).toContain('state=state123');
      expect(url).toContain('code=code456');
    });

    test('should throw error for invalid redirect URI', () => {
      const invalidUri = 'http://evil.com/steal';
      const state = 'state123';
      const code = 'code456';
      
      expect(() => buildSafeRedirectUrl(invalidUri, state, code)).toThrow('Invalid redirect URI');
    });

    test('should throw error for insecure protocol in production', () => {
      process.env.NODE_ENV = 'production';
      const uri = 'http://localhost:3000/callback';
      const state = 'state123';
      const code = 'code456';
      
      expect(() => buildSafeRedirectUrl(uri, state, code)).toThrow('Insecure redirect URI protocol');
      
      process.env.NODE_ENV = 'development'; // Reset
    });

    test('should handle missing state parameter', () => {
      const baseUri = 'http://localhost:3000/callback';
      const code = 'code456';
      
      const url = buildSafeRedirectUrl(baseUri, null, code);
      
      expect(url).not.toContain('state=');
      expect(url).toContain(`code=${code}`);
    });

    test('should handle missing code parameter', () => {
      const baseUri = 'http://localhost:3000/callback';
      const state = 'state123';
      
      const url = buildSafeRedirectUrl(baseUri, state, null);
      
      expect(url).toContain(`state=${state}`);
      expect(url).not.toContain('code=');
    });

    test('should URL encode special characters in parameters', () => {
      const baseUri = 'http://localhost:3000/callback';
      const state = 'state with spaces';
      const code = 'code&special=chars';
      
      const url = buildSafeRedirectUrl(baseUri, state, code);
      
      expect(url).toContain('state=state+with+spaces');
      expect(url).toContain('code=code%26special%3Dchars');
    });
  });
});

describe('Redirect Validation - Helper Functions', () => {
  describe('isLocalhostUri', () => {
    test('should return true for localhost', () => {
      expect(isLocalhostUri('http://localhost:3000/callback')).toBe(true);
    });

    test('should return true for 127.0.0.1', () => {
      expect(isLocalhostUri('http://127.0.0.1:3000/callback')).toBe(true);
    });

    test('should return false for non-localhost', () => {
      expect(isLocalhostUri('http://example.com/callback')).toBe(false);
    });

    test('should return false for invalid URI', () => {
      expect(isLocalhostUri('not-a-url')).toBe(false);
    });

    test('should handle HTTPS localhost', () => {
      expect(isLocalhostUri('https://localhost:3000/callback')).toBe(true);
    });
  });

  describe('getAllowedRedirectUris', () => {
    test('should return array of allowed URIs', () => {
      const uris = getAllowedRedirectUris();
      
      expect(Array.isArray(uris)).toBe(true);
      expect(uris.length).toBeGreaterThan(0);
    });

    test('should trim whitespace from URIs', () => {
      process.env.ALLOWED_REDIRECT_URIS = ' http://localhost:3000/callback , https://example.com/callback ';
      const uris = getAllowedRedirectUris();
      
      expect(uris).toContain('http://localhost:3000/callback');
      expect(uris).toContain('https://example.com/callback');
      expect(uris).not.toContain(' http://localhost:3000/callback');
      
      // Reset
      process.env.ALLOWED_REDIRECT_URIS = 'http://localhost:3000/callback,https://example.com/callback';
    });

    test('should return empty array if no env variable set', () => {
      const originalValue = process.env.ALLOWED_REDIRECT_URIS;
      delete process.env.ALLOWED_REDIRECT_URIS;
      
      const uris = getAllowedRedirectUris();
      
      expect(Array.isArray(uris)).toBe(true);
      expect(uris.length).toBe(0);
      
      // Restore
      process.env.ALLOWED_REDIRECT_URIS = originalValue;
    });
  });
});

describe('Redirect Validation - Security Properties', () => {
  test('should prevent open redirect attacks', () => {
    const attackUris = [
      'http://evil.com/steal-tokens',
      'https://phishing-site.com/fake-login',
      'http://localhost:3000/../evil.com',
      'http://localhost@evil.com:3000/callback',
      '//evil.com/steal',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>'
    ];

    attackUris.forEach(uri => {
      expect(validateRedirectUri(uri)).toBe(false);
    });
  });

  test('should prevent protocol downgrade attacks', () => {
    process.env.NODE_ENV = 'production';
    
    const httpUri = 'http://example.com/callback';
    
    expect(verifyProtocol(httpUri)).toBe(false);
    
    process.env.NODE_ENV = 'development'; // Reset
  });

  test('should prevent subdomain takeover attacks', () => {
    // If only "example.com" is whitelisted
    // Should NOT accept "evil.example.com"
    const subdomainUri = 'https://evil.example.com/callback';
    
    expect(validateRedirectUri(subdomainUri)).toBe(false);
  });

  test('should log security events', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    const req = {
      query: { redirect_uri: 'http://evil.com/steal' }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();
    
    redirectValidationMiddleware(req, res, next);
    
    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });
});
