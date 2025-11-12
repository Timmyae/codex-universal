# Security Documentation
# توثيق الأمان

## 🔒 Security Overview

This document outlines the security architecture, best practices, and threat model for the OAuth 2.0 implementation.

## Security Features

### 1. PKCE (Proof Key for Code Exchange)

**Purpose:** Prevents authorization code interception attacks

**Implementation:**
- S256 challenge method (SHA-256 based)
- 128-character cryptographically random code verifier
- Code challenge transmitted in authorization request
- Code verifier validated during token exchange
- Stored in server session (never in client storage)

**Protection Against:**
- Authorization code interception
- Man-in-the-middle attacks
- Mobile app security vulnerabilities

### 2. Token Security

**Access Tokens:**
- Short-lived (15 minutes default)
- JWT format with signature verification
- Includes unique token ID for revocation
- Blacklist support for immediate revocation

**Refresh Tokens:**
- Longer-lived (30 days default)
- One-time-use with mandatory rotation
- Family-based revocation on reuse detection
- Stored with metadata for security tracking

**Token Storage:**
- Server: In-memory or Redis for blacklist
- Mobile: Hardware-backed keychain/keystore only
- Web: HttpOnly cookies (not implemented in current version)
- **NEVER:** localStorage, AsyncStorage, plain storage

### 3. Attack Prevention

#### Replay Attack Prevention
- Refresh tokens are one-time-use only
- Authorization codes cannot be reused
- Token blacklist prevents revoked token use
- Token family revocation on suspicious activity

#### Open Redirect Prevention
- Strict redirect URI validation
- Exact match only (no wildcards)
- Whitelist-based validation
- Protocol verification (HTTPS in production)
- No path traversal or external domains allowed

#### CSRF Protection
- State parameter in OAuth flow
- Cryptographically random state generation
- Session-based state validation
- Constant-time comparison

#### Rate Limiting
- IP-based rate limiting
- Different limits for different endpoints
- Auth endpoints: 20 requests/15 minutes
- General endpoints: 100 requests/15 minutes
- Token refresh: 10 requests/15 minutes

### 4. Security Headers

Implemented via Helmet.js:
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: enabled
- Referrer-Policy: strict-origin-when-cross-origin

### 5. CORS Protection

- Whitelist-based origin validation
- Credentials support for authorized origins
- No wildcard origins in production
- Exposed headers limited to essential ones

## Threat Model

### Threats & Mitigations

| Threat | Severity | Mitigation |
|--------|----------|------------|
| **Authorization Code Interception** | High | PKCE with S256 method |
| **Token Theft** | High | Short-lived tokens, secure storage, revocation |
| **Refresh Token Reuse** | High | One-time-use with family revocation |
| **Open Redirect** | High | Strict whitelist validation |
| **CSRF** | Medium | State parameter, session validation |
| **XSS** | Medium | Security headers, CSP |
| **Replay Attacks** | Medium | Token blacklist, nonce validation |
| **Brute Force** | Medium | Rate limiting |
| **Session Fixation** | Low | Secure session management |

### Attack Scenarios

#### Scenario 1: Authorization Code Interception
**Attack:** Attacker intercepts authorization code
**Mitigation:** PKCE ensures only client with code_verifier can exchange code

#### Scenario 2: Stolen Refresh Token
**Attack:** Attacker steals refresh token from storage
**Mitigation:**
1. Hardware-backed storage makes theft difficult
2. One-time-use prevents token reuse
3. Family revocation invalidates all related tokens

#### Scenario 3: Open Redirect
**Attack:** Attacker redirects user to malicious site with tokens
**Mitigation:** Strict whitelist prevents unauthorized redirects

#### Scenario 4: Token Replay
**Attack:** Attacker reuses captured token
**Mitigation:** Token blacklist and expiry prevent reuse

## Security Best Practices

### For Developers

#### 1. Environment Configuration
```bash
# Generate strong secrets (minimum 256 bits)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Configure in .env
JWT_SECRET=<generated_secret>
SESSION_SECRET=<generated_secret>
ALLOWED_REDIRECT_URIS=<comma_separated_list>
```

#### 2. Production Deployment
- Set `NODE_ENV=production`
- Enable `ENFORCE_HTTPS=true`
- Configure Redis for token blacklist
- Use strong secrets (minimum 256 bits)
- Limit CORS origins to production domains
- Enable security logging and monitoring

#### 3. Token Management
```javascript
// ✅ DO: Store tokens securely
await Keychain.setGenericPassword('access_token', token, {
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED
});

// ❌ DON'T: Store in plain storage
localStorage.setItem('access_token', token); // NEVER DO THIS
AsyncStorage.setItem('access_token', token); // NEVER DO THIS
```

#### 4. Error Handling
- Never leak sensitive information in errors
- Log security violations for audit
- Return generic error messages to clients
- Monitor for suspicious patterns

### For Mobile Developers

#### React Native
```javascript
// Required: react-native-keychain
import * as Keychain from 'react-native-keychain';

// Store token
await Keychain.setGenericPassword('access_token', token, {
  service: 'com.yourapp.oauth',
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY
});
```

#### Flutter
```dart
// Required: flutter_secure_storage
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final storage = FlutterSecureStorage(
  aOptions: AndroidOptions(
    encryptedSharedPreferences: true,
    storageCipherAlgorithm: StorageCipherAlgorithm.AES_GCM_NoPadding,
  ),
  iOptions: IOSOptions(
    accessibility: KeychainAccessibility.unlocked,
  ),
);

await storage.write(key: 'access_token', value: token);
```

## Security Checklist

### Pre-Deployment
- [ ] Strong secrets configured (256+ bits)
- [ ] HTTPS enforced in production
- [ ] PKCE enabled
- [ ] Redis configured for token blacklist
- [ ] Rate limiting configured appropriately
- [ ] CORS origins limited to production domains
- [ ] Redirect URIs whitelisted (no wildcards)
- [ ] Security headers enabled
- [ ] Error messages don't leak information
- [ ] Logging configured (no sensitive data logged)

### Mobile Apps
- [ ] Using react-native-keychain (React Native)
- [ ] Using flutter_secure_storage (Flutter)
- [ ] No tokens in AsyncStorage/SharedPreferences
- [ ] No tokens in localStorage
- [ ] Deep linking configured correctly
- [ ] Certificate pinning implemented (recommended)
- [ ] ProGuard/R8 enabled (Android)
- [ ] Bitcode enabled (iOS)

### Testing
- [ ] All security tests passing
- [ ] Penetration testing completed
- [ ] Code review for security issues
- [ ] Dependency vulnerabilities checked
- [ ] OWASP Top 10 compliance verified

## Compliance

### Standards & Regulations
- **OAuth 2.0:** RFC 6749
- **PKCE:** RFC 7636
- **JWT:** RFC 7519
- **OAuth 2.0 for Native Apps:** RFC 8252
- **GDPR:** Personal data protection
- **CCPA:** California Consumer Privacy Act
- **PCI DSS:** Payment card data security (if applicable)

### Security Auditing

**Recommended:**
- Regular security audits
- Penetration testing
- Dependency vulnerability scanning
- SAST/DAST analysis
- Bug bounty program

## Incident Response

### Security Incident Handling

1. **Detection:**
   - Monitor logs for security violations
   - Alert on suspicious patterns
   - Track token reuse attempts

2. **Response:**
   - Revoke compromised tokens immediately
   - Invalidate token families if needed
   - Notify affected users
   - Document incident details

3. **Recovery:**
   - Patch vulnerabilities
   - Update security measures
   - Review and improve processes

4. **Post-Incident:**
   - Conduct root cause analysis
   - Update threat model
   - Improve detection mechanisms

## Security Contacts

For security issues:
- Email: security@example.com
- Encrypt: Use PGP key (if available)
- Response time: 24-48 hours

## Additional Resources

- [OWASP OAuth 2.0 Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)
- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [OAuth 2.0 for Native Apps RFC 8252](https://datatracker.ietf.org/doc/html/rfc8252)

---

**Last Updated:** 2024
**Version:** 1.0.0
