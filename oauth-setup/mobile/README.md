# Mobile OAuth Integration Security Guide

## 🔒 CRITICAL SECURITY WARNING

**NEVER store tokens in:**
- ❌ `localStorage`
- ❌ `AsyncStorage` (React Native)
- ❌ `SharedPreferences` (Android - plain)
- ❌ `UserDefaults` (iOS - plain)
- ❌ Any unencrypted storage

**Consequences of insecure storage:**
- Tokens can be easily extracted by malicious apps
- No encryption or OS-level security
- Vulnerable to data theft
- Violates OAuth 2.0 security best practices

## ✅ SECURE STORAGE SOLUTIONS

### React Native
**REQUIRED:** Use `react-native-keychain`
- Hardware-backed encryption (where available)
- Keychain (iOS) / Keystore (Android)
- Secure enclave integration

### Flutter  
**REQUIRED:** Use `flutter_secure_storage`
- Keychain (iOS)
- KeyStore (Android)
- Hardware-backed encryption

## 📱 Platform-Specific Security

### iOS Security
- Tokens stored in iOS Keychain
- Hardware encryption via Secure Enclave
- Protected by device passcode/biometrics
- Data inaccessible when device is locked

### Android Security
- Tokens stored in Android KeyStore
- Hardware-backed encryption (on supported devices)
- Protected by device security
- Encrypted at rest

## 🚨 Common Mistakes to Avoid

### ❌ DON'T DO THIS:
```javascript
// INSECURE - DO NOT USE
AsyncStorage.setItem('access_token', token);
localStorage.setItem('access_token', token);
```

### ✅ DO THIS INSTEAD:
```javascript
// SECURE - Use react-native-keychain
import * as Keychain from 'react-native-keychain';

await Keychain.setGenericPassword('access_token', token, {
  service: 'com.yourapp.oauth',
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED
});
```

## 🔐 Token Lifecycle Best Practices

1. **Storage:**
   - Store access token in secure storage
   - Store refresh token in secure storage
   - NEVER log tokens to console in production

2. **Transmission:**
   - ALWAYS use HTTPS
   - Use Authorization header: `Bearer <token>`
   - Never pass tokens in URL parameters

3. **Expiration:**
   - Access tokens: 15 minutes
   - Refresh tokens: 30 days with rotation
   - Implement auto-refresh before expiry

4. **Revocation:**
   - Clear tokens on logout
   - Revoke tokens server-side
   - Handle token revocation errors

## 📚 Implementation Guides

See the following files for complete examples:
- `react-native/` - React Native implementation
- `flutter/` - Flutter implementation

## 🔗 Additional Resources

- [OAuth 2.0 for Native Apps (RFC 8252)](https://datatracker.ietf.org/doc/html/rfc8252)
- [PKCE (RFC 7636)](https://datatracker.ietf.org/doc/html/rfc7636)
- [React Native Keychain](https://github.com/oblador/react-native-keychain)
- [Flutter Secure Storage](https://pub.dev/packages/flutter_secure_storage)

## ⚠️ Security Checklist

Before deploying your mobile app, ensure:
- [ ] Tokens stored in secure storage ONLY
- [ ] HTTPS enforced for all API calls
- [ ] PKCE implemented in OAuth flow
- [ ] Auto-refresh implemented
- [ ] Token revocation on logout
- [ ] No tokens logged in production
- [ ] App uses certificate pinning (recommended)
- [ ] ProGuard/R8 enabled (Android)
- [ ] Bitcode enabled (iOS)
