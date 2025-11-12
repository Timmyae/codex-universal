# Quick Start Guide / دليل البدء السريع

## 🚀 Get Started in 5 Minutes / ابدأ في 5 دقائق

### Step 1: Setup GitHub OAuth App / الخطوة 1: إعداد تطبيق GitHub OAuth

1. Visit https://github.com/settings/developers
2. Click "OAuth Apps" → "New OAuth App"
3. Fill in:
   - **Application name**: `My App OAuth`
   - **Homepage URL**: `http://localhost:3000`
   - **Callback URL**: `http://localhost:3000/auth/github/callback`
4. Copy **Client ID** and **Client Secret**

### Step 2: Configure Environment / الخطوة 2: تكوين البيئة

```bash
cd oauth-setup
cp .env.example .env
```

Edit `.env` and add your credentials:
```env
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### Step 3: Install Dependencies / الخطوة 3: تثبيت التبعيات

```bash
npm install
```

### Step 4: Start Server / الخطوة 4: بدء الخادم

```bash
npm start
```

### Step 5: Test / الخطوة 5: الاختبار

Open in browser:
```
http://localhost:3000/auth/github
```

Or test with curl:
```bash
curl http://localhost:3000/health
```

## 🐳 Docker Quick Start

```bash
docker-compose up -d
```

## 📱 Mobile Integration Example

### React Native

```javascript
import { Linking } from 'react-native';

// Open OAuth flow
Linking.openURL('http://your-server.com/auth/github');

// Handle callback
Linking.addEventListener('url', (event) => {
  const { url } = event;
  // Parse token from URL
});
```

### Flutter

```dart
import 'package:url_launcher/url_launcher.dart';

// Open OAuth flow
await launchUrl(Uri.parse('http://your-server.com/auth/github'));
```

## 🔍 Common Commands / الأوامر الشائعة

```bash
# Start server
npm start

# Development mode with auto-reload
npm run dev

# Test all endpoints
./tests/test-api.sh

# Build Docker image
docker build -t oauth-server .

# Run with Docker
docker run -p 3000:3000 --env-file .env oauth-server

# Check logs
docker logs -f oauth-server
```

## 📊 API Endpoints Overview / نظرة عامة على نقاط نهاية API

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check |
| `/auth/providers` | GET | No | List OAuth providers |
| `/auth/github` | GET | No | Start GitHub OAuth |
| `/auth/status` | GET | No | Check auth status |
| `/auth/me` | GET | **Yes** | Get user profile |
| `/auth/logout` | POST | No | Logout |

## 🔐 Using JWT Tokens / استخدام رموز JWT

After successful OAuth, you'll receive a JWT token. Use it in API calls:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/auth/me
```

## 🆘 Troubleshooting / استكشاف الأخطاء

**Server won't start:**
```bash
# Check if port is in use
lsof -i :3000

# Kill process
kill -9 <PID>
```

**OAuth not working:**
- Verify GitHub OAuth credentials in `.env`
- Check callback URL matches exactly
- Ensure server is accessible from browser

**Token errors:**
- Generate new secrets in `.env`
- Restart server after changing `.env`
- Check token expiration time

## 📚 Full Documentation / الوثائق الكاملة

See [README.md](README.md) for complete documentation.

## ❓ Need Help? / تحتاج مساعدة؟

- Check [README.md](README.md) for detailed guides
- Test with `./tests/test-api.sh`
- Import `tests/postman-collection.json` to Postman
- Check server logs for errors

---

**Made with ❤️ for Codex Universal**
