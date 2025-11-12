const {
  isValidRedirectUri,
  addRedirectUri,
  removeRedirectUri,
  getAllowedRedirectUris,
  validateRedirectUri,
  matchesPattern
} = require('../../server/middleware/redirect-validation.middleware');

describe('Redirect Validation Middleware', () => {
  describe('isValidRedirectUri', () => {
    it('should accept whitelisted URIs', () => {
      expect(isValidRedirectUri('http://localhost:3000/callback')).toBe(true);
      expect(isValidRedirectUri('http://localhost:8080/callback')).toBe(true);
      expect(isValidRedirectUri('https://example.com/oauth/callback')).toBe(true);
    });

    it('should accept custom scheme URIs', () => {
      expect(isValidRedirectUri('myapp://oauth/callback')).toBe(true);
    });

    it('should reject non-whitelisted URIs', () => {
      expect(isValidRedirectUri('http://evil.com/callback')).toBe(false);
      expect(isValidRedirectUri('https://malicious.com/steal')).toBe(false);
    });

    it('should reject URIs with fragments', () => {
      expect(isValidRedirectUri('http://localhost:3000/callback#fragment')).toBe(false);
    });

    it('should reject null or undefined', () => {
      expect(isValidRedirectUri(null)).toBe(false);
      expect(isValidRedirectUri(undefined)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidRedirectUri('')).toBe(false);
    });

    it('should reject non-string input', () => {
      expect(isValidRedirectUri(123)).toBe(false);
      expect(isValidRedirectUri({})).toBe(false);
      expect(isValidRedirectUri([])).toBe(false);
    });

    it('should reject malformed URIs', () => {
      expect(isValidRedirectUri('not-a-valid-url')).toBe(false);
      expect(isValidRedirectUri('http://')).toBe(false);
    });

    it('should handle query parameters', () => {
      // Add URI with query params for testing
      addRedirectUri('http://localhost:3000/callback?param=value');
      expect(isValidRedirectUri('http://localhost:3000/callback?param=value')).toBe(true);
    });
  });

  describe('matchesPattern', () => {
    it('should match exact strings', () => {
      expect(matchesPattern('test', 'test')).toBe(true);
      expect(matchesPattern('test', 'other')).toBe(false);
    });

    it('should match wildcard patterns', () => {
      expect(matchesPattern('http://sub.example.com/callback', 'http://*.example.com/callback')).toBe(true);
      expect(matchesPattern('http://example.com/callback', 'http://*.example.com/callback')).toBe(false);
    });

    it('should escape dots in patterns', () => {
      expect(matchesPattern('http://example.com', 'http://example.com')).toBe(true);
    });

    it('should handle multiple wildcards', () => {
      expect(matchesPattern('http://a.b.example.com/path', 'http://*.*.example.com/*')).toBe(true);
    });
  });

  describe('addRedirectUri', () => {
    beforeEach(() => {
      // Clean up by removing test URIs
      const testUri = 'http://test.com/callback';
      if (getAllowedRedirectUris().includes(testUri)) {
        removeRedirectUri(testUri);
      }
    });

    it('should add valid URI to whitelist', () => {
      const uri = 'http://test.com/callback';
      const result = addRedirectUri(uri);
      
      expect(result).toBe(true);
      expect(getAllowedRedirectUris()).toContain(uri);
    });

    it('should not add duplicate URIs', () => {
      const uri = 'http://test.com/callback';
      addRedirectUri(uri);
      const initialLength = getAllowedRedirectUris().length;
      
      addRedirectUri(uri);
      expect(getAllowedRedirectUris().length).toBe(initialLength);
    });

    it('should reject invalid URIs', () => {
      expect(addRedirectUri('not-a-url')).toBe(false);
      expect(addRedirectUri('')).toBe(false);
      expect(addRedirectUri(null)).toBe(false);
    });

    it('should accept HTTPS URIs', () => {
      const uri = 'https://secure.com/callback';
      expect(addRedirectUri(uri)).toBe(true);
    });

    it('should accept custom scheme URIs', () => {
      const uri = 'myapp://custom/callback';
      expect(addRedirectUri(uri)).toBe(true);
    });
  });

  describe('removeRedirectUri', () => {
    it('should remove existing URI', () => {
      const uri = 'http://test-remove.com/callback';
      addRedirectUri(uri);
      
      const result = removeRedirectUri(uri);
      expect(result).toBe(true);
      expect(getAllowedRedirectUris()).not.toContain(uri);
    });

    it('should return false for non-existent URI', () => {
      const result = removeRedirectUri('http://non-existent.com/callback');
      expect(result).toBe(false);
    });

    it('should handle removing default URIs', () => {
      const defaultUri = 'http://localhost:3000/callback';
      const result = removeRedirectUri(defaultUri);
      expect(result).toBe(true);
      
      // Add it back for other tests
      addRedirectUri(defaultUri);
    });
  });

  describe('getAllowedRedirectUris', () => {
    it('should return array of URIs', () => {
      const uris = getAllowedRedirectUris();
      expect(Array.isArray(uris)).toBe(true);
    });

    it('should include default URIs', () => {
      const uris = getAllowedRedirectUris();
      expect(uris).toContain('http://localhost:3000/callback');
    });

    it('should return a copy of the array', () => {
      const uris1 = getAllowedRedirectUris();
      const uris2 = getAllowedRedirectUris();
      expect(uris1).not.toBe(uris2); // Different array instances
      expect(uris1).toEqual(uris2); // But same content
    });
  });

  describe('validateRedirectUri middleware', () => {
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

    it('should call next for valid redirect_uri in query', () => {
      req.query.redirect_uri = 'http://localhost:3000/callback';
      
      validateRedirectUri(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.validatedRedirectUri).toBe('http://localhost:3000/callback');
    });

    it('should call next for valid redirect_uri in body', () => {
      req.body.redirect_uri = 'http://localhost:3000/callback';
      
      validateRedirectUri(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.validatedRedirectUri).toBe('http://localhost:3000/callback');
    });

    it('should return 400 for missing redirect_uri', () => {
      validateRedirectUri(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'invalid_request',
        error_description: 'redirect_uri parameter is required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid redirect_uri', () => {
      req.query.redirect_uri = 'http://evil.com/steal';
      
      validateRedirectUri(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'invalid_request',
        error_description: 'Invalid redirect_uri'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should prefer query parameter over body', () => {
      req.query.redirect_uri = 'http://localhost:3000/callback';
      req.body.redirect_uri = 'http://evil.com/steal';
      
      validateRedirectUri(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.validatedRedirectUri).toBe('http://localhost:3000/callback');
    });

    it('should reject URIs with fragments', () => {
      req.query.redirect_uri = 'http://localhost:3000/callback#fragment';
      
      validateRedirectUri(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Security edge cases', () => {
    it('should reject URL with embedded credentials', () => {
      expect(isValidRedirectUri('http://user:pass@localhost:3000/callback')).toBe(false);
    });

    it('should reject javascript: protocol', () => {
      expect(isValidRedirectUri('javascript:alert(1)')).toBe(false);
    });

    it('should reject data: protocol', () => {
      expect(isValidRedirectUri('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('should handle case sensitivity', () => {
      // URLs are case-sensitive in path/query, but not in domain
      expect(isValidRedirectUri('http://localhost:3000/CALLBACK')).toBe(false);
      expect(isValidRedirectUri('HTTP://LOCALHOST:3000/callback')).toBe(false);
    });

    it('should reject attempts to bypass with @ symbol', () => {
      expect(isValidRedirectUri('http://localhost@evil.com/callback')).toBe(false);
    });
  });

  describe('Integration tests', () => {
    it('should handle full redirect validation flow', () => {
      // Add a new redirect URI
      const newUri = 'https://myapp.com/oauth/callback';
      addRedirectUri(newUri);
      
      // Validate it works
      expect(isValidRedirectUri(newUri)).toBe(true);
      
      // Test middleware
      const req = { query: { redirect_uri: newUri } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      
      validateRedirectUri(req, res, next);
      expect(next).toHaveBeenCalled();
      
      // Remove it
      removeRedirectUri(newUri);
      expect(isValidRedirectUri(newUri)).toBe(false);
    });

    it('should maintain whitelist integrity', () => {
      const initialUris = getAllowedRedirectUris();
      const initialCount = initialUris.length;
      
      // Add some URIs
      addRedirectUri('http://test1.com/cb');
      addRedirectUri('http://test2.com/cb');
      
      expect(getAllowedRedirectUris().length).toBe(initialCount + 2);
      
      // Remove them
      removeRedirectUri('http://test1.com/cb');
      removeRedirectUri('http://test2.com/cb');
      
      expect(getAllowedRedirectUris().length).toBe(initialCount);
    });
  });
});
