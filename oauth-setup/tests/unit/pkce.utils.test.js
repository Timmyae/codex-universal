const {
  generateCodeVerifier,
  generateCodeChallenge,
  verifyCodeChallenge,
  base64URLEncode
} = require('../../server/utils/pkce.utils');

describe('PKCE Utils', () => {
  describe('generateCodeVerifier', () => {
    it('should generate a code verifier with default length', () => {
      const verifier = generateCodeVerifier();
      expect(verifier).toBeDefined();
      expect(verifier.length).toBe(128);
      expect(typeof verifier).toBe('string');
    });

    it('should generate a code verifier with custom length', () => {
      const verifier = generateCodeVerifier(64);
      expect(verifier.length).toBe(64);
    });

    it('should generate unique code verifiers', () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      expect(verifier1).not.toBe(verifier2);
    });

    it('should throw error for invalid length (too short)', () => {
      expect(() => generateCodeVerifier(42)).toThrow(
        'Code verifier length must be between 43 and 128 characters'
      );
    });

    it('should throw error for invalid length (too long)', () => {
      expect(() => generateCodeVerifier(129)).toThrow(
        'Code verifier length must be between 43 and 128 characters'
      );
    });

    it('should accept minimum valid length', () => {
      const verifier = generateCodeVerifier(43);
      expect(verifier.length).toBe(43);
    });

    it('should accept maximum valid length', () => {
      const verifier = generateCodeVerifier(128);
      expect(verifier.length).toBe(128);
    });
  });

  describe('generateCodeChallenge', () => {
    it('should generate a code challenge from a verifier', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      expect(challenge).toBeDefined();
      expect(typeof challenge).toBe('string');
      expect(challenge.length).toBeGreaterThan(0);
    });

    it('should generate consistent challenges for the same verifier', () => {
      const verifier = generateCodeVerifier();
      const challenge1 = generateCodeChallenge(verifier);
      const challenge2 = generateCodeChallenge(verifier);
      expect(challenge1).toBe(challenge2);
    });

    it('should generate different challenges for different verifiers', () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      const challenge1 = generateCodeChallenge(verifier1);
      const challenge2 = generateCodeChallenge(verifier2);
      expect(challenge1).not.toBe(challenge2);
    });

    it('should throw error for null verifier', () => {
      expect(() => generateCodeChallenge(null)).toThrow(
        'Code verifier must be a non-empty string'
      );
    });

    it('should throw error for empty string verifier', () => {
      expect(() => generateCodeChallenge('')).toThrow(
        'Code verifier must be a non-empty string'
      );
    });

    it('should throw error for non-string verifier', () => {
      expect(() => generateCodeChallenge(123)).toThrow(
        'Code verifier must be a non-empty string'
      );
    });
  });

  describe('verifyCodeChallenge', () => {
    it('should verify valid code verifier and challenge pair', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      expect(verifyCodeChallenge(verifier, challenge)).toBe(true);
    });

    it('should reject invalid verifier for challenge', () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier1);
      expect(verifyCodeChallenge(verifier2, challenge)).toBe(false);
    });

    it('should return false for null verifier', () => {
      const challenge = generateCodeChallenge(generateCodeVerifier());
      expect(verifyCodeChallenge(null, challenge)).toBe(false);
    });

    it('should return false for null challenge', () => {
      const verifier = generateCodeVerifier();
      expect(verifyCodeChallenge(verifier, null)).toBe(false);
    });

    it('should return false for empty strings', () => {
      expect(verifyCodeChallenge('', '')).toBe(false);
    });

    it('should handle tampered challenges', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      const tamperedChallenge = challenge.substring(0, challenge.length - 1) + 'X';
      expect(verifyCodeChallenge(verifier, tamperedChallenge)).toBe(false);
    });
  });

  describe('base64URLEncode', () => {
    it('should encode buffer to base64 URL format', () => {
      const buffer = Buffer.from('test');
      const encoded = base64URLEncode(buffer);
      expect(typeof encoded).toBe('string');
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
    });

    it('should handle empty buffer', () => {
      const buffer = Buffer.from('');
      const encoded = base64URLEncode(buffer);
      expect(encoded).toBe('');
    });

    it('should produce different outputs for different inputs', () => {
      const buffer1 = Buffer.from('test1');
      const buffer2 = Buffer.from('test2');
      const encoded1 = base64URLEncode(buffer1);
      const encoded2 = base64URLEncode(buffer2);
      expect(encoded1).not.toBe(encoded2);
    });
  });

  describe('Integration tests', () => {
    it('should complete full PKCE flow', () => {
      // Generate verifier
      const verifier = generateCodeVerifier();
      expect(verifier).toBeDefined();

      // Generate challenge
      const challenge = generateCodeChallenge(verifier);
      expect(challenge).toBeDefined();

      // Verify
      const isValid = verifyCodeChallenge(verifier, challenge);
      expect(isValid).toBe(true);
    });

    it('should handle multiple concurrent PKCE flows', () => {
      const flows = [];
      
      for (let i = 0; i < 10; i++) {
        const verifier = generateCodeVerifier();
        const challenge = generateCodeChallenge(verifier);
        flows.push({ verifier, challenge });
      }

      flows.forEach(flow => {
        expect(verifyCodeChallenge(flow.verifier, flow.challenge)).toBe(true);
      });

      // Cross-verify should fail
      expect(verifyCodeChallenge(flows[0].verifier, flows[1].challenge)).toBe(false);
    });
  });
});
