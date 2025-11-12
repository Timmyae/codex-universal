# Contributing Guide / دليل المساهمة

## 🤝 How to Contribute / كيفية المساهمة

We welcome contributions to improve the OAuth authentication system!

### Ways to Contribute / طرق المساهمة

1. **Add new OAuth providers** (Google, Facebook, Twitter, etc.)
2. **Improve documentation** (translations, examples, guides)
3. **Fix bugs** and security issues
4. **Add features** (refresh tokens, 2FA, etc.)
5. **Write tests** and improve code quality
6. **Create examples** (integration with popular frameworks)

## 📋 Development Setup / إعداد التطوير

### Prerequisites / المتطلبات

- Node.js >= 18.0.0
- npm or yarn
- Git
- Text editor (VS Code recommended)

### Setup / الإعداد

```bash
# Clone repository
git clone https://github.com/Timmyae/codex-universal.git
cd codex-universal/oauth-setup

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
nano .env

# Start development server
npm run dev
```

### Testing Your Changes / اختبار التغييرات

```bash
# Start server
npm run dev

# Test with curl
./tests/test-api.sh

# Or test manually
curl http://localhost:3000/health
```

## 🔧 Adding a New OAuth Provider / إضافة مزود OAuth جديد

### Example: Adding Google OAuth

#### Step 1: Update oauth.config.js

The configuration is already prepared! Just ensure your provider follows the same structure:

```javascript
google: {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackUrl: process.env.GOOGLE_CALLBACK_URL,
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
  scopes: ['openid', 'profile', 'email'],
  enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}
```

#### Step 2: Add Controller Function

In `controllers/auth.controller.js`:

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

module.exports = {
  // ... existing exports
  handleGoogleCallback
};
```

#### Step 3: Add Routes

In `routes/auth.routes.js`, the generic routes already handle most providers:

```javascript
// The generic routes will automatically work:
// GET /auth/google -> initiates OAuth
// GET /auth/google/callback -> needs custom handler

// Add custom callback route
router.get('/google/callback', authController.handleGoogleCallback);
```

#### Step 4: Test

```bash
# Add Google credentials to .env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Restart server
npm run dev

# Test
curl http://localhost:3000/auth/providers
# Should show ["github", "google"]

# Open in browser
open http://localhost:3000/auth/google
```

## 📝 Code Style / نمط الكود

### General Guidelines / الإرشادات العامة

- Use meaningful variable and function names
- Add comments in English and Arabic
- Follow existing code structure
- Write self-documenting code

### JavaScript Style

```javascript
// ✅ Good
async function getUserProfile(provider, accessToken) {
  // Implementation
}

// ❌ Avoid
async function gup(p, t) {
  // Implementation
}
```

### Comment Style

```javascript
/**
 * Function description in English
 * وصف الوظيفة بالعربية
 * 
 * @param {string} param - Parameter description
 * @returns {Object} Return value description
 */
```

### Error Handling

Always include bilingual error messages:

```javascript
res.status(400).json({
  success: false,
  error: 'Error Type',
  message: 'Error message in English',
  message_ar: 'رسالة الخطأ بالعربية'
});
```

## 🧪 Testing / الاختبار

### Manual Testing

```bash
# Run test script
./tests/test-api.sh

# Or test individual endpoints
curl http://localhost:3000/health
curl http://localhost:3000/auth/providers
```

### Adding Tests

When adding features, update `tests/test-api.sh`:

```bash
# Test New Feature
echo "Test X: New Feature"
curl -s -X GET "${BASE_URL}/auth/new-feature" | jq '.'
```

### Postman Testing

1. Import `tests/postman-collection.json` to Postman
2. Add new requests for your feature
3. Export and commit updated collection

## 📖 Documentation / التوثيق

### Update README.md

When adding features:
- Update features list
- Add endpoint documentation
- Include code examples
- Update API endpoints table

### Update QUICKSTART.md

For user-facing changes:
- Update quick start steps
- Add common commands
- Update troubleshooting

### Update SECURITY.md

For security-related changes:
- Document security implications
- Update best practices
- Add to security checklist

## 🔍 Code Review / مراجعة الكود

### Before Submitting

- [ ] Code follows style guidelines
- [ ] Comments are bilingual (EN/AR)
- [ ] No hardcoded credentials
- [ ] Error messages are user-friendly
- [ ] Documentation is updated
- [ ] Tests pass
- [ ] No console.log() statements (use proper logging)

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Security fix

## Testing
How to test the changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No security issues
```

## 🐛 Bug Reports / تقارير الأخطاء

When reporting bugs, include:

1. **Description**: What happened?
2. **Expected behavior**: What should happen?
3. **Steps to reproduce**: How to trigger the bug?
4. **Environment**:
   - Node.js version
   - Operating system
   - OAuth provider (if relevant)
5. **Logs**: Error messages or logs
6. **Screenshots**: If applicable

### Bug Report Template

```markdown
**Description**
A clear description of the bug

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Steps to Reproduce**
1. Step 1
2. Step 2
3. Step 3

**Environment**
- Node.js: v20.0.0
- OS: Ubuntu 22.04
- Provider: GitHub

**Logs**
```
Error logs here
```

**Screenshots**
If applicable
```

## 💡 Feature Requests / طلبات الميزات

When requesting features:

1. **Use Case**: Why is this needed?
2. **Description**: What should it do?
3. **Alternatives**: Other solutions considered?
4. **Examples**: Similar implementations?

## 🔐 Security / الأمان

For security issues:
- **DO NOT** create public issues
- Email repository maintainers
- Allow time for fixes before disclosure

See [SECURITY.md](SECURITY.md) for details.

## 📜 Commit Messages / رسائل الالتزام

Use clear, descriptive commit messages:

```bash
# ✅ Good
git commit -m "Add Google OAuth provider support"
git commit -m "Fix CSRF validation in callback handler"
git commit -m "Update README with mobile integration guide"

# ❌ Avoid
git commit -m "fix bug"
git commit -m "update"
git commit -m "changes"
```

### Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Maintenance tasks

**Example:**
```
feat: Add Google OAuth provider

- Add Google OAuth configuration
- Implement Google callback handler
- Update documentation
- Add tests

Closes #123
```

## 🌍 Translations / الترجمات

We support bilingual documentation (English/Arabic).

### Adding Translations

When adding features:
- Add English text first
- Add Arabic translation
- Ensure both are consistent
- Maintain parallel structure

### Translation Guidelines

- Use formal Arabic (فصحى)
- Be concise and clear
- Maintain technical accuracy
- Keep formatting consistent

## 📞 Getting Help / الحصول على المساعدة

Need help contributing?

- Check [README.md](README.md) for documentation
- Review existing code for examples
- Ask questions in GitHub Discussions
- Check [QUICKSTART.md](QUICKSTART.md) for basics

## 🎉 Recognition / التقدير

Contributors will be:
- Listed in CONTRIBUTORS.md (coming soon)
- Mentioned in release notes
- Credited in commit history

Thank you for contributing! 🙏

شكراً لمساهمتك! 🙏
