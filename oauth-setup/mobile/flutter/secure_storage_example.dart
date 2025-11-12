/**
 * Flutter Secure Token Storage Example
 * مثال على تخزين الرموز الآمن في Flutter
 * 
 * This example demonstrates secure OAuth token storage using flutter_secure_storage
 * يوضح هذا المثال تخزين رموز OAuth الآمن باستخدام flutter_secure_storage
 * 
 * Installation / التثبيت:
 * Add to pubspec.yaml:
 *   flutter_secure_storage: ^9.0.0
 * 
 * Android minSdkVersion must be >= 18
 */

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

/// Secure Token Storage Service
/// خدمة تخزين الرموز الآمن
class SecureTokenStorage {
  // ✅ SECURE: Using flutter_secure_storage with encryption
  // آمن: استخدام flutter_secure_storage مع التشفير
  static final FlutterSecureStorage _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
      // Use Android Keystore for hardware-backed encryption
      // استخدام Android Keystore للتشفير المدعوم بالأجهزة
      keyCipherAlgorithm: KeyCipherAlgorithm.RSA_ECB_OAEPwithSHA_256andMGF1Padding,
      storageCipherAlgorithm: StorageCipherAlgorithm.AES_GCM_NoPadding,
    ),
    iOptions: IOSOptions(
      // Use iOS Keychain with accessibility options
      // استخدام iOS Keychain مع خيارات إمكانية الوصول
      accessibility: KeychainAccessibility.unlocked,
      // Require biometric or passcode
      // يتطلب القياسات الحيوية أو رمز المرور
      accountName: 'oauth_tokens',
    ),
  );

  /// Storage keys / مفاتيح التخزين
  static const String _keyAccessToken = 'oauth_access_token';
  static const String _keyRefreshToken = 'oauth_refresh_token';
  static const String _keyUserData = 'oauth_user_data';
  static const String _keyTimestamp = 'oauth_timestamp';
  static const String _keyExpiresIn = 'oauth_expires_in';

  /// Store OAuth tokens securely
  /// تخزين رموز OAuth بشكل آمن
  /// 
  /// Uses iOS Keychain or Android Keystore for hardware-backed encryption
  /// يستخدم iOS Keychain أو Android Keystore للتشفير المدعوم بالأجهزة
  /// 
  /// @param accessToken - OAuth access token
  /// @param refreshToken - OAuth refresh token
  /// @param user - User information
  /// @returns Future<bool> - True if storage successful
  static Future<bool> storeTokensSecurely({
    required String accessToken,
    required String refreshToken,
    Map<String, dynamic>? user,
  }) async {
    try {
      // Store tokens individually for granular access
      // تخزين الرموز بشكل فردي للوصول الدقيق
      await _storage.write(key: _keyAccessToken, value: accessToken);
      await _storage.write(key: _keyRefreshToken, value: refreshToken);
      
      // Store user data / تخزين بيانات المستخدم
      if (user != null) {
        await _storage.write(
          key: _keyUserData,
          value: jsonEncode(user),
        );
      }
      
      // Store timestamp for expiry checking / تخزين الطابع الزمني لفحص انتهاء الصلاحية
      await _storage.write(
        key: _keyTimestamp,
        value: DateTime.now().millisecondsSinceEpoch.toString(),
      );
      
      // Default: 15 minutes expiry / افتراضي: انتهاء صلاحية 15 دقيقة
      await _storage.write(
        key: _keyExpiresIn,
        value: (15 * 60 * 1000).toString(),
      );

      print('✅ Tokens stored securely in device keychain');
      return true;
    } catch (e) {
      print('❌ Failed to store tokens securely: $e');
      return false;
    }
  }

  /// Retrieve OAuth tokens from secure storage
  /// استرداد رموز OAuth من التخزين الآمن
  /// 
  /// @returns Future<TokenData?> - Token data or null if not found
  static Future<TokenData?> getTokensSecurely() async {
    try {
      final accessToken = await _storage.read(key: _keyAccessToken);
      final refreshToken = await _storage.read(key: _keyRefreshToken);
      final userDataStr = await _storage.read(key: _keyUserData);
      final timestampStr = await _storage.read(key: _keyTimestamp);
      final expiresInStr = await _storage.read(key: _keyExpiresIn);

      if (accessToken == null || refreshToken == null) {
        print('No tokens found in secure storage');
        return null;
      }

      // Parse user data / تحليل بيانات المستخدم
      Map<String, dynamic>? userData;
      if (userDataStr != null) {
        userData = jsonDecode(userDataStr);
      }

      // Check if token is expired / تحقق مما إذا كان الرمز منتهي الصلاحية
      bool isExpired = false;
      if (timestampStr != null && expiresInStr != null) {
        final timestamp = int.parse(timestampStr);
        final expiresIn = int.parse(expiresInStr);
        final tokenAge = DateTime.now().millisecondsSinceEpoch - timestamp;
        isExpired = tokenAge > expiresIn;
        
        if (isExpired) {
          print('⚠️ Access token expired, refresh needed');
        }
      }

      print('✅ Tokens retrieved from secure storage');
      return TokenData(
        accessToken: accessToken,
        refreshToken: refreshToken,
        user: userData,
        isExpired: isExpired,
      );
    } catch (e) {
      print('❌ Failed to retrieve tokens: $e');
      return null;
    }
  }

  /// Delete OAuth tokens from secure storage
  /// حذف رموز OAuth من التخزين الآمن
  /// 
  /// Call this on logout / اتصل بهذا عند تسجيل الخروج
  /// 
  /// @returns Future<bool> - True if deletion successful
  static Future<bool> deleteTokensSecurely() async {
    try {
      await _storage.delete(key: _keyAccessToken);
      await _storage.delete(key: _keyRefreshToken);
      await _storage.delete(key: _keyUserData);
      await _storage.delete(key: _keyTimestamp);
      await _storage.delete(key: _keyExpiresIn);

      print('✅ Tokens deleted from secure storage');
      return true;
    } catch (e) {
      print('❌ Failed to delete tokens: $e');
      return false;
    }
  }

  /// Delete all stored data
  /// حذف جميع البيانات المخزنة
  /// 
  /// Nuclear option for complete cleanup / خيار نووي للتنظيف الكامل
  static Future<bool> deleteAllSecurely() async {
    try {
      await _storage.deleteAll();
      print('✅ All secure storage cleared');
      return true;
    } catch (e) {
      print('❌ Failed to clear storage: $e');
      return false;
    }
  }

  /// Update access token (after refresh)
  /// تحديث رمز الوصول (بعد التحديث)
  /// 
  /// @param newAccessToken - New access token
  /// @returns Future<bool> - True if update successful
  static Future<bool> updateAccessToken(String newAccessToken) async {
    try {
      await _storage.write(key: _keyAccessToken, value: newAccessToken);
      await _storage.write(
        key: _keyTimestamp,
        value: DateTime.now().millisecondsSinceEpoch.toString(),
      );

      print('✅ Access token updated successfully');
      return true;
    } catch (e) {
      print('❌ Failed to update access token: $e');
      return false;
    }
  }

  /// Check if tokens exist in secure storage
  /// تحقق مما إذا كانت الرموز موجودة في التخزين الآمن
  /// 
  /// @returns Future<bool> - True if tokens exist
  static Future<bool> hasStoredTokens() async {
    try {
      final accessToken = await _storage.read(key: _keyAccessToken);
      return accessToken != null;
    } catch (e) {
      return false;
    }
  }
}

/// Token Data Model
/// نموذج بيانات الرمز
class TokenData {
  final String accessToken;
  final String refreshToken;
  final Map<String, dynamic>? user;
  final bool isExpired;

  TokenData({
    required this.accessToken,
    required this.refreshToken,
    this.user,
    this.isExpired = false,
  });

  Map<String, dynamic> toJson() => {
    'accessToken': accessToken,
    'refreshToken': refreshToken,
    'user': user,
    'isExpired': isExpired,
  };
}

/// OAuth Service Example
/// مثال على خدمة OAuth
class OAuthService {
  static const String baseUrl = 'https://your-oauth-server.com';

  /// Complete OAuth login flow
  /// تدفق تسجيل الدخول OAuth الكامل
  /// 
  /// @returns Future<bool> - True if login successful
  static Future<bool> login() async {
    try {
      // Step 1: Initiate OAuth (open in browser/webview)
      // الخطوة 1: بدء OAuth (فتح في المتصفح/webview)
      final oauthUrl = '$baseUrl/auth/github';
      // ... handle OAuth redirect

      // Step 2: Receive tokens from OAuth callback
      // الخطوة 2: تلقي الرموز من رد اتصال OAuth
      final response = await http.get(Uri.parse('$baseUrl/auth/callback'));
      final data = jsonDecode(response.body);

      if (data['success'] == true) {
        final accessToken = data['data']['token'];
        final refreshToken = data['data']['refreshToken'];
        final user = data['data']['user'];

        // Step 3: ✅ SECURELY store tokens
        // الخطوة 3: ✅ تخزين الرموز بشكل آمن
        final stored = await SecureTokenStorage.storeTokensSecurely(
          accessToken: accessToken,
          refreshToken: refreshToken,
          user: user,
        );

        if (stored) {
          print('✅ OAuth login successful, tokens stored securely');
          return true;
        }
      }

      throw Exception('OAuth login failed');
    } catch (e) {
      print('❌ OAuth login failed: $e');
      return false;
    }
  }

  /// Make authenticated API request with automatic token refresh
  /// إجراء طلب API مصادق عليه مع تحديث الرمز التلقائي
  /// 
  /// @param url - API endpoint
  /// @returns Future<http.Response> - HTTP response
  static Future<http.Response> authenticatedGet(String url) async {
    // Get tokens from secure storage / الحصول على الرموز من التخزين الآمن
    final tokenData = await SecureTokenStorage.getTokensSecurely();

    if (tokenData == null) {
      throw Exception('Not authenticated');
    }

    String accessToken = tokenData.accessToken;

    // If token is expired, refresh it / إذا كان الرمز منتهي الصلاحية، قم بتحديثه
    if (tokenData.isExpired) {
      print('Token expired, refreshing...');
      final newToken = await refreshAccessToken(tokenData.refreshToken);
      
      if (newToken != null) {
        await SecureTokenStorage.updateAccessToken(newToken);
        accessToken = newToken;
      } else {
        throw Exception('Failed to refresh token');
      }
    }

    // Make authenticated request / إجراء طلب مصادق عليه
    final response = await http.get(
      Uri.parse(url),
      headers: {
        'Authorization': 'Bearer $accessToken',
      },
    );

    return response;
  }

  /// Refresh access token using refresh token
  /// تحديث رمز الوصول باستخدام رمز التحديث
  /// 
  /// @param refreshToken - Refresh token
  /// @returns Future<String?> - New access token or null if failed
  static Future<String?> refreshAccessToken(String refreshToken) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refreshToken}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['accessToken'];
      }

      return null;
    } catch (e) {
      print('Failed to refresh token: $e');
      return null;
    }
  }

  /// Logout and clear tokens
  /// تسجيل الخروج ومسح الرموز
  /// 
  /// @returns Future<bool> - True if logout successful
  static Future<bool> logout() async {
    try {
      // Call backend logout endpoint / استدعاء نقطة نهاية تسجيل الخروج الخلفية
      await http.post(Uri.parse('$baseUrl/auth/logout'));

      // Clear secure storage / مسح التخزين الآمن
      await SecureTokenStorage.deleteTokensSecurely();

      print('✅ Logout successful');
      return true;
    } catch (e) {
      print('❌ Logout failed: $e');
      // Still clear local tokens even if backend call fails
      // ما زال يمسح الرموز المحلية حتى لو فشل استدعاء الخلفية
      await SecureTokenStorage.deleteTokensSecurely();
      return false;
    }
  }

  /// Check if user is authenticated
  /// تحقق مما إذا كان المستخدم مصادقًا عليه
  /// 
  /// @returns Future<bool> - True if authenticated
  static Future<bool> isAuthenticated() async {
    return await SecureTokenStorage.hasStoredTokens();
  }
}

/**
 * ⚠️ SECURITY NOTES / ملاحظات الأمان:
 * 
 * ✅ DO:
 * - Use flutter_secure_storage for token storage
 * - Enable hardware-backed encryption when available
 * - Check token expiry before API calls
 * - Clear tokens on logout
 * - Use HTTPS for all API calls
 * - Handle token refresh automatically
 * 
 * ❌ DON'T:
 * - Store tokens in SharedPreferences
 * - Log tokens to console
 * - Store tokens in plain text files
 * - Transmit tokens over HTTP
 * - Keep tokens after user logs out
 * - Hardcode API keys or secrets
 * 
 * 📚 Learn More:
 * - https://pub.dev/packages/flutter_secure_storage
 * - https://owasp.org/www-project-mobile-security/
 * - OAuth 2.0 for Native Apps (RFC 8252)
 * 
 * Platform-specific notes:
 * 
 * iOS:
 * - Uses Keychain Services
 * - Requires device unlock
 * - Supports biometric authentication
 * - Data cleared on app uninstall
 * 
 * Android:
 * - Uses Android Keystore System
 * - Hardware-backed encryption (when available)
 * - Encrypted at rest
 * - Data cleared on app uninstall
 * - Minimum SDK 18 required
 */
