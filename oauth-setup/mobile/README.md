# Mobile Security Guide
# دليل أمان الجوال

## 🔐 Secure Token Storage for Mobile Apps

**CRITICAL:** Never store OAuth tokens in insecure storage!
**حرج:** لا تقم أبدًا بتخزين رموز OAuth في تخزين غير آمن!

This guide shows you how to securely store authentication tokens in mobile applications.
يوضح لك هذا الدليل كيفية تخزين رموز المصادقة بشكل آمن في تطبيقات الجوال.

---

## ⚠️ NEVER Use These (Insecure!)

### ❌ React Native - DON'T USE:
```javascript
// ❌ INSECURE - DO NOT USE
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem('token', accessToken); // VULNERABLE TO THEFT!
```

### ❌ Flutter - DON'T USE:
```dart
// ❌ INSECURE - DO NOT USE
import 'package:shared_preferences/shared_preferences.dart';
final prefs = await SharedPreferences.getInstance();
await prefs.setString('token', accessToken); // VULNERABLE TO THEFT!
```

### Why These Are Dangerous:
- **AsyncStorage/SharedPreferences are NOT encrypted**
- **Tokens can be extracted by malware or device access**
- **No hardware-backed security**
- **Violates OWASP mobile security guidelines**

### لماذا هذه خطيرة:
- **AsyncStorage/SharedPreferences غير مشفرة**
- **يمكن استخراج الرموز بواسطة البرامج الضارة أو الوصول إلى الجهاز**
- **لا يوجد أمان مدعوم بالأجهزة**
- **ينتهك إرشادات أمان OWASP للجوال**

---

## ✅ ALWAYS Use Secure Storage

### React Native - Use react-native-keychain

**Installation:**
```bash
npm install react-native-keychain
# or
yarn add react-native-keychain
```

**iOS Setup:**
Add to `ios/Podfile`:
```ruby
pod 'RNKeychain', :path => '../node_modules/react-native-keychain'
```

**Usage Example:**
```javascript
import * as Keychain from 'react-native-keychain';

// ✅ SECURE: Store token
async function storeToken(accessToken, refreshToken) {
  try {
    await Keychain.setGenericPassword(
      'oauth_token',
      JSON.stringify({
        accessToken,
        refreshToken,
        timestamp: Date.now()
      }),
      {
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        service: 'com.yourapp.oauth'
      }
    );
    console.log('✅ Tokens stored securely');
  } catch (error) {
    console.error('Failed to store tokens:', error);
  }
}

// ✅ SECURE: Retrieve token
async function getToken() {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: 'com.yourapp.oauth'
    });
    
    if (credentials) {
      const { accessToken, refreshToken } = JSON.parse(credentials.password);
      return { accessToken, refreshToken };
    }
    return null;
  } catch (error) {
    console.error('Failed to retrieve tokens:', error);
    return null;
  }
}

// ✅ SECURE: Delete token
async function deleteToken() {
  try {
    await Keychain.resetGenericPassword({
      service: 'com.yourapp.oauth'
    });
    console.log('✅ Tokens deleted securely');
  } catch (error) {
    console.error('Failed to delete tokens:', error);
  }
}
```

**See:** `react-native/SecureStorageExample.js` for complete implementation.

---

### Flutter - Use flutter_secure_storage

**Installation:**
Add to `pubspec.yaml`:
```yaml
dependencies:
  flutter_secure_storage: ^9.0.0
```

**Android Setup:**
Add to `android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        minSdkVersion 18  // Required for secure storage
    }
}
```

**Usage Example:**
```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';

final storage = FlutterSecureStorage(
  aOptions: AndroidOptions(
    encryptedSharedPreferences: true,
  ),
);

// ✅ SECURE: Store token
Future<void> storeToken(String accessToken, String refreshToken) async {
  try {
    final tokenData = jsonEncode({
      'accessToken': accessToken,
      'refreshToken': refreshToken,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    });
    
    await storage.write(
      key: 'oauth_tokens',
      value: tokenData,
    );
    print('✅ Tokens stored securely');
  } catch (e) {
    print('Failed to store tokens: $e');
  }
}

// ✅ SECURE: Retrieve token
Future<Map<String, String>?> getToken() async {
  try {
    final tokenData = await storage.read(key: 'oauth_tokens');
    
    if (tokenData != null) {
      final decoded = jsonDecode(tokenData);
      return {
        'accessToken': decoded['accessToken'],
        'refreshToken': decoded['refreshToken'],
      };
    }
    return null;
  } catch (e) {
    print('Failed to retrieve tokens: $e');
    return null;
  }
}

// ✅ SECURE: Delete token
Future<void> deleteToken() async {
  try {
    await storage.delete(key: 'oauth_tokens');
    print('✅ Tokens deleted securely');
  } catch (e) {
    print('Failed to delete tokens: $e');
  }
}
```

**See:** `flutter/secure_storage_example.dart` for complete implementation.

---

## 🔒 Security Features

### react-native-keychain:
- ✅ **iOS**: Uses Keychain Services (hardware-backed encryption)
- ✅ **Android**: Uses Keystore System (hardware-backed encryption)
- ✅ Biometric authentication support
- ✅ Device passcode fallback
- ✅ Encrypted at rest
- ✅ OWASP compliant

### flutter_secure_storage:
- ✅ **iOS**: Uses Keychain Services
- ✅ **Android**: Uses Keystore with AES encryption
- ✅ Automatic encryption
- ✅ Hardware-backed security (when available)
- ✅ OWASP compliant

---

## 📱 Platform-Specific Security

### iOS Security:
- Tokens stored in iOS Keychain
- Protected by device encryption
- Requires device unlock to access
- Optionally requires biometric auth
- Survives app uninstall (can be configured)

### Android Security:
- Tokens stored in Android Keystore
- Hardware-backed encryption (on supported devices)
- Protected by device lock
- TEE (Trusted Execution Environment) support
- Cleared on app uninstall

---

## 🚨 Security Warnings

### ⚠️ Warning Signs of Insecure Implementation:

1. **Storing tokens in AsyncStorage/SharedPreferences**
   - Risk: Easy to extract with root/jailbreak
   
2. **Storing tokens in plain text files**
   - Risk: Can be read by malware
   
3. **Logging tokens in console**
   - Risk: Visible in crash reports and logs
   
4. **Storing tokens in Redux state without persistence**
   - Risk: Lost on app restart (but good for security!)

5. **Transmitting tokens over HTTP (not HTTPS)**
   - Risk: Man-in-the-middle attacks

---

## ✅ Security Checklist

Before releasing your mobile app:

- [ ] Using react-native-keychain (React Native) or flutter_secure_storage (Flutter)
- [ ] NOT using AsyncStorage/SharedPreferences for tokens
- [ ] Tokens transmitted over HTTPS only
- [ ] Token expiry checking implemented
- [ ] Refresh token rotation implemented
- [ ] Biometric authentication enabled (optional)
- [ ] No tokens logged to console
- [ ] Certificate pinning implemented (optional, advanced)
- [ ] Code obfuscation enabled for production

---

## 📚 Additional Resources

- [OWASP Mobile Security Project](https://owasp.org/www-project-mobile-security/)
- [iOS Security Guide](https://support.apple.com/guide/security/welcome/web)
- [Android Security Best Practices](https://developer.android.com/training/articles/security-tips)
- [OAuth 2.0 for Native Apps (RFC 8252)](https://datatracker.ietf.org/doc/html/rfc8252)

---

## 🆘 Need Help?

Check our security examples:
- React Native: `react-native/SecureStorageExample.js`
- Flutter: `flutter/secure_storage_example.dart`
- Security Warnings: `SECURITY-WARNING.md`

**Remember: Security is not optional for OAuth tokens!**
**تذكر: الأمان ليس اختياريًا لرموز OAuth!**
