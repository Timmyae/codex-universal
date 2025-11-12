# Mobile OAuth Security Warning

## Critical Security Considerations for Mobile Apps

### ⚠️ DO NOT Store Tokens in Plain Text

**NEVER** store OAuth tokens in:
- `AsyncStorage` (React Native) - not encrypted
- `SharedPreferences` (Android) - not encrypted
- `UserDefaults` (iOS) - not encrypted
- Local storage in WebViews
- Plain text files
- Application preferences

### ✅ Required Security Measures

#### 1. Use Platform Secure Storage

**React Native:**
```javascript
// ✅ CORRECT - Use react-native-keychain
import * as Keychain from 'react-native-keychain';
await Keychain.setGenericPassword('username', 'token');

// ❌ WRONG - Don't use AsyncStorage
await AsyncStorage.setItem('token', 'value'); // INSECURE!
```

**Flutter:**
```dart
// ✅ CORRECT - Use flutter_secure_storage
final storage = FlutterSecureStorage();
await storage.write(key: 'token', value: 'value');

// ❌ WRONG - Don't use SharedPreferences
final prefs = await SharedPreferences.getInstance();
prefs.setString('token', 'value'); // INSECURE!
```

#### 2. Enable Biometric Protection

Always enable biometric authentication when available:

**React Native:**
```javascript
await Keychain.setGenericPassword('user', 'token', {
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY
});
```

**Flutter:**
```dart
// Configure during read/write operations
AndroidOptions(encryptedSharedPreferences: true)
IOSOptions(accessibility: KeychainAccessibility.first_unlock_this_device)
```

#### 3. Implement Token Rotation

Refresh tokens MUST be rotated on each use:

```javascript
// When refreshing access token
const newTokens = await fetch('/oauth/token', {
  method: 'POST',
  body: JSON.stringify({
    grant_type: 'refresh_token',
    refresh_token: oldRefreshToken
  })
});

// Store new tokens, old refresh token is now invalid
await storeTokens(newTokens.access_token, newTokens.refresh_token);
```

#### 4. Use PKCE for Authorization Code Flow

Always use PKCE (RFC 7636) for mobile OAuth:

```javascript
// Generate code verifier and challenge
const codeVerifier = generateCodeVerifier();
const codeChallenge = generateCodeChallenge(codeVerifier);

// Authorization request
const authUrl = `${authEndpoint}?` +
  `client_id=${clientId}&` +
  `redirect_uri=${redirectUri}&` +
  `response_type=code&` +
  `code_challenge=${codeChallenge}&` +
  `code_challenge_method=S256`;

// Token exchange
const tokens = await fetch(tokenEndpoint, {
  method: 'POST',
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code: authorizationCode,
    code_verifier: codeVerifier,  // Send verifier, not challenge
    client_id: clientId
  })
});
```

### 🔒 Additional Security Best Practices

#### Certificate Pinning

Implement SSL certificate pinning to prevent MITM attacks:

**React Native:**
```javascript
// Use react-native-ssl-pinning
import { fetch } from 'react-native-ssl-pinning';

fetch('https://oauth-server.com/token', {
  method: 'POST',
  sslPinning: {
    certs: ['cert1', 'cert2']
  }
});
```

#### Root/Jailbreak Detection

Detect compromised devices:

**React Native:**
```javascript
import JailMonkey from 'jail-monkey';

if (JailMonkey.isJailBroken()) {
  // Warn user or disable sensitive features
  Alert.alert('Security Warning', 'Device appears to be rooted/jailbroken');
}
```

#### Deep Link Security

Validate redirect URIs in deep links:

```javascript
// Custom URL scheme: myapp://oauth/callback
Linking.addEventListener('url', (event) => {
  const url = new URL(event.url);
  
  // Validate it's from your OAuth server
  if (url.searchParams.has('code')) {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    
    // Verify state matches what you sent
    if (state === storedState) {
      // Exchange code for tokens
      exchangeCodeForTokens(code);
    }
  }
});
```

#### Token Expiration Handling

Always check token expiration before API requests:

```javascript
async function makeAuthenticatedRequest(url) {
  let tokens = await getTokens();
  
  // Check if access token is expired
  if (isTokenExpired(tokens.accessToken)) {
    // Refresh the token
    tokens = await refreshAccessToken(tokens.refreshToken);
    
    if (!tokens) {
      // Refresh failed, require re-authentication
      redirectToLogin();
      return;
    }
  }
  
  // Make request with valid token
  return fetch(url, {
    headers: {
      'Authorization': `Bearer ${tokens.accessToken}`
    }
  });
}
```

### 🚨 Common Vulnerabilities to Avoid

1. **Storing tokens in logs**
   ```javascript
   // ❌ WRONG
   console.log('Access token:', accessToken);
   
   // ✅ CORRECT
   console.log('Access token: [REDACTED]');
   ```

2. **Sending tokens over HTTP**
   ```javascript
   // ❌ WRONG
   fetch('http://api.example.com/data', {  // HTTP not HTTPS!
     headers: { 'Authorization': `Bearer ${token}` }
   });
   
   // ✅ CORRECT
   fetch('https://api.example.com/data', {  // HTTPS only
     headers: { 'Authorization': `Bearer ${token}` }
   });
   ```

3. **Not validating redirect URIs**
   ```javascript
   // ❌ WRONG - Accept any redirect
   window.location.href = queryParams.redirect_uri;
   
   // ✅ CORRECT - Validate against whitelist
   if (allowedRedirects.includes(queryParams.redirect_uri)) {
     window.location.href = queryParams.redirect_uri;
   }
   ```

4. **Token leakage through screenshots**
   ```javascript
   // React Native - Disable screenshots for sensitive screens
   import { Platform } from 'react-native';
   
   if (Platform.OS === 'android') {
     // Disable screenshots
     const { SafeAreaView } = require('react-native-safe-area-context');
     // Use secure flag in native code
   }
   ```

### 📱 Platform-Specific Security

#### iOS Security

- Use Keychain with `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`
- Enable Face ID/Touch ID for token access
- Use App Transport Security (ATS)
- Implement app-specific entitlements

#### Android Security

- Use EncryptedSharedPreferences
- Implement fingerprint authentication
- Use Network Security Config
- Enable ProGuard/R8 obfuscation

### 🔍 Testing Security

Test your OAuth implementation for:

1. **Token storage encryption**
   - Verify tokens are not in plain text in device storage
   - Check if tokens are accessible without authentication

2. **Network security**
   - Verify all OAuth requests use HTTPS
   - Test certificate pinning effectiveness

3. **Token lifecycle**
   - Verify tokens are rotated correctly
   - Test token revocation on logout
   - Verify expired tokens are rejected

4. **PKCE implementation**
   - Verify code challenge is sent in auth request
   - Verify code verifier is sent in token request
   - Test that mismatched verifiers are rejected

### 📚 Additional Resources

- [RFC 8252: OAuth 2.0 for Native Apps](https://tools.ietf.org/html/rfc8252)
- [RFC 7636: PKCE](https://tools.ietf.org/html/rfc7636)
- [OWASP Mobile Security Testing Guide](https://owasp.org/www-project-mobile-security-testing-guide/)
- [OAuth 2.0 for Mobile & Desktop Apps (Google)](https://developers.google.com/identity/protocols/oauth2/native-app)

### ⚖️ Compliance

Ensure your implementation complies with:
- GDPR (data protection)
- CCPA (California privacy)
- HIPAA (if handling health data)
- PCI DSS (if handling payment data)

### 🆘 Incident Response

If tokens are compromised:

1. **Immediately revoke all tokens** for affected users
2. **Force re-authentication** on next app launch
3. **Notify users** if required by regulations
4. **Review and patch** the vulnerability
5. **Update app** and push to stores

---

**Remember: Security is not optional for OAuth implementations. Follow these guidelines to protect your users' data and your application's integrity.**
