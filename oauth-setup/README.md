# OAuth Authentication Setup for Codex Universal
# إعداد مصادقة OAuth لـ Codex Universal

A comprehensive, production-ready OAuth authentication system supporting multiple providers (GitHub, Google, Facebook, etc.) for both web and mobile applications.

نظام مصادقة OAuth شامل وجاهز للإنتاج يدعم مزودين متعددين (GitHub، Google، Facebook، إلخ.) لكل من تطبيقات الويب والجوال.

## 📋 Table of Contents / جدول المحتويات

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [GitHub OAuth Setup](#github-oauth-setup)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [OAuth Flow](#oauth-flow)
- [Mobile Integration](#mobile-integration)
- [Adding New Providers](#adding-new-providers)
- [Security](#security)
- [Docker Deployment](#docker-deployment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## ✨ Features

- ✅ **Multi-Provider Support**: GitHub (implemented), Google, Facebook, Twitter (ready to implement)
- ✅ **JWT Authentication**: Secure token-based authentication with refresh tokens
- ✅ **Session Management**: Express session with secure cookie handling
- ✅ **CORS Support**: Configured for web and mobile applications
- ✅ **Rate Limiting**: Protection against brute force attacks
- ✅ **Bilingual**: Full support for English and Arabic
- ✅ **Production Ready**: Error handling, logging, and security best practices
- ✅ **Extensible**: Easy to add new OAuth providers
- ✅ **Docker Support**: Containerized deployment ready
- ✅ **Universal**: Works with web, React Native, Flutter, and other platforms

## 🔧 Prerequisites / المتطلبات الأساسية

- Node.js >= 18.0.0
- npm or yarn
- GitHub account (for GitHub OAuth)
- Basic understanding of OAuth 2.0

## 📦 Installation / التثبيت

1. **Navigate to oauth-setup directory:**
   ```bash
   cd oauth-setup
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables** (see [Configuration](#configuration))

## ⚙️ Configuration / التكوين

Edit the `.env` file with your credentials:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000

# GitHub OAuth (Required)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# JWT Configuration
JWT_SECRET=your_strong_random_secret_here
JWT_EXPIRES_IN=7d

# Session Configuration
SESSION_SECRET=your_session_secret_here
```

**⚠️ Important / مهم:**
- Never commit `.env` file to version control / لا تقم أبدًا بحفظ ملف `.env` في التحكم بالإصدار
- Use strong, random secrets in production / استخدم أسرارًا قوية وعشوائية في الإنتاج
- Enable HTTPS in production / قم بتمكين HTTPS في الإنتاج

## 🔐 GitHub OAuth Setup / إعداد GitHub OAuth

### Step 1: Create GitHub OAuth App / الخطوة 1: إنشاء تطبيق GitHub OAuth

1. Go to GitHub Settings: https://github.com/settings/developers
2. Click "OAuth Apps" → "New OAuth App"
3. Fill in the details:
   - **Application name**: Codex Universal OAuth
   - **Homepage URL**: `http://localhost:3000` (development)
   - **Authorization callback URL**: `http://localhost:3000/auth/github/callback`
4. Click "Register application"

### Step 2: Get Credentials / الخطوة 2: الحصول على بيانات الاعتماد

1. Copy **Client ID** to `GITHUB_CLIENT_ID` in `.env`
2. Generate **Client Secret** and copy to `GITHUB_CLIENT_SECRET` in `.env`

### Step 3: For Production / الخطوة 3: للإنتاج

Update the callback URL to your production domain:
```
https://yourdomain.com/auth/github/callback
```

## 🚀 Usage / الاستخدام

### Start the Server / بدء الخادم

**Development mode with auto-reload:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

### Verify Server is Running / التحقق من تشغيل الخادم

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "message": "OAuth server is running"
}
```

## 📡 API Endpoints / نقاط نهاية API

### Public Endpoints / نقاط النهاية العامة

#### 1. Health Check
```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "uptime": 123.456
}
```

#### 2. Get Enabled Providers
```http
GET /auth/providers
```

**Response:**
```json
{
  "success": true,
  "providers": ["github"]
}
```

#### 3. Initiate GitHub OAuth
```http
GET /auth/github
```

**Description:** Redirects to GitHub authorization page

#### 4. GitHub OAuth Callback
```http
GET /auth/github/callback?code=xxx&state=xxx
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123456",
      "email": "user@example.com",
      "username": "username",
      "name": "User Name",
      "avatar": "https://avatars.githubusercontent.com/...",
      "provider": "github"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d"
  }
}
```

#### 5. Check Auth Status
```http
GET /auth/status
```

**Response (authenticated):**
```json
{
  "success": true,
  "authenticated": true,
  "user": { ... }
}
```

#### 6. Logout
```http
POST /auth/logout
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Protected Endpoints / نقاط النهاية المحمية

These endpoints require an `Authorization` header with JWT token.

#### 7. Get Current User
```http
GET /auth/me
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "userId": "123456",
    "email": "user@example.com",
    "provider": "github"
  }
}
```

## 🔄 OAuth Flow / تدفق OAuth

### Complete Flow Diagram / مخطط التدفق الكامل

```
┌──────────┐                                    ┌──────────┐
│  Client  │                                    │  GitHub  │
│   App    │                                    │  OAuth   │
└────┬─────┘                                    └────┬─────┘
     │                                                │
     │  1. User clicks "Login with GitHub"           │
     │──────────────────────────────────────┐        │
     │                                      │        │
     │                                      ▼        │
     │                        ┌─────────────────┐    │
     │                        │  OAuth Server   │    │
     │                        │  /auth/github   │    │
     │                        └────────┬────────┘    │
     │                                 │             │
     │  2. Redirect to GitHub          │             │
     │  with client_id & scopes        │             │
     │◄────────────────────────────────┘             │
     │                                                │
     │  3. User authorizes app                       │
     │──────────────────────────────────────────────►│
     │                                                │
     │  4. GitHub redirects with code                │
     │◄──────────────────────────────────────────────┤
     │                                                │
     │  5. Exchange code for token                   │
     │──────────────────────────────────────────────►│
     │                                                │
     │  6. Return access_token                       │
     │◄──────────────────────────────────────────────┤
     │                                                │
     │  7. Fetch user profile                        │
     │──────────────────────────────────────────────►│
     │                                                │
     │  8. Return user data                          │
     │◄──────────────────────────────────────────────┤
     │                                                │
     │  9. Generate JWT token                        │
     │◄────────────────────────────────              │
     │                                                │
     │ 10. Return JWT + user data                    │
     │◄────────────────────────────────              │
     │                                                │
     │ 11. Store token & use for API calls           │
     │                                                │
     ▼                                                ▼
```

### Step-by-Step Explanation / شرح خطوة بخطوة

1. **User initiates login**: Client redirects to `/auth/github`
2. **Server redirects to GitHub**: With client_id, redirect_uri, and scopes
3. **User authorizes**: User logs in and authorizes the app on GitHub
4. **GitHub callback**: GitHub redirects to `/auth/github/callback` with authorization code
5. **Exchange code**: Server exchanges code for access token
6. **Fetch user data**: Server fetches user profile from GitHub API
7. **Generate JWT**: Server generates JWT token for the user
8. **Return to client**: Server returns JWT token and user data
9. **Client stores token**: Client stores JWT for future API calls
10. **Authenticated requests**: Client includes JWT in Authorization header

## 📱 Mobile Integration / التكامل مع الجوال

### React Native Integration / تكامل React Native

#### 1. Install Dependencies

```bash
npm install react-native-app-auth
# or
yarn add react-native-app-auth
```

#### 2. Configure Deep Linking

**Android** (`android/app/src/main/AndroidManifest.xml`):
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="codexuniversal" />
</intent-filter>
```

**iOS** (`ios/YourApp/Info.plist`):
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>codexuniversal</string>
    </array>
  </dict>
</array>
```

#### 3. Implementation Example

```javascript
import { authorize } from 'react-native-app-auth';

const config = {
  issuer: 'http://your-oauth-server.com',
  clientId: 'your-github-client-id',
  redirectUrl: 'codexuniversal://oauth',
  scopes: ['user:email', 'read:user'],
  serviceConfiguration: {
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'http://your-oauth-server.com/auth/github/callback'
  }
};

async function loginWithGitHub() {
  try {
    const result = await authorize(config);
    const { accessToken } = result;
    
    // Store token securely
    await SecureStore.setItemAsync('auth_token', accessToken);
    
    // Use token for API calls
    return accessToken;
  } catch (error) {
    console.error('OAuth error:', error);
  }
}
```

### Flutter Integration / تكامل Flutter

#### 1. Add Dependencies (`pubspec.yaml`)

```yaml
dependencies:
  flutter_appauth: ^6.0.0
  flutter_secure_storage: ^9.0.0
```

#### 2. Configure Deep Linking

**Android** (`android/app/src/main/AndroidManifest.xml`):
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="codexuniversal" />
</intent-filter>
```

**iOS** (`ios/Runner/Info.plist`):
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>codexuniversal</string>
    </array>
  </dict>
</array>
```

#### 3. Implementation Example

```dart
import 'package:flutter_appauth/flutter_appauth.dart';

final FlutterAppAuth appAuth = FlutterAppAuth();

Future<void> loginWithGitHub() async {
  try {
    final AuthorizationTokenResponse result = await appAuth.authorizeAndExchangeCode(
      AuthorizationTokenRequest(
        'your-github-client-id',
        'codexuniversal://oauth',
        issuer: 'http://your-oauth-server.com',
        scopes: ['user:email', 'read:user'],
        serviceConfiguration: AuthorizationServiceConfiguration(
          authorizationEndpoint: 'https://github.com/login/oauth/authorize',
          tokenEndpoint: 'http://your-oauth-server.com/auth/github/callback',
        ),
      ),
    );
    
    // Store token securely
    final storage = FlutterSecureStorage();
    await storage.write(key: 'auth_token', value: result.accessToken);
    
  } catch (e) {
    print('OAuth error: $e');
  }
}
```

### Web Integration / تكامل الويب

#### Simple JavaScript Example

```javascript
// Initiate OAuth flow
function loginWithGitHub() {
  window.location.href = 'http://localhost:3000/auth/github';
}

// Handle callback (if using client-side routing)
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

if (token) {
  // Store token
  localStorage.setItem('auth_token', token);
  
  // Use token for API calls
  fetchUserProfile(token);
}

// Make authenticated API call
async function fetchUserProfile(token) {
  const response = await fetch('http://localhost:3000/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  console.log('User:', data.user);
}
```

## ➕ Adding New Providers / إضافة مزودين جدد

### Example: Adding Google OAuth

#### Step 1: Update `oauth.config.js`

The configuration is already prepared! Just add your credentials to `.env`:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

#### Step 2: Create Controller Function

Add to `controllers/auth.controller.js`:

```javascript
async function handleGoogleCallback(req, res) {
  try {
    const { code, state } = req.query;
    
    // Validate state
    if (!state || state !== req.session.oauthState) {
      return res.status(400).json({
        success: false,
        error: 'Invalid state parameter'
      });
    }
    
    const config = getProviderConfig('google');
    
    // Exchange code for token
    const tokenResponse = await axios.post(config.tokenUrl, {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: code,
      redirect_uri: config.callbackUrl,
      grant_type: 'authorization_code'
    });
    
    const accessToken = tokenResponse.data.access_token;
    
    // Fetch user profile
    const userProfile = await getUserProfile('google', accessToken);
    
    // Generate JWT
    const jwtToken = generateToken({
      id: userProfile.id,
      email: userProfile.email,
      provider: 'google'
    });
    
    res.json({
      success: true,
      data: { user: userProfile, token: jwtToken }
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}
```

#### Step 3: Add Routes

Add to `routes/auth.routes.js`:

```javascript
router.get('/google', authController.initiateOAuth);
router.get('/google/callback', authController.handleGoogleCallback);
```

#### Step 4: Test

```bash
curl http://localhost:3000/auth/providers
```

Should now show:
```json
{
  "success": true,
  "providers": ["github", "google"]
}
```

## 🔒 Security / الأمان

### Best Practices / أفضل الممارسات

1. **HTTPS in Production** / استخدام HTTPS في الإنتاج
   - Always use HTTPS in production
   - Update callback URLs to use `https://`

2. **Strong Secrets** / أسرار قوية
   - Use strong, random secrets for JWT_SECRET and SESSION_SECRET
   - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

3. **Environment Variables** / متغيرات البيئة
   - Never commit `.env` file
   - Use different credentials for development and production

4. **Rate Limiting** / تحديد المعدل
   - Configured to prevent brute force attacks
   - Adjust in `.env` if needed

5. **CORS Configuration** / تكوين CORS
   - Only allow trusted origins
   - Update ALLOWED_ORIGINS in `.env`

6. **Token Storage** / تخزين الرموز
   - **Web**: Use httpOnly cookies or secure localStorage
   - **Mobile**: Use secure storage (Keychain, Keystore)

7. **CSRF Protection** / حماية CSRF
   - State parameter validates OAuth callbacks
   - Session-based validation prevents CSRF

8. **Input Validation** / التحقق من المدخلات
   - All inputs are validated
   - Error messages don't expose sensitive information

## 🐳 Docker Deployment / النشر باستخدام Docker

### Dockerfile

Create `Dockerfile` in `oauth-setup/`:

```dockerfile
FROM node:20-alpine

# Set working directory / تعيين دليل العمل
WORKDIR /app

# Copy package files / نسخ ملفات الحزمة
COPY package*.json ./

# Install dependencies / تثبيت التبعيات
RUN npm install --production

# Copy application files / نسخ ملفات التطبيق
COPY . .

# Expose port / كشف المنفذ
EXPOSE 3000

# Health check / فحص الصحة
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server / بدء الخادم
CMD ["node", "server/app.js"]
```

### docker-compose.yml

Create `docker-compose.yml` in `oauth-setup/`:

```yaml
version: '3.8'

services:
  oauth-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - BASE_URL=http://localhost:3000
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
```

### Build and Run / البناء والتشغيل

```bash
# Build image / بناء الصورة
docker build -t codex-universal-oauth .

# Run container / تشغيل الحاوية
docker run -p 3000:3000 --env-file .env codex-universal-oauth

# Or use docker-compose / أو استخدم docker-compose
docker-compose up -d

# View logs / عرض السجلات
docker-compose logs -f oauth-server

# Stop / إيقاف
docker-compose down
```

## 🧪 Testing / الاختبار

### Manual Testing with cURL

#### 1. Check Health
```bash
curl http://localhost:3000/health
```

#### 2. Get Enabled Providers
```bash
curl http://localhost:3000/auth/providers
```

#### 3. Test OAuth Flow (requires browser)
```bash
# Open in browser
open http://localhost:3000/auth/github
```

#### 4. Test Protected Endpoint
```bash
# Replace <token> with your JWT token
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/auth/me
```

#### 5. Test Logout
```bash
curl -X POST http://localhost:3000/auth/logout
```

### Postman Collection

Create a Postman collection with the following requests:

1. **Health Check**
   - Method: GET
   - URL: `{{baseUrl}}/health`

2. **Get Providers**
   - Method: GET
   - URL: `{{baseUrl}}/auth/providers`

3. **Get Auth Status**
   - Method: GET
   - URL: `{{baseUrl}}/auth/status`

4. **Get Current User**
   - Method: GET
   - URL: `{{baseUrl}}/auth/me`
   - Headers: `Authorization: Bearer {{token}}`

5. **Logout**
   - Method: POST
   - URL: `{{baseUrl}}/auth/logout`

**Variables:**
- `baseUrl`: `http://localhost:3000`
- `token`: (set after successful OAuth)

## 🔍 Troubleshooting / استكشاف الأخطاء وإصلاحها

### Common Issues / المشاكل الشائعة

#### 1. "OAuth provider not configured"

**Problem:** GitHub OAuth not enabled

**Solution:**
- Check `.env` file exists
- Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set
- Restart server after changing `.env`

#### 2. "Invalid state parameter"

**Problem:** CSRF validation failed

**Solution:**
- Ensure cookies are enabled
- Check session configuration
- Verify callback URL matches exactly

#### 3. "CORS blocked"

**Problem:** Origin not allowed

**Solution:**
- Add origin to `ALLOWED_ORIGINS` in `.env`
- Restart server
- Check browser console for exact origin

#### 4. "Token expired"

**Problem:** JWT token expired

**Solution:**
- Implement refresh token logic (placeholder exists)
- Re-authenticate user
- Adjust `JWT_EXPIRES_IN` in `.env`

#### 5. Server won't start

**Problem:** Port already in use or missing dependencies

**Solution:**
```bash
# Check if port is in use / تحقق مما إذا كان المنفذ قيد الاستخدام
lsof -i :3000

# Kill process if needed / قتل العملية إذا لزم الأمر
kill -9 <PID>

# Reinstall dependencies / إعادة تثبيت التبعيات
rm -rf node_modules package-lock.json
npm install
```

### Debug Mode / وضع التصحيح

Enable detailed logging:

```env
LOG_LEVEL=debug
NODE_ENV=development
```

## 📞 Support / الدعم

For issues, questions, or contributions:

- **GitHub Issues**: [Create an issue](https://github.com/Timmyae/codex-universal/issues)
- **Documentation**: See this README
- **Examples**: Check `server/` directory for implementation examples

## 📄 License / الترخيص

MIT License - see LICENSE file for details

---

**Made with ❤️ for Codex Universal**

**صُنع بحب ❤️ لـ Codex Universal**
