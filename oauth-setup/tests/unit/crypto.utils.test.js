/**
 * Crypto Utilities Unit Tests
 * 
 * اختبارات وحدة أدوات التشفير
 */

const {
  generateSecureRandom,
  generateBase64UrlRandom,
  sha256,
  sha256Base64Url,
  timingSafeEqual,
  encrypt,
  decrypt,
  generateEncryptionKey,
  hmacSha256,
  verifyHmacSha256,
} = require('../../server/utils/crypto.utils');

describe('Crypto Utils - Random Generation', () => {
  test('should generate secure random hex string', () => {
    const random = generateSecureRandom(32);
    expect(random).toBeDefined();
    expect(random.length).toBe(64); // 32 bytes = 64 hex chars
    expect(/^[0-9a-f]+$/.test(random)).toBe(true);
  });

  test('should generate unique random strings', () => {
    const random1 = generateSecureRandom();
    const random2 = generateSecureRandom();
    expect(random1).not.toBe(random2);
  });

  test('should generate base64url random string', () => {
    const random = generateBase64UrlRandom(32);
    expect(random).toBeDefined();
    expect(/^[A-Za-z0-9\-_]+$/.test(random)).toBe(true);
  });
});

describe('Crypto Utils - Hashing', () => {
  test('should hash string with SHA256', () => {
    const hash = sha256('test data');
    expect(hash).toBeDefined();
    expect(hash.length).toBe(64); // SHA256 produces 64 hex chars
  });

  test('should produce consistent hashes', () => {
    const hash1 = sha256('test data');
    const hash2 = sha256('test data');
    expect(hash1).toBe(hash2);
  });

  test('should produce different hashes for different data', () => {
    const hash1 = sha256('test data 1');
    const hash2 = sha256('test data 2');
    expect(hash1).not.toBe(hash2);
  });

  test('should hash to base64url format', () => {
    const hash = sha256Base64Url('test data');
    expect(hash).toBeDefined();
    expect(/^[A-Za-z0-9\-_]+$/.test(hash)).toBe(true);
  });
});

describe('Crypto Utils - Timing Safe Comparison', () => {
  test('should return true for equal strings', () => {
    const result = timingSafeEqual('hello', 'hello');
    expect(result).toBe(true);
  });

  test('should return false for different strings', () => {
    const result = timingSafeEqual('hello', 'world');
    expect(result).toBe(false);
  });

  test('should return false for different lengths', () => {
    const result = timingSafeEqual('hello', 'hello world');
    expect(result).toBe(false);
  });

  test('should return false for non-string inputs', () => {
    expect(timingSafeEqual(123, 123)).toBe(false);
    expect(timingSafeEqual(null, 'test')).toBe(false);
    expect(timingSafeEqual('test', undefined)).toBe(false);
  });
});

describe('Crypto Utils - Encryption/Decryption', () => {
  test('should encrypt and decrypt data', () => {
    const plaintext = 'sensitive data';
    const key = generateEncryptionKey();
    
    const encrypted = encrypt(plaintext, key);
    expect(encrypted.encrypted).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.authTag).toBeDefined();
    
    const decrypted = decrypt(encrypted.encrypted, key, encrypted.iv, encrypted.authTag);
    expect(decrypted).toBe(plaintext);
  });

  test('should generate valid encryption key', () => {
    const key = generateEncryptionKey();
    expect(key).toBeDefined();
    expect(key.length).toBe(64); // 32 bytes = 64 hex chars
  });

  test('should fail decryption with wrong key', () => {
    const plaintext = 'sensitive data';
    const key1 = generateEncryptionKey();
    const key2 = generateEncryptionKey();
    
    const encrypted = encrypt(plaintext, key1);
    
    expect(() => {
      decrypt(encrypted.encrypted, key2, encrypted.iv, encrypted.authTag);
    }).toThrow();
  });
});

describe('Crypto Utils - HMAC', () => {
  test('should generate HMAC signature', () => {
    const signature = hmacSha256('data', 'secret');
    expect(signature).toBeDefined();
    expect(signature.length).toBe(64);
  });

  test('should generate consistent signatures', () => {
    const sig1 = hmacSha256('data', 'secret');
    const sig2 = hmacSha256('data', 'secret');
    expect(sig1).toBe(sig2);
  });

  test('should verify valid HMAC signature', () => {
    const data = 'test data';
    const secret = 'secret key';
    const signature = hmacSha256(data, secret);
    
    expect(verifyHmacSha256(data, signature, secret)).toBe(true);
  });

  test('should reject invalid HMAC signature', () => {
    const data = 'test data';
    const secret = 'secret key';
    const wrongSignature = 'wrong signature';
    
    expect(verifyHmacSha256(data, wrongSignature, secret)).toBe(false);
  });
});
