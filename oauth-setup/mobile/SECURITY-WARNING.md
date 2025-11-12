# ⚠️ CRITICAL SECURITY WARNINGS
# ⚠️ تحذيرات أمنية حرجة

## 🚨 Token Storage Security

This document contains **CRITICAL** security warnings for mobile app developers implementing OAuth authentication.

يحتوي هذا المستند على تحذيرات أمنية **حرجة** لمطوري تطبيقات الجوال الذين ينفذون مصادقة OAuth.

**FAILURE TO FOLLOW THESE GUIDELINES WILL RESULT IN SECURITY VULNERABILITIES**

**عدم اتباع هذه الإرشادات سيؤدي إلى ثغرات أمنية**

---

## ❌ NEVER STORE TOKENS IN:

### 1. AsyncStorage (React Native)
```javascript
// ❌ DANGER - DO NOT USE
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem('token', token); // INSECURE!
```

**Why this is dangerous:**
- AsyncStorage is NOT encrypted
- Data stored in plain text on device
- Accessible by other apps with root/jailbreak access
- Visible in device backups
- Can be extracted by malware

**لماذا هذا خطير:**
- AsyncStorage غير مشفر
- البيانات المخزنة في نص عادي على الجهاز
- يمكن الوصول إليها من قبل تطبيقات أخرى بصلاحيات root/jailbreak
- مرئية في النسخ الاحتياطية للجهاز
- يمكن استخراجها بواسطة البرامج الضارة

---

### 2. SharedPreferences (Flutter/Android)
```dart
// ❌ DANGER - DO NOT USE
final prefs = await SharedPreferences.getInstance();
await prefs.setString('token', token); // INSECURE!
```

**Why this is dangerous:**
- SharedPreferences stores data in XML files in plain text
- Located in `/data/data/com.yourapp/shared_prefs/`
- Accessible with root access
- No encryption
- Included in device backups

**لماذا هذا خطير:**
- SharedPreferences تخزن البيانات في ملفات XML في نص عادي
- موجودة في `/data/data/com.yourapp/shared_prefs/`
- يمكن الوصول إليها بصلاحيات root
- لا يوجد تشفير
- مدرجة في النسخ الاحتياطية للجهاز

---

### 3. localStorage (Web View)
```javascript
// ❌ DANGER - DO NOT USE
localStorage.setItem('token', token); // INSECURE!
```

**Why this is dangerous:**
- Vulnerable to XSS attacks
- Persistent across sessions
- No encryption
- Accessible by any JavaScript on the page
- Can be stolen by malicious scripts

**لماذا هذا خطير:**
- عرضة لهجمات XSS
- مستمر عبر الجلسات
- لا يوجد تشفير
- يمكن الوصول إليه بواسطة أي JavaScript في الصفحة
- يمكن سرقته بواسطة نصوص ضارة

---

### 4. Plain Text Files
```javascript
// ❌ DANGER - DO NOT USE
RNFS.writeFile(path, token); // INSECURE!
```

**Why this is dangerous:**
- No encryption
- Readable by file managers
- Accessible with root/jailbreak
- May be included in backups
- Survives app uninstall

**لماذا هذا خطير:**
- لا يوجد تشفير
- قابل للقراءة بواسطة مديري الملفات
- يمكن الوصول إليه بصلاحيات root/jailbreak
- قد يتم تضمينه في النسخ الاحتياطية
- يبقى بعد إلغاء تثبيت التطبيق

---

### 5. SQLite Database (Unencrypted)
```javascript
// ❌ DANGER - DO NOT USE
db.executeSql('INSERT INTO tokens VALUES (?)', [token]); // INSECURE!
```

**Why this is dangerous:**
- Database files not encrypted by default
- Easy to extract .db file
- Readable by SQLite tools
- Accessible with root/jailbreak

**لماذا هذا خطير:**
- ملفات قاعدة البيانات غير مشفرة افتراضيًا
- سهل استخراج ملف .db
- قابل للقراءة بواسطة أدوات SQLite
- يمكن الوصول إليه بصلاحيات root/jailbreak

---

### 6. Redux/MobX State (Persisted)
```javascript
// ❌ DANGER - DO NOT USE
persistStore(store); // With redux-persist - INSECURE if storing tokens!
```

**Why this is dangerous:**
- Usually persists to AsyncStorage/SharedPreferences
- No encryption
- Token survives app restart
- Easy to extract

**لماذا هذا خطير:**
- عادة ما يستمر في AsyncStorage/SharedPreferences
- لا يوجد تشفير
- يبقى الرمز بعد إعادة تشغيل التطبيق
- سهل الاستخراج

---

## ⚠️ Real-World Attack Scenarios

### Scenario 1: Malware Attack
**Attack:** Malware scans device for common storage locations
**Result:** Access token stolen
**Impact:** Attacker can impersonate user, access user data

**الهجوم:** البرامج الضارة تفحص الجهاز لمواقع التخزين الشائعة
**النتيجة:** سرقة رمز الوصول
**التأثير:** يمكن للمهاجم انتحال شخصية المستخدم والوصول إلى بيانات المستخدم

---

### Scenario 2: Lost/Stolen Device
**Attack:** Device stolen, attacker uses developer tools
**Result:** Extracts tokens from AsyncStorage/SharedPreferences
**Impact:** Account takeover, data breach

**الهجوم:** سرقة الجهاز، يستخدم المهاجم أدوات المطور
**النتيجة:** استخراج الرموز من AsyncStorage/SharedPreferences
**التأثير:** الاستيلاء على الحساب، اختراق البيانات

---

### Scenario 3: Jailbreak/Root Exploit
**Attack:** Jailbroken/rooted device with file system access
**Result:** Direct access to app storage
**Impact:** All unencrypted data compromised

**الهجوم:** جهاز مكسور الحماية (jailbreak/root) مع الوصول إلى نظام الملفات
**النتيجة:** وصول مباشر إلى تخزين التطبيق
**التأثير:** جميع البيانات غير المشفرة معرضة للخطر

---

### Scenario 4: Backup Extraction
**Attack:** iTunes/Google backup extracted and analyzed
**Result:** Tokens found in backup files
**Impact:** Unauthorized access to user account

**الهجوم:** استخراج وتحليل نسخة احتياطية من iTunes/Google
**النتيجة:** العثور على الرموز في ملفات النسخ الاحتياطي
**التأثير:** وصول غير مصرح به إلى حساب المستخدم

---

## ✅ CORRECT: Use Secure Storage

### React Native - react-native-keychain
```javascript
// ✅ SECURE
import * as Keychain from 'react-native-keychain';

await Keychain.setGenericPassword('oauth', token, {
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE
});
```

**Security Features:**
- Hardware-backed encryption (iOS Keychain, Android Keystore)
- Requires device unlock
- Optional biometric authentication
- Not included in regular backups
- Encrypted at rest

**ميزات الأمان:**
- تشفير مدعوم بالأجهزة (iOS Keychain، Android Keystore)
- يتطلب إلغاء قفل الجهاز
- مصادقة بيومترية اختيارية
- لا يتم تضمينه في النسخ الاحتياطية العادية
- مشفر في حالة الراحة

---

### Flutter - flutter_secure_storage
```dart
// ✅ SECURE
final storage = FlutterSecureStorage();
await storage.write(key: 'oauth_token', value: token);
```

**Security Features:**
- iOS Keychain integration
- Android Keystore with AES encryption
- Automatic encryption/decryption
- TEE (Trusted Execution Environment) support
- Hardware-backed security

**ميزات الأمان:**
- تكامل iOS Keychain
- Android Keystore مع تشفير AES
- تشفير/فك تشفير تلقائي
- دعم TEE (بيئة التنفيذ الموثوقة)
- أمان مدعوم بالأجهزة

---

## 🔒 Additional Security Measures

### 1. NEVER Log Tokens
```javascript
// ❌ NEVER DO THIS
console.log('Token:', token);
console.log('User data:', JSON.stringify(userData)); // If contains token

// ✅ SAFE LOGGING
console.log('Authentication successful');
console.log('User ID:', userId); // No sensitive data
```

### 2. ALWAYS Use HTTPS
```javascript
// ❌ NEVER DO THIS
fetch('http://api.example.com/user'); // Unencrypted!

// ✅ ALWAYS USE HTTPS
fetch('https://api.example.com/user');
```

### 3. Implement Token Expiry
```javascript
// ✅ CHECK TOKEN EXPIRY
if (isTokenExpired(token)) {
  await refreshToken();
}
```

### 4. Implement Token Rotation
```javascript
// ✅ ROTATE REFRESH TOKENS
const newTokens = await rotateRefreshToken(oldRefreshToken);
```

### 5. Clear Tokens on Logout
```javascript
// ✅ CLEAR ALL TOKENS
await Keychain.resetGenericPassword();
await fetch(API + '/auth/logout', { method: 'POST' });
```

---

## 📋 Security Checklist

Before deploying your app:

- [ ] **NOT** using AsyncStorage for tokens
- [ ] **NOT** using SharedPreferences for tokens
- [ ] **NOT** using localStorage for tokens
- [ ] **NOT** storing tokens in plain text files
- [ ] **IS** using react-native-keychain or flutter_secure_storage
- [ ] **IS** using HTTPS for all API calls
- [ ] **IS** implementing token expiry checks
- [ ] **IS** implementing refresh token rotation
- [ ] **NOT** logging tokens to console
- [ ] **IS** clearing tokens on logout
- [ ] **IS** handling token storage errors gracefully

قبل نشر تطبيقك:

- [ ] **لا** تستخدم AsyncStorage للرموز
- [ ] **لا** تستخدم SharedPreferences للرموز
- [ ] **لا** تستخدم localStorage للرموز
- [ ] **لا** تخزن الرموز في ملفات نص عادي
- [ ] **يستخدم** react-native-keychain أو flutter_secure_storage
- [ ] **يستخدم** HTTPS لجميع استدعاءات API
- [ ] **ينفذ** فحوصات انتهاء صلاحية الرمز
- [ ] **ينفذ** تدوير رمز التحديث
- [ ] **لا** يسجل الرموز في وحدة التحكم
- [ ] **يمسح** الرموز عند تسجيل الخروج
- [ ] **يتعامل** مع أخطاء تخزين الرموز بشكل جيد

---

## ⚖️ Legal & Compliance

### GDPR Compliance
- Users must be able to delete their tokens
- Implement secure storage for PII
- Clear tokens on account deletion

### OWASP Mobile Top 10
- M2: Insecure Data Storage
- M3: Insecure Communication
- M7: Client Code Quality

### Industry Standards
- OAuth 2.0 for Native Apps (RFC 8252)
- Best Current Practice for OAuth 2.0 (RFC 8252)
- Proof Key for Code Exchange (RFC 7636)

---

## 📞 Report Security Issues

If you discover a security vulnerability:

1. **DO NOT** create public issue
2. **DO NOT** share details publicly
3. **DO** email security concerns privately
4. **DO** allow time for patch before disclosure

---

## 🎓 Learn More

- [OWASP Mobile Security Project](https://owasp.org/www-project-mobile-security/)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [Mobile App Security Checklist](https://github.com/OWASP/owasp-masvs)

---

**Remember: Security is not optional. Implement it correctly from the start!**

**تذكر: الأمان ليس اختياريًا. نفذه بشكل صحيح من البداية!**
