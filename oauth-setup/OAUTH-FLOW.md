# OAuth 2.0 with PKCE Flow Documentation
# وثائق تدفق OAuth 2.0 مع PKCE

## Overview / نظرة عامة

This document describes the complete OAuth 2.0 authorization flow with PKCE (Proof Key for Code Exchange) as implemented in the Codex Universal OAuth system.

يصف هذا المستند تدفق تفويض OAuth 2.0 الكامل مع PKCE (إثبات المفتاح لتبادل الرمز) كما تم تنفيذه في نظام Codex Universal OAuth.

## Why PKCE? / لماذا PKCE؟

PKCE (RFC 7636) adds security to the OAuth 2.0 authorization code flow by:
- **Preventing authorization code interception attacks** / منع هجمات اعتراض رمز التفويض
- **Securing public clients (mobile apps, SPAs)** / تأمين العملاء العامين (تطبيقات الجوال، SPAs)
- **Eliminating need for client secret in mobile apps** / إزالة الحاجة إلى سر العميل في تطبيقات الجوال
- **Using cryptographic proof instead of shared secrets** / استخدام إثبات التشفير بدلاً من الأسرار المشتركة

## Complete OAuth Flow with PKCE

### Step-by-Step Process / العملية خطوة بخطوة

```
┌─────────────┐                                           ┌─────────────┐
│   Client    │                                           │   GitHub    │
│ Application │                                           │   OAuth     │
└──────┬──────┘                                           └──────┬──────┘
       │                                                          │
       │  1. Generate PKCE pair                                  │
       │     code_verifier = random(43-128 chars)                │
       │     code_challenge = SHA256(code_verifier)              │
       │                                                          │
       │                                                          │
       │  2. Redirect to OAuth provider                          │
       │     with code_challenge                                 │
       │─────────────────────────────────────────────────────────>│
       │     GET /auth/github?                                   │
       │         client_id=...                                   │
       │         redirect_uri=...                                │
       │         code_challenge=...                              │
       │         code_challenge_method=S256                      │
       │         state=...                                       │
       │                                                          │
       │                                                          │
       │  3. User authorizes application                         │
       │<─────────────────────────────────────────────────────────│
       │     [User Login & Consent Screen]                       │
       │                                                          │
       │                                                          │
       │  4. Redirect back with authorization code               │
       │<─────────────────────────────────────────────────────────│
       │     GET /callback?                                      │
       │         code=AUTH_CODE                                  │
       │         state=...                                       │
       │                                                          │
       │                                                          │
       │  5. Exchange code for tokens                            │
       │     with code_verifier                                  │
       │─────────────────────────────────────────────────────────>│
       │     POST /token                                         │
       │         grant_type=authorization_code                   │
       │         code=AUTH_CODE                                  │
       │         code_verifier=...                               │
       │         redirect_uri=...                                │
       │                                                          │
       │  6. Verify code_challenge                               │
       │     SHA256(code_verifier) == code_challenge?            │
       │                                                          │
       │                                                          │
       │  7. Return access_token + refresh_token                 │
       │<─────────────────────────────────────────────────────────│
       │     {                                                   │
       │       "access_token": "...",                            │
       │       "refresh_token": "...",                           │
       │       "expires_in": 900 (15 minutes)                    │
       │     }                                                   │
       │                                                          │
       │                                                          │
       │  8. Access protected resources                          │
       │     with access_token                                   │
       │─────────────────────────────────>                       │
       │     GET /api/protected                                  │
       │     Authorization: Bearer ACCESS_TOKEN                  │
       │                                                          │
       │<─────────────────────────────────                       │
       │     200 OK                                              │
       │     { "data": "..." }                                   │
       │                                                          │
       │                                                          │
       │  9. When access token expires (after 15 min)            │
       │     Use refresh token to get new access token           │
       │─────────────────────────────────>                       │
       │     POST /auth/refresh                                  │
       │     { "refreshToken": "..." }                           │
       │                                                          │
       │<─────────────────────────────────                       │
       │     {                                                   │
       │       "accessToken": "NEW_TOKEN",                       │
       │       "refreshToken": "NEW_REFRESH_TOKEN"               │
       │     }                                                   │
       │     [Old refresh token is revoked]                      │
       │                                                          │
       └──────────────────────────────────────────────────────────┘
```

## Implementation Details / تفاصيل التنفيذ

### 1. PKCE Code Verifier Generation / إنشاء محقق رمز PKCE

```javascript
// Generate cryptographically secure random verifier (43-128 chars)
// إنشاء محقق عشوائي آمن من الناحية التشفيرية (43-128 حرفًا)
const codeVerifier = generateCodeVerifier();
// Example: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"

// Generate challenge using SHA256
// إنشاء التحدي باستخدام SHA256
const codeChallenge = generateCodeChallenge(codeVerifier);
// Example: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
```

**Security Properties:**
- Uses `crypto.randomBytes(32)` for high entropy
- Base64URL-encoded (RFC 4648 Section 5)
- No padding characters
- Length: 43-128 characters

### 2. Authorization Request / طلب التفويض

```http
GET /auth/github HTTP/1.1
Host: oauth-server.com

Parameters:
- response_type: code
- client_id: YOUR_CLIENT_ID
- redirect_uri: http://localhost:3000/callback
- code_challenge: E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
- code_challenge_method: S256
- state: random-csrf-token-123
- scope: user:email read:user
```

**Security Checks:**
- State parameter prevents CSRF attacks
- Redirect URI must exactly match whitelist
- Code challenge stored for later verification

### 3. Token Exchange / تبادل الرمز

```http
POST /auth/github/callback HTTP/1.1
Host: oauth-server.com
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "AUTHORIZATION_CODE",
  "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
  "redirect_uri": "http://localhost:3000/callback"
}
```

**Server Verification:**
```javascript
// Server verifies: SHA256(code_verifier) == stored code_challenge
const isValid = verifyChallenge(codeVerifier, storedChallenge);

if (isValid) {
  // Generate tokens
  const accessToken = generateToken(user);        // Expires: 15 minutes
  const refreshToken = generateRefreshToken(user); // Expires: 30 days
  
  return { accessToken, refreshToken };
}
```

**Security Properties:**
- Constant-time comparison prevents timing attacks
- Authorization code can only be used once
- Code verifier proves possession without transmitting it earlier

### 4. Token Rotation / تدوير الرموز

When access token expires:

```javascript
// Client sends refresh token
POST /auth/refresh
{
  "refreshToken": "OLD_REFRESH_TOKEN"
}

// Server response
{
  "accessToken": "NEW_ACCESS_TOKEN",
  "refreshToken": "NEW_REFRESH_TOKEN"  // New refresh token
}

// Old refresh token is immediately revoked
```

**Security: Refresh Token Reuse Detection**
```javascript
// If old refresh token is used again:
// 1. Detect reuse
// 2. Revoke ALL user tokens
// 3. Log security alert
// 4. Force re-authentication

revokeAllUserTokens(userId);
throw new Error('Refresh token reuse detected');
```

## Token Lifetimes / أعمار الرموز

| Token Type | Lifetime | Purpose |
|------------|----------|---------|
| Access Token | 15 minutes | API access |
| Refresh Token | 30 days | Obtain new access tokens |
| Authorization Code | 10 minutes | One-time exchange for tokens |

## Security Features / ميزات الأمان

### 1. PKCE (RFC 7636)
- ✅ S256 code challenge method (SHA-256)
- ✅ Cryptographically secure code verifier
- ✅ Constant-time verification
- ✅ Prevents authorization code interception

### 2. Token Security
- ✅ Short-lived access tokens (15 minutes)
- ✅ Refresh token rotation
- ✅ Token reuse detection
- ✅ Token blacklisting
- ✅ Automatic token revocation on security events

### 3. Redirect URI Validation
- ✅ Exact string matching (not startsWith)
- ✅ Whitelist-based validation
- ✅ HTTPS required in production
- ✅ Prevents open redirect attacks

### 4. CSRF Protection
- ✅ State parameter validation
- ✅ Session-based state storage
- ✅ One-time use authorization codes

### 5. Request Security
- ✅ Rate limiting (100 req/15min)
- ✅ Helmet security headers
- ✅ CORS with origin whitelist
- ✅ Request logging with token redaction

## Example Integration / مثال على التكامل

### Web Application

```javascript
// 1. Initiate OAuth with PKCE
const { codeVerifier, codeChallenge } = generatePKCEPair();

// Store verifier for later
sessionStorage.setItem('code_verifier', codeVerifier);

// Redirect to OAuth
window.location.href = 
  `${oauthUrl}?code_challenge=${codeChallenge}&code_challenge_method=S256`;

// 2. Handle callback
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const verifier = sessionStorage.getItem('code_verifier');

// 3. Exchange for tokens
const response = await fetch('/auth/token', {
  method: 'POST',
  body: JSON.stringify({ code, code_verifier: verifier })
});

const { accessToken, refreshToken } = await response.json();
```

### Mobile Application

```javascript
// React Native with react-native-keychain

import * as Keychain from 'react-native-keychain';

// 1. Generate PKCE pair
const { codeVerifier, codeChallenge } = generatePKCEPair();

// 2. Store verifier securely
await Keychain.setGenericPassword('code_verifier', codeVerifier);

// 3. Open OAuth in browser
await WebBrowser.openAuthSessionAsync(oauthUrl);

// 4. Handle deep link callback
const verifier = await Keychain.getGenericPassword();

// 5. Exchange for tokens
const tokens = await exchangeCodeForTokens(code, verifier);

// 6. Store tokens securely
await storeTokensSecurely(tokens.accessToken, tokens.refreshToken);
```

## Error Handling / معالجة الأخطاء

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `invalid_code_verifier` | Verifier doesn't match challenge | Regenerate PKCE pair |
| `invalid_redirect_uri` | URI not whitelisted | Add to ALLOWED_REDIRECT_URIS |
| `token_expired` | Access token expired | Use refresh token |
| `token_reuse_detected` | Refresh token used twice | Re-authenticate user |
| `invalid_state` | CSRF token mismatch | Regenerate state parameter |

## Configuration / التكوين

### Environment Variables

```env
# Token lifetimes
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=30d

# Allowed redirect URIs (exact match)
ALLOWED_REDIRECT_URIS=http://localhost:3000/callback,https://app.example.com/callback

# Security
JWT_SECRET=your-strong-secret-here
SESSION_SECRET=your-session-secret-here

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

## Best Practices / أفضل الممارسات

### ✅ DO:
1. Always use PKCE for public clients
2. Store code verifier securely (memory or secure storage)
3. Validate redirect URIs with exact matching
4. Use HTTPS in production
5. Implement refresh token rotation
6. Monitor for token reuse
7. Use short-lived access tokens (15 minutes)
8. Clear tokens on logout
9. Log security events

### ❌ DON'T:
1. Store code verifier in localStorage (web)
2. Reuse authorization codes
3. Use regex for redirect URI validation
4. Expose tokens in logs
5. Skip state parameter validation
6. Allow HTTP in production
7. Use long-lived access tokens
8. Share refresh tokens between devices
9. Ignore token expiration

## References / المراجع

- [RFC 7636 - PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [RFC 6749 - OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 8252 - OAuth 2.0 for Native Apps](https://datatracker.ietf.org/doc/html/rfc8252)
- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)

---

**Security:** This implementation follows OWASP Mobile Top 10 and OAuth 2.0 security best practices.

**الأمان:** يتبع هذا التنفيذ OWASP Mobile Top 10 وأفضل ممارسات أمان OAuth 2.0.
