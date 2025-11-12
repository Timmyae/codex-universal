# Security Guidelines / إرشادات الأمان

## 🔒 Security Best Practices / أفضل الممارسات الأمنية

### Environment Variables / متغيرات البيئة

**DO NOT commit `.env` file to version control / لا تقم بحفظ ملف `.env` في التحكم بالإصدار**

✅ **DO / افعل:**
- Use `.env.example` as template
- Generate strong, random secrets
- Use different credentials for development and production
- Rotate secrets regularly

❌ **DON'T / لا تفعل:**
- Commit `.env` file
- Use default or weak secrets
- Share secrets in plain text
- Hardcode credentials in source code

### Generating Secure Secrets / إنشاء أسرار آمنة

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### HTTPS in Production / HTTPS في الإنتاج

**ALWAYS use HTTPS in production / استخدم دائمًا HTTPS في الإنتاج**

```env
# Production configuration
NODE_ENV=production
BASE_URL=https://yourdomain.com
```

Update GitHub OAuth callback:
```
https://yourdomain.com/auth/github/callback
```

### CORS Configuration / تكوين CORS

Only allow trusted origins:

```env
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### Rate Limiting / تحديد المعدل

Protect against brute force attacks:

```env
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # Max 100 requests per window
```

### Token Security / أمان الرموز

**JWT Token Storage:**

**Web Applications:**
- ✅ Use httpOnly cookies
- ✅ Use secure cookies in production
- ⚠️ localStorage is acceptable but less secure
- ❌ Don't store in sessionStorage for sensitive apps

**Mobile Applications:**
- ✅ Use Keychain (iOS) or Keystore (Android)
- ✅ Use react-native-keychain or flutter_secure_storage
- ❌ Don't store in AsyncStorage or SharedPreferences

**Token Expiration:**
- Set appropriate expiration times
- Implement refresh tokens for long-lived sessions
- Force re-authentication for sensitive operations

### Session Configuration / تكوين الجلسة

```javascript
session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,        // HTTPS only
    httpOnly: true,      // Prevent XSS
    maxAge: 86400000,    // 24 hours
    sameSite: 'strict'   // CSRF protection
  }
})
```

### Input Validation / التحقق من المدخلات

All inputs are validated in the controllers. Do not disable validation.

### Error Messages / رسائل الخطأ

Error messages are sanitized to prevent information disclosure.

✅ **Good:**
```json
{
  "error": "Authentication failed",
  "message": "Invalid credentials"
}
```

❌ **Bad:**
```json
{
  "error": "Database connection failed",
  "message": "Cannot connect to postgres://user:pass@localhost:5432/db"
}
```

### Database Security / أمان قاعدة البيانات

If you add database support:
- Use parameterized queries
- Implement proper access controls
- Encrypt sensitive data at rest
- Use connection pooling
- Regularly backup data

### OAuth Security / أمان OAuth

**State Parameter:**
- CSRF protection is implemented via state parameter
- Never disable state validation

**Redirect URI:**
- Always validate redirect URI
- Never allow open redirects
- Match exact callback URLs

**Scopes:**
- Request minimum required scopes
- Review scopes regularly
- Don't request unnecessary permissions

### Logging / تسجيل السجلات

**DO log / سجّل:**
- Authentication attempts
- Authorization failures
- API usage patterns
- Error conditions

**DON'T log / لا تسجّل:**
- Passwords
- OAuth tokens
- API keys
- Personal identifiable information (PII)

### Docker Security / أمان Docker

**Dockerfile security:**
```dockerfile
# Use specific version, not latest
FROM node:20-alpine

# Run as non-root user
USER nodejs

# Minimize attack surface
RUN apk --no-cache add dumb-init
ENTRYPOINT ["dumb-init", "--"]
```

**Container security:**
```bash
# Scan for vulnerabilities
docker scan oauth-server

# Run with limited privileges
docker run --read-only --cap-drop ALL oauth-server
```

### Dependency Security / أمان التبعيات

```bash
# Audit dependencies
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

### Security Headers / رؤوس الأمان

Add security headers (consider using helmet.js):

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true
  }
}));
```

### Monitoring and Alerts / المراقبة والتنبيهات

Set up monitoring for:
- Failed authentication attempts
- Unusual API usage patterns
- Error rate spikes
- Token validation failures

### Regular Security Reviews / المراجعات الأمنية المنتظمة

- [ ] Review access logs weekly
- [ ] Update dependencies monthly
- [ ] Rotate secrets quarterly
- [ ] Security audit annually
- [ ] Review OAuth scopes quarterly

### Incident Response / الاستجابة للحوادث

If security breach occurs:

1. **Immediate Actions:**
   - Revoke compromised tokens
   - Rotate all secrets
   - Notify affected users
   - Block malicious IPs

2. **Investigation:**
   - Review access logs
   - Identify breach vector
   - Assess data exposure
   - Document findings

3. **Remediation:**
   - Fix vulnerabilities
   - Update security measures
   - Implement additional controls
   - Monitor for recurring issues

### Compliance / الامتثال

Consider compliance requirements:
- GDPR (Europe)
- CCPA (California)
- HIPAA (Healthcare)
- PCI DSS (Payment data)

### Security Checklist / قائمة التحقق الأمنية

Before deploying to production:

- [ ] HTTPS enabled
- [ ] Strong secrets configured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Error messages sanitized
- [ ] Logging implemented
- [ ] Dependencies updated
- [ ] Security headers configured
- [ ] OAuth scopes minimized
- [ ] Backup strategy in place
- [ ] Monitoring enabled
- [ ] Incident response plan ready

## 🚨 Reporting Security Issues / الإبلاغ عن مشاكل الأمان

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. Email security concerns to repository owner
3. Include detailed description
4. Allow reasonable time for fix

## 📚 Resources / المصادر

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Node.js Security Checklist](https://github.com/goldbergyoni/nodebestpractices#6-security-best-practices)

---

**Security is everyone's responsibility / الأمان مسؤولية الجميع**
