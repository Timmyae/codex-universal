import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import 'secure_storage_example.dart';

/// OAuth Configuration
/// إعدادات OAuth
class OAuthConfig {
  static const String serverUrl = 'http://localhost:3000';
  static const String authEndpoint = '/auth/github';
  static const String callbackEndpoint = '/auth/github/callback';
  static const String refreshEndpoint = '/auth/refresh';
  static const String revokeEndpoint = '/auth/revoke';
  static const String meEndpoint = '/auth/me';
  static const String clientRedirectUri = 'yourapp://oauth/callback';
}

/// PKCE Helper Functions
/// وظائف مساعدة PKCE
class PKCEHelper {
  /// Generate code verifier
  /// توليد معرف التحقق
  static String generateCodeVerifier() {
    final random = Random.secure();
    final values = List<int>.generate(64, (i) => random.nextInt(256));
    final verifier = base64Url
        .encode(values)
        .replaceAll('=', '')
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .substring(0, 128);
    return verifier;
  }

  /// Generate code challenge from verifier
  /// توليد تحدي الكود من معرف التحقق
  static String generateCodeChallenge(String verifier) {
    final bytes = utf8.encode(verifier);
    final digest = sha256.convert(bytes);
    final challenge = base64Url
        .encode(digest.bytes)
        .replaceAll('=', '')
        .replaceAll('+', '-')
        .replaceAll('/', '_');
    return challenge;
  }
}

/// OAuth Service
/// خدمة OAuth
class OAuthService {
  String? _codeVerifier;

  /// Initiate OAuth flow
  /// بدء تدفق OAuth
  Future<void> initiateOAuth() async {
    try {
      // Generate PKCE parameters
      _codeVerifier = PKCEHelper.generateCodeVerifier();
      final codeChallenge = PKCEHelper.generateCodeChallenge(_codeVerifier!);

      // Store code verifier temporarily (we'll need it for token exchange)
      await SecureTokenStorage.storeTokens(
        accessToken: _codeVerifier!,
        refreshToken: '', // Temporary storage
      );

      // Build authorization URL
      final authUrl = Uri.parse('${OAuthConfig.serverUrl}${OAuthConfig.authEndpoint}');
      final authUrlWithParams = authUrl.replace(queryParameters: {
        'redirect_uri': OAuthConfig.clientRedirectUri,
        'code_challenge': codeChallenge,
        'code_challenge_method': 'S256',
      });

      // Open browser for authorization
      if (await canLaunchUrl(authUrlWithParams)) {
        await launchUrl(authUrlWithParams, mode: LaunchMode.externalApplication);
      } else {
        throw Exception('Could not launch $authUrlWithParams');
      }
    } catch (e) {
      print('[OAuth] Initiate error: $e');
      rethrow;
    }
  }

  /// Handle OAuth callback
  /// معالجة استدعاء OAuth
  Future<bool> handleCallback(Uri callbackUri) async {
    try {
      // Extract tokens from URL fragment
      final fragment = callbackUri.fragment;
      final params = Uri.splitQueryString(fragment);

      final accessToken = params['access_token'];
      final refreshToken = params['refresh_token'];

      if (accessToken != null && refreshToken != null) {
        // Calculate token expiry
        final expiresIn = int.tryParse(params['expires_in'] ?? '900') ?? 900;
        final expiresAt = DateTime.now().add(Duration(seconds: expiresIn));

        // Store tokens securely
        await SecureTokenStorage.storeTokens(
          accessToken: accessToken,
          refreshToken: refreshToken,
          expiresAt: expiresAt,
        );

        print('[OAuth] Authentication successful');
        return true;
      }

      return false;
    } catch (e) {
      print('[OAuth] Handle callback error: $e');
      return false;
    }
  }

  /// Verify access token
  /// التحقق من رمز الوصول
  Future<bool> verifyToken() async {
    try {
      final accessToken = await SecureTokenStorage.getAccessToken();
      if (accessToken == null) return false;

      final response = await http.get(
        Uri.parse('${OAuthConfig.serverUrl}${OAuthConfig.meEndpoint}'),
        headers: {
          'Authorization': 'Bearer $accessToken',
        },
      );

      return response.statusCode == 200;
    } catch (e) {
      print('[OAuth] Verify token error: $e');
      return false;
    }
  }

  /// Get user information
  /// الحصول على معلومات المستخدم
  Future<Map<String, dynamic>?> getUserInfo() async {
    try {
      final accessToken = await SecureTokenStorage.getAccessToken();
      if (accessToken == null) return null;

      final response = await http.get(
        Uri.parse('${OAuthConfig.serverUrl}${OAuthConfig.meEndpoint}'),
        headers: {
          'Authorization': 'Bearer $accessToken',
        },
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      }

      return null;
    } catch (e) {
      print('[OAuth] Get user info error: $e');
      return null;
    }
  }

  /// Refresh access token
  /// تجديد رمز الوصول
  Future<bool> refreshToken() async {
    try {
      final refreshToken = await SecureTokenStorage.getRefreshToken();
      if (refreshToken == null || refreshToken.isEmpty) {
        return false;
      }

      final response = await http.post(
        Uri.parse('${OAuthConfig.serverUrl}${OAuthConfig.refreshEndpoint}'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'refresh_token': refreshToken}),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final accessToken = data['access_token'];
        final newRefreshToken = data['refresh_token'];
        final expiresIn = data['expires_in'] ?? 900;

        if (accessToken != null && newRefreshToken != null) {
          final expiresAt = DateTime.now().add(Duration(seconds: expiresIn));

          await SecureTokenStorage.storeTokens(
            accessToken: accessToken,
            refreshToken: newRefreshToken,
            expiresAt: expiresAt,
          );

          print('[OAuth] Token refreshed successfully');
          return true;
        }
      }

      return false;
    } catch (e) {
      print('[OAuth] Refresh token error: $e');
      return false;
    }
  }

  /// Logout (revoke tokens)
  /// تسجيل الخروج (إبطال الرموز)
  Future<bool> logout() async {
    try {
      final accessToken = await SecureTokenStorage.getAccessToken();

      if (accessToken != null) {
        // Revoke token on server
        await http.post(
          Uri.parse('${OAuthConfig.serverUrl}${OAuthConfig.revokeEndpoint}'),
          headers: {'Content-Type': 'application/json'},
          body: json.encode({
            'token': accessToken,
            'token_type_hint': 'access_token',
          }),
        );
      }

      // Clear all tokens from secure storage
      await SecureTokenStorage.clearAllTokens();

      print('[OAuth] Logout successful');
      return true;
    } catch (e) {
      print('[OAuth] Logout error: $e');
      return false;
    }
  }
}

/// OAuth Flow Widget
/// واجهة تدفق OAuth
class OAuthFlowWidget extends StatefulWidget {
  const OAuthFlowWidget({Key? key}) : super(key: key);

  @override
  State<OAuthFlowWidget> createState() => _OAuthFlowWidgetState();
}

class _OAuthFlowWidgetState extends State<OAuthFlowWidget> {
  final _oauthService = OAuthService();
  bool _isAuthenticated = false;
  bool _isLoading = false;
  Map<String, dynamic>? _userInfo;

  @override
  void initState() {
    super.initState();
    _checkAuthStatus();
  }

  /// Check authentication status
  /// التحقق من حالة المصادقة
  Future<void> _checkAuthStatus() async {
    setState(() => _isLoading = true);

    try {
      final hasToken = await SecureTokenStorage.hasAccessToken();

      if (hasToken) {
        final isValid = await _oauthService.verifyToken();

        if (isValid) {
          setState(() => _isAuthenticated = true);
          await _fetchUserInfo();
        } else {
          // Try to refresh token
          final refreshed = await _oauthService.refreshToken();
          if (refreshed) {
            setState(() => _isAuthenticated = true);
            await _fetchUserInfo();
          }
        }
      }
    } catch (e) {
      print('[OAuth] Check auth status error: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  /// Fetch user information
  /// جلب معلومات المستخدم
  Future<void> _fetchUserInfo() async {
    final userInfo = await _oauthService.getUserInfo();
    if (userInfo != null) {
      setState(() => _userInfo = userInfo);
    }
  }

  /// Handle login
  /// معالجة تسجيل الدخول
  Future<void> _handleLogin() async {
    setState(() => _isLoading = true);

    try {
      await _oauthService.initiateOAuth();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to initiate OAuth: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  /// Handle logout
  /// معالجة تسجيل الخروج
  Future<void> _handleLogout() async {
    setState(() => _isLoading = true);

    try {
      await _oauthService.logout();
      setState(() {
        _isAuthenticated = false;
        _userInfo = null;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Logged out successfully')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to logout: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('OAuth Authentication'),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: _isLoading
              ? const CircularProgressIndicator()
              : _isAuthenticated
                  ? _buildAuthenticatedView()
                  : _buildUnauthenticatedView(),
        ),
      ),
    );
  }

  Widget _buildUnauthenticatedView() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text(
          'Welcome to OAuth Example',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: _handleLogin,
          child: const Text('Login with GitHub'),
        ),
      ],
    );
  }

  Widget _buildAuthenticatedView() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text(
          'Welcome!',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 20),
        if (_userInfo != null) ...[
          Text('User ID: ${_userInfo!['userId']}'),
          const SizedBox(height: 10),
        ],
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: _handleLogout,
          child: const Text('Logout'),
        ),
      ],
    );
  }
}
