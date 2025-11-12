# Integration Examples / أمثلة التكامل

This directory contains integration examples for different platforms and frameworks.

يحتوي هذا الدليل على أمثلة التكامل لمنصات وأطر عمل مختلفة.

## 📁 Available Examples / الأمثلة المتاحة

### 1. Web Client (`web-client.html`)
Complete HTML/JavaScript example showing OAuth integration in web applications.

مثال HTML/JavaScript كامل يوضح تكامل OAuth في تطبيقات الويب.

**Features / الميزات:**
- ✅ Beautiful UI with responsive design
- ✅ Login with GitHub
- ✅ Display user profile
- ✅ Test protected API endpoints
- ✅ Token management
- ✅ Logout functionality

**How to use / كيفية الاستخدام:**
1. Start the OAuth server
2. Open `web-client.html` in a browser
3. Update `API_BASE_URL` if needed
4. Click "Login with GitHub"

### 2. React Native (`react-native-example.js`)
Full React Native component for mobile OAuth integration.

مكون React Native كامل لتكامل OAuth في تطبيقات الجوال.

**Features / الميزات:**
- ✅ Native mobile UI
- ✅ Secure token storage with AsyncStorage
- ✅ Deep linking support
- ✅ User profile display
- ✅ Protected API testing
- ✅ Bilingual UI support

**Dependencies / التبعيات:**
```bash
npm install react-native-app-auth @react-native-async-storage/async-storage
```

**Setup / الإعداد:**
1. Install dependencies
2. Configure deep linking (iOS & Android)
3. Update OAuth configuration
4. Import and use the component

### 3. Flutter (`flutter-example.dart`)
Complete Flutter widget for cross-platform mobile OAuth.

ويدجت Flutter كامل لـ OAuth متعدد المنصات في تطبيقات الجوال.

**Features / الميزات:**
- ✅ Material Design UI
- ✅ Secure storage with flutter_secure_storage
- ✅ Deep linking support
- ✅ User profile display
- ✅ Protected API testing
- ✅ State management

**Dependencies / التبعيات:**
```yaml
dependencies:
  flutter_appauth: ^6.0.0
  flutter_secure_storage: ^9.0.0
  http: ^1.1.0
```

**Setup / الإعداد:**
1. Add dependencies to `pubspec.yaml`
2. Configure deep linking (iOS & Android)
3. Update OAuth configuration
4. Use the widget in your app

## 🚀 Quick Start / البدء السريع

### For Web Applications / لتطبيقات الويب

```bash
# Start OAuth server
cd ..
npm start

# Open web example
open examples/web-client.html
```

### For React Native / لـ React Native

```javascript
import OAuthExample from './oauth-setup/examples/react-native-example';

function App() {
  return <OAuthExample />;
}
```

### For Flutter / لـ Flutter

```dart
import 'package:yourapp/oauth_demo_screen.dart';

void main() {
  runApp(MaterialApp(
    home: OAuthDemoScreen(),
  ));
}
```

## 🔧 Configuration / التكوين

All examples need the following configuration:

تحتاج جميع الأمثلة إلى التكوين التالي:

1. **OAuth Server URL** / عنوان URL لخادم OAuth
   ```
   http://localhost:3000 (development)
   https://your-domain.com (production)
   ```

2. **GitHub Client ID** / معرف عميل GitHub
   ```
   Get from: https://github.com/settings/developers
   ```

3. **Redirect URL** / عنوان URL لإعادة التوجيه
   ```
   Web: http://localhost:3000/auth/github/callback
   Mobile: com.yourapp://oauth
   ```

## 🔐 Deep Linking Setup / إعداد الربط العميق

### iOS Configuration

Add to `Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.yourapp</string>
    </array>
  </dict>
</array>
```

### Android Configuration

Add to `AndroidManifest.xml`:
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="com.yourapp" />
</intent-filter>
```

## 📱 Testing Mobile Examples / اختبار أمثلة الجوال

### React Native

```bash
# iOS
npx react-native run-ios

# Android
npx react-native run-android
```

### Flutter

```bash
# iOS
flutter run -d ios

# Android
flutter run -d android
```

## 🧪 API Testing / اختبار API

All examples include a "Test Protected API" button that:
- Retrieves the stored JWT token
- Makes a request to `/auth/protected`
- Displays the response

جميع الأمثلة تتضمن زر "اختبار API المحمي" الذي:
- يسترجع رمز JWT المخزن
- يقوم بطلب إلى `/auth/protected`
- يعرض الاستجابة

## 🔍 Common Issues / المشاكل الشائعة

### 1. CORS Errors (Web)

**Problem:** Browser blocks requests

**Solution:** Add your origin to `ALLOWED_ORIGINS` in `.env`:
```env
ALLOWED_ORIGINS=http://localhost:8000,http://localhost:3001
```

### 2. Deep Linking Not Working (Mobile)

**Problem:** OAuth callback not handled

**Solution:**
- Verify URL scheme is configured correctly
- Check redirect URL matches in OAuth app settings
- Test deep linking: `adb shell am start -W -a android.intent.action.VIEW -d "com.yourapp://oauth"`

### 3. Token Storage Issues

**Problem:** Tokens not persisting

**Solution:**
- Use secure storage (Keychain/Keystore for mobile)
- Don't use localStorage for sensitive tokens in web
- Implement refresh token logic for long sessions

### 4. Authentication Loop

**Problem:** Keeps redirecting to login

**Solution:**
- Check token expiration
- Verify token is being stored correctly
- Ensure callback URL is handling tokens properly

## 📚 Additional Resources / موارد إضافية

- [OAuth 2.0 Specification](https://oauth.net/2/)
- [React Native App Auth](https://github.com/FormidableLabs/react-native-app-auth)
- [Flutter AppAuth](https://pub.dev/packages/flutter_appauth)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)

## 🤝 Contributing / المساهمة

Want to add an example for your favorite framework?

هل تريد إضافة مثال لإطار العمل المفضل لديك؟

1. Create your example file
2. Follow the existing structure
3. Include setup instructions
4. Add bilingual comments
5. Submit a pull request

Examples we'd love to see:
- Vue.js example
- Angular example
- SwiftUI example
- Kotlin example
- Python client example

## 📞 Support / الدعم

Having issues with integration?

هل تواجه مشاكل في التكامل؟

- Check [../README.md](../README.md) for detailed documentation
- Review [../QUICKSTART.md](../QUICKSTART.md) for setup guide
- Test with [../tests/test-api.sh](../tests/test-api.sh)
- Open an issue on GitHub

---

**Happy Coding! 🎉**

**برمجة سعيدة! 🎉**
