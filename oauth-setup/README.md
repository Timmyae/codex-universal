# OAuth 2.0 Setup with PKCE and Security Features
# إعداد OAuth 2.0 مع PKCE وميزات الأمان

[English](#english) | [العربية](#arabic)

---

<a name="english"></a>
## English Documentation

### 🔒 Secure OAuth 2.0 Implementation

A production-ready OAuth 2.0 server implementation with advanced security features including PKCE, token rotation, and comprehensive attack prevention.

### ✨ Features

#### Core Security
- ✅ **PKCE (Proof Key for Code Exchange)** - RFC 7636 compliant
- ✅ **Token Rotation** - One-time-use refresh tokens
- ✅ **Token Blacklist** - Immediate revocation support
- ✅ **Secure Token Storage** - Hardware-backed keychain/keystore
- ✅ **Rate Limiting** - DDoS and brute force protection
- ✅ **HTTPS Enforcement** - Configurable for production
- ✅ **Security Headers** - Helmet.js integration
- ✅ **CORS Protection** - Whitelist-based origin control

#### OAuth Features
- ✅ GitHub OAuth integration
- ✅ JWT-based access tokens (15 min expiry)
- ✅ Refresh tokens with rotation (30 day expiry)
- ✅ Automatic token refresh
- ✅ Session management
- ✅ State parameter for CSRF protection

#### Mobile Support
- ✅ React Native integration (react-native-keychain)
- ✅ Flutter integration (flutter_secure_storage)
- ✅ Deep link callback handling
- ✅ Biometric authentication support

### 📋 Requirements

- Node.js 18+
- Redis (optional, for production token blacklist)
- GitHub OAuth App credentials

### 🚀 Quick Start

#### 1. Install Dependencies

```bash
cd oauth-setup
npm install
```

#### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# Security
JWT_SECRET=your_long_random_secret_key
SESSION_SECRET=your_session_secret
ALLOWED_REDIRECT_URIS=http://localhost:3000/auth/callback

# Enable PKCE
ENABLE_PKCE=true
```

#### 3. Start Server

```bash
# Development
npm run dev

# Production
npm start
```

Server will start at `http://localhost:3000`

### 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:security

# Watch mode
npm run test:watch
```

### 📊 Test Coverage

Current coverage targets:
- Overall: 80% minimum
- PKCE utilities: 100% (critical security)
- Token utilities: 95% (critical security)

### 🔐 Security Best Practices

#### 1. PKCE Implementation
- Always use S256 method (GitHub doesn't support plain)
- Generate code_verifier with 128 characters
- Store code_verifier in session (never localStorage)
- Validate code_verifier on token exchange

#### 2. Token Management
- Access tokens: 15 minutes maximum
- Refresh tokens: 30 days with mandatory rotation
- One-time-use refresh tokens (detect reuse attacks)
- Immediate revocation on logout

#### 3. Redirect URI Validation
- Exact match only (no wildcards)
- Whitelist in environment variables
- Reject external domains
- Verify protocol (HTTPS in production)

#### 4. Mobile Token Storage
- **NEVER** use AsyncStorage or localStorage
- **USE** react-native-keychain (React Native)
- **USE** flutter_secure_storage (Flutter)
- Hardware-backed encryption when available

### 📱 Mobile Integration

#### React Native

```javascript
import * as Keychain from 'react-native-keychain';

// Store token securely
await Keychain.setGenericPassword('access_token', token, {
  service: 'com.yourapp.oauth',
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED
});

// Retrieve token
const credentials = await Keychain.getGenericPassword({
  service: 'com.yourapp.oauth'
});
const token = credentials.password;
```

See `mobile/react-native/` for complete examples.

#### Flutter

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final storage = FlutterSecureStorage();

// Store token
await storage.write(key: 'access_token', value: token);

// Retrieve token
String? token = await storage.read(key: 'access_token');
```

See `mobile/flutter/` for complete examples.

### 🌐 API Endpoints

#### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/github` | GET | Initiate GitHub OAuth flow |
| `/auth/github/callback` | GET | Handle OAuth callback |
| `/auth/refresh` | POST | Refresh access token |
| `/auth/revoke` | POST | Revoke token (logout) |
| `/auth/me` | GET | Get current user info |

#### Health & Info

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/` | GET | API information |

### 🔄 OAuth Flow

```
1. Client → GET /auth/github
   ↓ (redirect with code_challenge)
2. GitHub Authorization Page
   ↓ (user approves)
3. GitHub → Callback with code
   ↓
4. Server exchanges code for GitHub token
   ↓ (validates code_verifier via PKCE)
5. Server generates JWT tokens
   ↓
6. Client receives access_token + refresh_token
```

### 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f oauth-server

# Stop
docker-compose down
```

### 📚 Additional Documentation

- [SECURITY.md](./SECURITY.md) - Security best practices and threat model
- [TESTING-GUIDE.md](./docs/TESTING-GUIDE.md) - How to run and write tests
- [DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Production deployment guide
- [OAUTH-FLOW.md](./docs/OAUTH-FLOW.md) - Detailed OAuth flow diagrams

### 🤝 Contributing

1. Follow existing code style
2. Add tests for new features
3. Maintain 80%+ coverage
4. Update documentation
5. Run security tests

### 📄 License

MIT License - see LICENSE file

---

<a name="arabic"></a>
## التوثيق العربي

### 🔒 تطبيق آمن لـ OAuth 2.0

تطبيق خادم OAuth 2.0 جاهز للإنتاج مع ميزات أمان متقدمة بما في ذلك PKCE وتدوير الرموز والحماية الشاملة من الهجمات.

### ✨ المميزات

#### الأمان الأساسي
- ✅ **PKCE** - متوافق مع RFC 7636
- ✅ **تدوير الرموز** - رموز تحديث لاستخدام واحد
- ✅ **القائمة السوداء للرموز** - إبطال فوري
- ✅ **تخزين آمن للرموز** - تشفير مدعوم من الأجهزة
- ✅ **تحديد معدل الطلبات** - حماية من DDoS والقوة الغاشمة
- ✅ **فرض HTTPS** - قابل للتكوين للإنتاج
- ✅ **رؤوس الأمان** - تكامل Helmet.js
- ✅ **حماية CORS** - تحكم في الأصل بقائمة بيضاء

#### ميزات OAuth
- ✅ تكامل GitHub OAuth
- ✅ رموز وصول قائمة على JWT (انتهاء صلاحية 15 دقيقة)
- ✅ رموز تحديث مع التدوير (انتهاء صلاحية 30 يوم)
- ✅ تحديث تلقائي للرموز
- ✅ إدارة الجلسة
- ✅ معامل الحالة لحماية CSRF

#### دعم الجوال
- ✅ تكامل React Native (react-native-keychain)
- ✅ تكامل Flutter (flutter_secure_storage)
- ✅ معالجة روابط الاستدعاء العميقة
- ✅ دعم المصادقة البيومترية

### 📋 المتطلبات

- Node.js 18+
- Redis (اختياري، للقائمة السوداء في الإنتاج)
- بيانات اعتماد تطبيق GitHub OAuth

### 🚀 البداية السريعة

#### 1. تثبيت التبعيات

```bash
cd oauth-setup
npm install
```

#### 2. تكوين البيئة

```bash
cp .env.example .env
```

عدّل `.env` وقم بتكوين:

```env
# GitHub OAuth
GITHUB_CLIENT_ID=معرف_العميل_الخاص_بك
GITHUB_CLIENT_SECRET=السر_الخاص_بك
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# الأمان
JWT_SECRET=مفتاحك_السري_الطويل_العشوائي
SESSION_SECRET=سر_الجلسة_الخاص_بك
ALLOWED_REDIRECT_URIS=http://localhost:3000/auth/callback

# تفعيل PKCE
ENABLE_PKCE=true
```

#### 3. بدء الخادم

```bash
# التطوير
npm run dev

# الإنتاج
npm start
```

سيبدأ الخادم على `http://localhost:3000`

### 🧪 الاختبار

```bash
# تشغيل جميع الاختبارات
npm test

# تشغيل مع التغطية
npm run test

# تشغيل مجموعات اختبار محددة
npm run test:unit
npm run test:integration
npm run test:security

# وضع المراقبة
npm run test:watch
```

### 📊 تغطية الاختبار

أهداف التغطية الحالية:
- إجمالي: 80% كحد أدنى
- أدوات PKCE: 100% (أمان حرج)
- أدوات الرموز: 95% (أمان حرج)

### 🔐 أفضل ممارسات الأمان

#### 1. تطبيق PKCE
- استخدم دائماً طريقة S256 (GitHub لا يدعم plain)
- قم بتوليد code_verifier بـ 128 حرف
- احفظ code_verifier في الجلسة (أبداً في localStorage)
- تحقق من code_verifier عند تبادل الرمز

#### 2. إدارة الرموز
- رموز الوصول: 15 دقيقة كحد أقصى
- رموز التحديث: 30 يوم مع تدوير إلزامي
- رموز تحديث لاستخدام واحد (كشف هجمات إعادة الاستخدام)
- إبطال فوري عند تسجيل الخروج

#### 3. التحقق من URI للإعادة توجيه
- مطابقة تامة فقط (بدون أحرف بدل)
- قائمة بيضاء في متغيرات البيئة
- رفض النطاقات الخارجية
- التحقق من البروتوكول (HTTPS في الإنتاج)

#### 4. تخزين الرموز على الجوال
- **أبداً** تستخدم AsyncStorage أو localStorage
- **استخدم** react-native-keychain (React Native)
- **استخدم** flutter_secure_storage (Flutter)
- تشفير مدعوم من الأجهزة عند توفره

### 📚 وثائق إضافية

- [SECURITY.md](./SECURITY.md) - أفضل ممارسات الأمان ونموذج التهديد
- [TESTING-GUIDE.md](./docs/TESTING-GUIDE.md) - كيفية تشغيل وكتابة الاختبارات
- [DEPLOYMENT.md](./docs/DEPLOYMENT.md) - دليل النشر للإنتاج
- [OAUTH-FLOW.md](./docs/OAUTH-FLOW.md) - مخططات تدفق OAuth المفصلة

### 📄 الترخيص

ترخيص MIT - انظر ملف LICENSE
