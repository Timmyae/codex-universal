/**
 * Flutter OAuth Integration Example
 * مثال على تكامل OAuth في Flutter
 * 
 * This example shows how to integrate the OAuth server with Flutter
 * يوضح هذا المثال كيفية دمج خادم OAuth مع Flutter
 * 
 * Installation / التثبيت:
 * Add to pubspec.yaml:
 *   flutter_appauth: ^6.0.0
 *   flutter_secure_storage: ^9.0.0
 *   http: ^1.1.0
 */

import 'package:flutter/material.dart';
import 'package:flutter_appauth/flutter_appauth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

/// Main OAuth Demo Screen
/// شاشة عرض OAuth الرئيسية
class OAuthDemoScreen extends StatefulWidget {
  const OAuthDemoScreen({Key? key}) : super(key: key);

  @override
  State<OAuthDemoScreen> createState() => _OAuthDemoScreenState();
}

class _OAuthDemoScreenState extends State<OAuthDemoScreen> {
  // OAuth Configuration / تكوين OAuth
  final String _oauthServerUrl = 'http://your-oauth-server.com';
  final String _clientId = 'your-github-client-id';
  final String _redirectUrl = 'com.yourapp://oauth';

  // Flutter AppAuth instance / مثيل Flutter AppAuth
  final FlutterAppAuth _appAuth = FlutterAppAuth();
  
  // Secure storage for tokens / التخزين الآمن للرموز
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  // State variables / متغيرات الحالة
  bool _isLoading = false;
  bool _isAuthenticated = false;
  Map<String, dynamic>? _user;

  @override
  void initState() {
    super.initState();
    _checkAuthStatus();
  }

  /// Check if user is already authenticated
  /// تحقق مما إذا كان المستخدم مصادقًا بالفعل
  Future<void> _checkAuthStatus() async {
    try {
      final token = await _secureStorage.read(key: 'auth_token');
      final userJson = await _secureStorage.read(key: 'user_data');

      if (token != null && userJson != null) {
        setState(() {
          _isAuthenticated = true;
          _user = jsonDecode(userJson);
        });
      }
    } catch (e) {
      print('Error checking auth status: $e');
    }
  }

  /// Login with GitHub OAuth
  /// تسجيل الدخول باستخدام GitHub OAuth
  Future<void> _loginWithGitHub() async {
    setState(() => _isLoading = true);

    try {
      final result = await _appAuth.authorizeAndExchangeCode(
        AuthorizationTokenRequest(
          _clientId,
          _redirectUrl,
          issuer: _oauthServerUrl,
          scopes: ['user:email', 'read:user'],
          serviceConfiguration: AuthorizationServiceConfiguration(
            authorizationEndpoint: 'https://github.com/login/oauth/authorize',
            tokenEndpoint: '$_oauthServerUrl/auth/github/callback',
          ),
        ),
      );

      if (result != null) {
        // Store tokens securely / تخزين الرموز بأمان
        await _secureStorage.write(key: 'auth_token', value: result.accessToken);
        if (result.refreshToken != null) {
          await _secureStorage.write(key: 'refresh_token', value: result.refreshToken);
        }

        // Fetch user profile / جلب ملف تعريف المستخدم
        await _fetchUserProfile(result.accessToken!);

        setState(() => _isAuthenticated = true);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('✅ Logged in successfully!')),
          );
        }
      }
    } catch (e) {
      print('OAuth error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('❌ Login failed: $e')),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  /// Fetch user profile from API
  /// جلب ملف تعريف المستخدم من API
  Future<void> _fetchUserProfile(String token) async {
    try {
      final response = await http.get(
        Uri.parse('$_oauthServerUrl/auth/me'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['user'] != null) {
          await _secureStorage.write(
            key: 'user_data',
            value: jsonEncode(data['user']),
          );
          setState(() => _user = data['user']);
        }
      }
    } catch (e) {
      print('Error fetching user profile: $e');
    }
  }

  /// Logout
  /// تسجيل الخروج
  Future<void> _logout() async {
    try {
      // Clear secure storage / مسح التخزين الآمن
      await _secureStorage.delete(key: 'auth_token');
      await _secureStorage.delete(key: 'refresh_token');
      await _secureStorage.delete(key: 'user_data');

      setState(() {
        _isAuthenticated = false;
        _user = null;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('👋 Logged out successfully!')),
        );
      }
    } catch (e) {
      print('Error logging out: $e');
    }
  }

  /// Test protected API
  /// اختبار API المحمي
  Future<void> _testProtectedAPI() async {
    try {
      final token = await _secureStorage.read(key: 'auth_token');

      if (token == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('❌ No token found. Please login.')),
          );
        }
        return;
      }

      final response = await http.get(
        Uri.parse('$_oauthServerUrl/auth/protected'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (mounted) {
          showDialog(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('✅ Success'),
              content: Text('Protected API test successful!\n\n${jsonEncode(data)}'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('OK'),
                ),
              ],
            ),
          );
        }
      } else {
        throw Exception('API test failed');
      }
    } catch (e) {
      print('Error testing API: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('❌ API test failed: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF667eea), Color(0xFF764ba2)],
          ),
        ),
        child: SafeArea(
          child: _isLoading
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircularProgressIndicator(color: Colors.white),
                      SizedBox(height: 20),
                      Text(
                        'Authenticating...',
                        style: TextStyle(color: Colors.white, fontSize: 16),
                      ),
                    ],
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text(
                        '🔐 OAuth Demo',
                        style: TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        'Flutter Integration',
                        style: TextStyle(fontSize: 16, color: Colors.white),
                      ),
                      const SizedBox(height: 30),
                      _buildCard(),
                      const SizedBox(height: 30),
                      const Text(
                        'Made with ❤️ for Codex Universal',
                        style: TextStyle(fontSize: 12, color: Colors.white),
                      ),
                    ],
                  ),
                ),
        ),
      ),
    );
  }

  /// Build main card with content
  /// بناء البطاقة الرئيسية بالمحتوى
  Widget _buildCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      padding: const EdgeInsets.all(30),
      child: !_isAuthenticated ? _buildLoggedOutView() : _buildLoggedInView(),
    );
  }

  /// Build logged out view
  /// بناء عرض غير مسجل الدخول
  Widget _buildLoggedOutView() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(15),
          decoration: BoxDecoration(
            color: const Color(0xFFFFF3CD),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Text(
            '⚠️ Not authenticated. Please login.',
            style: TextStyle(color: Color(0xFF856404)),
          ),
        ),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: _loginWithGitHub,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF24292e),
            padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 15),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.login, color: Colors.white),
              SizedBox(width: 10),
              Text(
                'Login with GitHub',
                style: TextStyle(fontSize: 16, color: Colors.white),
              ),
            ],
          ),
        ),
      ],
    );
  }

  /// Build logged in view
  /// بناء عرض مسجل الدخول
  Widget _buildLoggedInView() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(15),
          decoration: BoxDecoration(
            color: const Color(0xFFD4EDDA),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Text(
            '✅ Authenticated successfully!',
            style: TextStyle(color: Color(0xFF155724)),
          ),
        ),
        if (_user != null) ...[
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFFF8F9FA),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '👤 User Profile',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 15),
                _buildUserInfo('ID', _user!['userId']?.toString() ?? '-'),
                _buildUserInfo('Email', _user!['email']?.toString() ?? '-'),
                _buildUserInfo('Username', _user!['username']?.toString() ?? '-'),
                _buildUserInfo('Provider', _user!['provider']?.toString() ?? '-'),
              ],
            ),
          ),
        ],
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: _testProtectedAPI,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF007BFF),
            padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 15),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
          child: const Text(
            'Test Protected API',
            style: TextStyle(fontSize: 16, color: Colors.white),
          ),
        ),
        const SizedBox(height: 10),
        ElevatedButton(
          onPressed: _logout,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFDC3545),
            padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 15),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
          child: const Text(
            'Logout',
            style: TextStyle(fontSize: 16, color: Colors.white),
          ),
        ),
      ],
    );
  }

  /// Build user info row
  /// بناء صف معلومات المستخدم
  Widget _buildUserInfo(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: RichText(
        text: TextSpan(
          style: const TextStyle(fontSize: 14, color: Color(0xFF666666)),
          children: [
            TextSpan(
              text: '$label: ',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: Color(0xFF333333),
              ),
            ),
            TextSpan(text: value),
          ],
        ),
      ),
    );
  }
}

/**
 * Setup Instructions / تعليمات الإعداد:
 * 
 * 1. Add dependencies to pubspec.yaml / إضافة التبعيات إلى pubspec.yaml:
 *    dependencies:
 *      flutter_appauth: ^6.0.0
 *      flutter_secure_storage: ^9.0.0
 *      http: ^1.1.0
 * 
 * 2. Configure deep linking / تكوين الربط العميق:
 *    iOS (ios/Runner/Info.plist):
 *      <key>CFBundleURLTypes</key>
 *      <array>
 *        <dict>
 *          <key>CFBundleURLSchemes</key>
 *          <array>
 *            <string>com.yourapp</string>
 *          </array>
 *        </dict>
 *      </array>
 * 
 *    Android (android/app/src/main/AndroidManifest.xml):
 *      <intent-filter>
 *        <action android:name="android.intent.action.VIEW" />
 *        <category android:name="android.intent.category.DEFAULT" />
 *        <category android:name="android.intent.category.BROWSABLE" />
 *        <data android:scheme="com.yourapp" />
 *      </intent-filter>
 * 
 * 3. Update configuration / تحديث التكوين:
 *    - Change _oauthServerUrl to your OAuth server
 *    - Update _redirectUrl to your app's URL scheme
 *    - Set your GitHub Client ID
 * 
 * 4. Run / تشغيل:
 *    flutter run
 */
