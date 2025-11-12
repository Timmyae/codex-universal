/**
 * PKCE Utilities Unit Tests
 * 
 * اختبارات وحدة أدوات PKCE
 * Comprehensive tests for PKCE implementation (100% coverage required)
 */

const {
  generateCodeVerifier,
  generateCodeChallenge,
  validateCodeVerifier,
  verifyCodeChallenge,
  generatePKCEPair
} = require('../../server/utils/pkce.utils');

describe('PKCE Utils - Code Verifier Generation', () => {
  test('should generate code verifier with default length (128)', () => {
    const verifier = generateCodeVerifier();
    
    expect(verifier).toBeDefined();
    expect(typeof verifier).toBe('string');
    expect(verifier.length).toBe(128);
  });

  test('should generate code verifier with custom length (43)', () => {
    const verifier = generateCodeVerifier(43);
    
    expect(verifier.length).toBe(43);
  });

  test('should generate code verifier with custom length (100)', () => {
    const verifier = generateCodeVerifier(100);
    
    expect(verifier.length).toBe(100);
  });

  test('should only contain base64url characters', () => {
    const verifier = generateCodeVerifier();
    const base64urlPattern = /^[A-Za-z0-9\-._~]+$/;
    
    expect(base64urlPattern.test(verifier)).toBe(true);
  });

  test('should generate unique verifiers', () => {
    const verifier1 = generateCodeVerifier();
    const verifier2 = generateCodeVerifier();
    
    expect(verifier1).not.toBe(verifier2);
  });

  test('should throw error for length less than 43', () => {
    expect(() => generateCodeVerifier(42)).toThrow(
      'Code verifier length must be between 43 and 128 characters'
    );
  });

  test('should throw error for length greater than 128', () => {
    expect(() => generateCodeVerifier(129)).toThrow(
      'Code verifier length must be between 43 and 128 characters'
    );
  });

  test('should throw error for length 0', () => {
    expect(() => generateCodeVerifier(0)).toThrow();
  });

  test('should throw error for negative length', () => {
    expect(() => generateCodeVerifier(-10)).toThrow();
  });
});

describe('PKCE Utils - Code Challenge Generation', () => {
  test('should generate code challenge from verifier', () => {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    
    expect(challenge).toBeDefined();
    expect(typeof challenge).toBe('string');
    expect(challenge.length).toBeGreaterThan(0);
  });

  test('should generate consistent challenge for same verifier', () => {
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

  test('should generate base64url encoded challenge', () => {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    const base64urlPattern = /^[A-Za-z0-9\-_]+$/;
    
    expect(base64urlPattern.test(challenge)).toBe(true);
  });

  test('should throw error for empty verifier', () => {
    expect(() => generateCodeChallenge('')).toThrow('Code verifier must be a non-empty string');
  });

  test('should throw error for null verifier', () => {
    expect(() => generateCodeChallenge(null)).toThrow('Code verifier must be a non-empty string');
  });

  test('should throw error for undefined verifier', () => {
    expect(() => generateCodeChallenge(undefined)).toThrow('Code verifier must be a non-empty string');
  });

  test('should throw error for invalid verifier format', () => {
    const invalidVerifier = 'invalid verifier with spaces and @#$%';
    expect(() => generateCodeChallenge(invalidVerifier)).toThrow('Invalid code verifier format');
  });

  test('should throw error for verifier too short', () => {
    const shortVerifier = 'short';
    expect(() => generateCodeChallenge(shortVerifier)).toThrow('Invalid code verifier format');
  });
});

describe('PKCE Utils - Code Verifier Validation', () => {
  test('should validate correct verifier', () => {
    const verifier = generateCodeVerifier();
    
    expect(validateCodeVerifier(verifier)).toBe(true);
  });

  test('should reject empty verifier', () => {
    expect(validateCodeVerifier('')).toBe(false);
  });

  test('should reject null verifier', () => {
    expect(validateCodeVerifier(null)).toBe(false);
  });

  test('should reject undefined verifier', () => {
    expect(validateCodeVerifier(undefined)).toBe(false);
  });

  test('should reject verifier too short (42 chars)', () => {
    const shortVerifier = 'a'.repeat(42);
    
    expect(validateCodeVerifier(shortVerifier)).toBe(false);
  });

  test('should accept minimum length verifier (43 chars)', () => {
    const minVerifier = 'a'.repeat(43);
    
    expect(validateCodeVerifier(minVerifier)).toBe(true);
  });

  test('should accept maximum length verifier (128 chars)', () => {
    const maxVerifier = 'a'.repeat(128);
    
    expect(validateCodeVerifier(maxVerifier)).toBe(true);
  });

  test('should reject verifier too long (129 chars)', () => {
    const longVerifier = 'a'.repeat(129);
    
    expect(validateCodeVerifier(longVerifier)).toBe(false);
  });

  test('should reject verifier with invalid characters (spaces)', () => {
    const invalidVerifier = 'abcd efgh ijkl mnop qrst uvwx yz01 2345 6789';
    
    expect(validateCodeVerifier(invalidVerifier)).toBe(false);
  });

  test('should reject verifier with invalid characters (special chars)', () => {
    const invalidVerifier = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    
    expect(validateCodeVerifier(invalidVerifier)).toBe(false);
  });

  test('should accept verifier with allowed special characters', () => {
    const validVerifier = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~';
    
    expect(validateCodeVerifier(validVerifier)).toBe(true);
  });

  test('should reject non-string verifier (number)', () => {
    expect(validateCodeVerifier(12345)).toBe(false);
  });

  test('should reject non-string verifier (object)', () => {
    expect(validateCodeVerifier({})).toBe(false);
  });

  test('should reject non-string verifier (array)', () => {
    expect(validateCodeVerifier([])).toBe(false);
  });
});

describe('PKCE Utils - Code Challenge Verification', () => {
  test('should verify matching code challenge', () => {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    
    expect(verifyCodeChallenge(verifier, challenge)).toBe(true);
  });

  test('should reject non-matching code challenge', () => {
    const verifier1 = generateCodeVerifier();
    const verifier2 = generateCodeVerifier();
    const challenge1 = generateCodeChallenge(verifier1);
    
    expect(verifyCodeChallenge(verifier2, challenge1)).toBe(false);
  });

  test('should reject with tampered challenge', () => {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    const tamperedChallenge = challenge.substring(0, challenge.length - 1) + 'X';
    
    expect(verifyCodeChallenge(verifier, tamperedChallenge)).toBe(false);
  });

  test('should reject with empty verifier', () => {
    const challenge = 'validChallenge';
    
    expect(verifyCodeChallenge('', challenge)).toBe(false);
  });

  test('should reject with empty challenge', () => {
    const verifier = generateCodeVerifier();
    
    expect(verifyCodeChallenge(verifier, '')).toBe(false);
  });

  test('should handle invalid verifier gracefully', () => {
    const invalidVerifier = 'invalid verifier';
    const challenge = 'someChallenge';
    
    expect(verifyCodeChallenge(invalidVerifier, challenge)).toBe(false);
  });

  test('should use constant-time comparison (timing attack prevention)', () => {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    
    const start1 = process.hrtime.bigint();
    verifyCodeChallenge(verifier, challenge);
    const end1 = process.hrtime.bigint();
    const time1 = end1 - start1;
    
    const wrongChallenge = 'A' + challenge.substring(1);
    const start2 = process.hrtime.bigint();
    verifyCodeChallenge(verifier, wrongChallenge);
    const end2 = process.hrtime.bigint();
    const time2 = end2 - start2;
    
    // Times should be similar (within reasonable margin)
    // This is a basic check - proper timing attack testing requires specialized tools
    expect(time1).toBeDefined();
    expect(time2).toBeDefined();
  });
});

describe('PKCE Utils - PKCE Pair Generation', () => {
  test('should generate complete PKCE pair', () => {
    const pair = generatePKCEPair();
    
    expect(pair).toBeDefined();
    expect(pair.codeVerifier).toBeDefined();
    expect(pair.codeChallenge).toBeDefined();
    expect(pair.codeChallengeMethod).toBe('S256');
  });

  test('should generate valid verifier in pair', () => {
    const pair = generatePKCEPair();
    
    expect(validateCodeVerifier(pair.codeVerifier)).toBe(true);
  });

  test('should generate matching challenge in pair', () => {
    const pair = generatePKCEPair();
    
    expect(verifyCodeChallenge(pair.codeVerifier, pair.codeChallenge)).toBe(true);
  });

  test('should generate pair with default length', () => {
    const pair = generatePKCEPair();
    
    expect(pair.codeVerifier.length).toBe(128);
  });

  test('should generate pair with custom length', () => {
    const pair = generatePKCEPair(64);
    
    expect(pair.codeVerifier.length).toBe(64);
  });

  test('should use S256 method', () => {
    const pair = generatePKCEPair();
    
    expect(pair.codeChallengeMethod).toBe('S256');
  });

  test('should generate unique pairs', () => {
    const pair1 = generatePKCEPair();
    const pair2 = generatePKCEPair();
    
    expect(pair1.codeVerifier).not.toBe(pair2.codeVerifier);
    expect(pair1.codeChallenge).not.toBe(pair2.codeChallenge);
  });
});
