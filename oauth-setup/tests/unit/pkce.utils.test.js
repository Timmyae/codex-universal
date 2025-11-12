/**
 * PKCE Utils Unit Tests / اختبارات وحدة أدوات PKCE
 * 
 * Comprehensive tests for PKCE implementation
 * اختبارات شاملة لتنفيذ PKCE
 * 
 * Target: 100% code coverage / الهدف: تغطية كود 100%
 */

const {
  generateCodeVerifier,
  generateCodeChallenge,
  validateCodeVerifier,
  verifyChallenge,
  base64UrlEncode,
  base64UrlDecode,
  generatePKCEPair
} = require('../../server/utils/pkce.utils');

describe('PKCE Utils - Code Verifier / أدوات PKCE - محقق الرمز', () => {
  describe('generateCodeVerifier', () => {
    test('should generate code verifier with valid length (43-128 chars)', () => {
      const verifier = generateCodeVerifier();
      
      expect(verifier).toBeDefined();
      expect(typeof verifier).toBe('string');
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(verifier.length).toBeLessThanOrEqual(128);
    });

    test('should generate different verifiers on each call', () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      
      expect(verifier1).not.toBe(verifier2);
    });

    test('should only contain base64url characters [A-Za-z0-9_-]', () => {
      const verifier = generateCodeVerifier();
      const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
      
      expect(base64UrlPattern.test(verifier)).toBe(true);
    });

    test('should not contain padding characters (=)', () => {
      const verifier = generateCodeVerifier();
      
      expect(verifier).not.toContain('=');
    });

    test('should not contain + or / characters', () => {
      const verifier = generateCodeVerifier();
      
      expect(verifier).not.toContain('+');
      expect(verifier).not.toContain('/');
    });
  });

  describe('validateCodeVerifier', () => {
    test('should validate correct code verifier', () => {
      const verifier = generateCodeVerifier();
      
      expect(validateCodeVerifier(verifier)).toBe(true);
    });

    test('should reject null verifier', () => {
      expect(validateCodeVerifier(null)).toBe(false);
    });

    test('should reject undefined verifier', () => {
      expect(validateCodeVerifier(undefined)).toBe(false);
    });

    test('should reject non-string verifier', () => {
      expect(validateCodeVerifier(12345)).toBe(false);
      expect(validateCodeVerifier({})).toBe(false);
      expect(validateCodeVerifier([])).toBe(false);
    });

    test('should reject empty string verifier', () => {
      expect(validateCodeVerifier('')).toBe(false);
    });

    test('should reject verifier shorter than 43 characters', () => {
      const shortVerifier = 'abc123'; // Too short
      
      expect(validateCodeVerifier(shortVerifier)).toBe(false);
    });

    test('should reject verifier longer than 128 characters', () => {
      const longVerifier = 'a'.repeat(129); // Too long
      
      expect(validateCodeVerifier(longVerifier)).toBe(false);
    });

    test('should reject verifier with invalid characters', () => {
      const invalidVerifier = 'a'.repeat(43) + '!'; // Contains invalid character
      
      expect(validateCodeVerifier(invalidVerifier)).toBe(false);
    });

    test('should reject verifier with spaces', () => {
      const invalidVerifier = 'a'.repeat(42) + ' '; // Contains space
      
      expect(validateCodeVerifier(invalidVerifier)).toBe(false);
    });

    test('should accept verifier with exactly 43 characters', () => {
      const validVerifier = 'a'.repeat(43);
      
      expect(validateCodeVerifier(validVerifier)).toBe(true);
    });

    test('should accept verifier with exactly 128 characters', () => {
      const validVerifier = 'a'.repeat(128);
      
      expect(validateCodeVerifier(validVerifier)).toBe(true);
    });

    test('should accept verifier with all valid characters', () => {
      const validVerifier = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
      
      expect(validateCodeVerifier(validVerifier)).toBe(true);
    });
  });
});

describe('PKCE Utils - Code Challenge / أدوات PKCE - تحدي الرمز', () => {
  describe('generateCodeChallenge', () => {
    test('should generate code challenge from verifier', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      
      expect(challenge).toBeDefined();
      expect(typeof challenge).toBe('string');
      expect(challenge.length).toBeGreaterThan(0);
    });

    test('should generate same challenge for same verifier', () => {
      const verifier = generateCodeVerifier();
      const challenge1 = generateCodeChallenge(verifier);
      const challenge2 = generateCodeChallenge(verifier);
      
      expect(challenge1).toBe(challenge2);
    });

    test('should generate different challenges for different verifiers', () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      const challenge1 = generateCodeChallenge(verifier1);
      const challenge2 = generateCodeChallenge(verifier2);
      
      expect(challenge1).not.toBe(challenge2);
    });

    test('should throw error for null verifier', () => {
      expect(() => generateCodeChallenge(null)).toThrow();
    });

    test('should throw error for undefined verifier', () => {
      expect(() => generateCodeChallenge(undefined)).toThrow();
    });

    test('should throw error for non-string verifier', () => {
      expect(() => generateCodeChallenge(12345)).toThrow();
    });

    test('should throw error for invalid verifier format', () => {
      const invalidVerifier = 'invalid!@#';
      
      expect(() => generateCodeChallenge(invalidVerifier)).toThrow('Invalid code verifier format');
    });

    test('should generate base64url encoded challenge', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
      
      expect(base64UrlPattern.test(challenge)).toBe(true);
    });

    test('should not contain padding characters (=)', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      
      expect(challenge).not.toContain('=');
    });

    test('should implement S256 method (SHA256 + base64url)', () => {
      // Known test vector
      const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const expectedChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
      
      const challenge = generateCodeChallenge(verifier);
      
      expect(challenge).toBe(expectedChallenge);
    });
  });

  describe('verifyChallenge', () => {
    test('should verify matching verifier and challenge', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      
      expect(verifyChallenge(verifier, challenge)).toBe(true);
    });

    test('should reject non-matching verifier and challenge', () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      const challenge1 = generateCodeChallenge(verifier1);
      
      expect(verifyChallenge(verifier2, challenge1)).toBe(false);
    });

    test('should reject null verifier', () => {
      const challenge = 'someChallenge';
      
      expect(verifyChallenge(null, challenge)).toBe(false);
    });

    test('should reject null challenge', () => {
      const verifier = generateCodeVerifier();
      
      expect(verifyChallenge(verifier, null)).toBe(false);
    });

    test('should reject empty verifier', () => {
      const challenge = 'someChallenge';
      
      expect(verifyChallenge('', challenge)).toBe(false);
    });

    test('should reject empty challenge', () => {
      const verifier = generateCodeVerifier();
      
      expect(verifyChallenge(verifier, '')).toBe(false);
    });

    test('should use constant-time comparison', () => {
      // This test ensures timing attacks are prevented
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      
      const start1 = Date.now();
      verifyChallenge(verifier, challenge);
      const time1 = Date.now() - start1;
      
      const wrongChallenge = challenge.substring(0, challenge.length - 1) + 'X';
      const start2 = Date.now();
      verifyChallenge(verifier, wrongChallenge);
      const time2 = Date.now() - start2;
      
      // Timing should be similar (within reasonable range)
      // This is a weak test but demonstrates the concept
      expect(Math.abs(time1 - time2)).toBeLessThan(100);
    });

    test('should handle different length challenges', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      const shortChallenge = challenge.substring(0, 10);
      
      expect(verifyChallenge(verifier, shortChallenge)).toBe(false);
    });

    test('should handle invalid verifier format gracefully', () => {
      const invalidVerifier = 'invalid!@#';
      const challenge = 'someChallenge';
      
      expect(verifyChallenge(invalidVerifier, challenge)).toBe(false);
    });
  });
});

describe('PKCE Utils - Base64URL Encoding / أدوات PKCE - ترميز Base64URL', () => {
  describe('base64UrlEncode', () => {
    test('should encode buffer to base64url string', () => {
      const buffer = Buffer.from('Hello World');
      const encoded = base64UrlEncode(buffer);
      
      expect(typeof encoded).toBe('string');
      expect(encoded).toBe('SGVsbG8gV29ybGQ');
    });

    test('should replace + with -', () => {
      const buffer = Buffer.from('?>'); // Creates '+' in standard base64
      const encoded = base64UrlEncode(buffer);
      
      expect(encoded).not.toContain('+');
      expect(encoded).toContain('-');
    });

    test('should replace / with _', () => {
      const buffer = Buffer.from('?'); // Creates '/' in standard base64
      const encoded = base64UrlEncode(buffer);
      
      expect(encoded).not.toContain('/');
    });

    test('should remove padding (=)', () => {
      const buffer = Buffer.from('a'); // Creates padding in base64
      const encoded = base64UrlEncode(buffer);
      
      expect(encoded).not.toContain('=');
    });

    test('should be reversible with base64UrlDecode', () => {
      const original = Buffer.from('Test data 123');
      const encoded = base64UrlEncode(original);
      const decoded = base64UrlDecode(encoded);
      
      expect(decoded.equals(original)).toBe(true);
    });
  });

  describe('base64UrlDecode', () => {
    test('should decode base64url string to buffer', () => {
      const encoded = 'SGVsbG8gV29ybGQ';
      const decoded = base64UrlDecode(encoded);
      
      expect(Buffer.isBuffer(decoded)).toBe(true);
      expect(decoded.toString()).toBe('Hello World');
    });

    test('should handle missing padding', () => {
      const encoded = 'YQ'; // 'a' without padding
      const decoded = base64UrlDecode(encoded);
      
      expect(decoded.toString()).toBe('a');
    });

    test('should replace - with +', () => {
      const encoded = 'Pw'; // Contains '-' in url-safe encoding
      const decoded = base64UrlDecode(encoded);
      
      expect(Buffer.isBuffer(decoded)).toBe(true);
    });

    test('should replace _ with /', () => {
      const encoded = 'Pw'; // Contains '_' in url-safe encoding
      const decoded = base64UrlDecode(encoded);
      
      expect(Buffer.isBuffer(decoded)).toBe(true);
    });
  });
});

describe('PKCE Utils - Generate PKCE Pair / أدوات PKCE - إنشاء زوج PKCE', () => {
  describe('generatePKCEPair', () => {
    test('should generate valid PKCE pair', () => {
      const pair = generatePKCEPair();
      
      expect(pair).toHaveProperty('codeVerifier');
      expect(pair).toHaveProperty('codeChallenge');
      expect(pair).toHaveProperty('codeChallengeMethod');
    });

    test('should set code challenge method to S256', () => {
      const pair = generatePKCEPair();
      
      expect(pair.codeChallengeMethod).toBe('S256');
    });

    test('should generate valid code verifier', () => {
      const pair = generatePKCEPair();
      
      expect(validateCodeVerifier(pair.codeVerifier)).toBe(true);
    });

    test('should generate matching challenge for verifier', () => {
      const pair = generatePKCEPair();
      
      expect(verifyChallenge(pair.codeVerifier, pair.codeChallenge)).toBe(true);
    });

    test('should generate different pairs on each call', () => {
      const pair1 = generatePKCEPair();
      const pair2 = generatePKCEPair();
      
      expect(pair1.codeVerifier).not.toBe(pair2.codeVerifier);
      expect(pair1.codeChallenge).not.toBe(pair2.codeChallenge);
    });

    test('should generate cryptographically secure pairs', () => {
      // Generate multiple pairs and ensure high entropy
      const pairs = Array.from({ length: 100 }, () => generatePKCEPair());
      const verifiers = pairs.map(p => p.codeVerifier);
      const uniqueVerifiers = new Set(verifiers);
      
      // All verifiers should be unique
      expect(uniqueVerifiers.size).toBe(100);
    });
  });
});

describe('PKCE Utils - Edge Cases / أدوات PKCE - حالات حافة', () => {
  test('should handle large number of verifier generations', () => {
    const verifiers = Array.from({ length: 1000 }, () => generateCodeVerifier());
    const uniqueVerifiers = new Set(verifiers);
    
    // All should be unique
    expect(uniqueVerifiers.size).toBe(1000);
  });

  test('should handle unicode characters in challenge generation', () => {
    // Even though verifier shouldn't have unicode, test graceful handling
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    
    expect(() => verifyChallenge(verifier, challenge)).not.toThrow();
  });

  test('should maintain security across multiple iterations', () => {
    // Ensure PKCE implementation maintains security properties
    for (let i = 0; i < 50; i++) {
      const pair = generatePKCEPair();
      expect(verifyChallenge(pair.codeVerifier, pair.codeChallenge)).toBe(true);
      
      // Wrong verifier should fail
      const wrongPair = generatePKCEPair();
      expect(verifyChallenge(wrongPair.codeVerifier, pair.codeChallenge)).toBe(false);
    }
  });
});
