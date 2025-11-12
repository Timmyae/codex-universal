import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Secure Token Storage for Flutter
/// التخزين الآمن للرموز في Flutter
/// 
/// Demonstrates secure token storage using flutter_secure_storage
/// Keychain (iOS) / KeyStore (Android)
class SecureTokenStorage {
  // Create secure storage instance
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
      // Use hardware-backed encryption if available
      storageCipherAlgorithm: StorageCipherAlgorithm.AES_GCM_NoPadding,
    ),
    iOptions: IOSOptions(
      // Keychain accessibility - data available when device unlocked
      accessibility: KeychainAccessibility.unlocked,
      // Synchronize with iCloud Keychain (optional)
      synchronizable: false,
    ),
  );

  // Storage keys
  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';
  static const _userIdKey = 'user_id';
  static const _tokenExpiryKey = 'token_expiry';

  /// Store access token securely
  /// تخزين رمز الوصول بشكل آمن
  static Future<bool> storeAccessToken(String token) async {
    try {
      await _storage.write(key: _accessTokenKey, value: token);
      print('[SecureStorage] Access token stored securely');
      return true;
    } catch (e) {
      print('[SecureStorage] Failed to store access token: $e');
      return false;
    }
  }

  /// Store refresh token securely
  /// تخزين رمز التحديث بشكل آمن
  static Future<bool> storeRefreshToken(String token) async {
    try {
      await _storage.write(key: _refreshTokenKey, value: token);
      print('[SecureStorage] Refresh token stored securely');
      return true;
    } catch (e) {
      print('[SecureStorage] Failed to store refresh token: $e');
      return false;
    }
  }

  /// Store both tokens at once
  /// تخزين كلا الرمزين معاً
  static Future<bool> storeTokens({
    required String accessToken,
    required String refreshToken,
    String? userId,
    DateTime? expiresAt,
  }) async {
    try {
      await _storage.write(key: _accessTokenKey, value: accessToken);
      await _storage.write(key: _refreshTokenKey, value: refreshToken);
      
      if (userId != null) {
        await _storage.write(key: _userIdKey, value: userId);
      }
      
      if (expiresAt != null) {
        await _storage.write(
          key: _tokenExpiryKey,
          value: expiresAt.toIso8601String(),
        );
      }
      
      print('[SecureStorage] All tokens stored securely');
      return true;
    } catch (e) {
      print('[SecureStorage] Failed to store tokens: $e');
      return false;
    }
  }

  /// Retrieve access token
  /// استرجاع رمز الوصول
  static Future<String?> getAccessToken() async {
    try {
      return await _storage.read(key: _accessTokenKey);
    } catch (e) {
      print('[SecureStorage] Failed to retrieve access token: $e');
      return null;
    }
  }

  /// Retrieve refresh token
  /// استرجاع رمز التحديث
  static Future<String?> getRefreshToken() async {
    try {
      return await _storage.read(key: _refreshTokenKey);
    } catch (e) {
      print('[SecureStorage] Failed to retrieve refresh token: $e');
      return null;
    }
  }

  /// Retrieve user ID
  /// استرجاع معرف المستخدم
  static Future<String?> getUserId() async {
    try {
      return await _storage.read(key: _userIdKey);
    } catch (e) {
      print('[SecureStorage] Failed to retrieve user ID: $e');
      return null;
    }
  }

  /// Get token expiry date
  /// الحصول على تاريخ انتهاء الرمز
  static Future<DateTime?> getTokenExpiry() async {
    try {
      final expiryStr = await _storage.read(key: _tokenExpiryKey);
      if (expiryStr != null) {
        return DateTime.parse(expiryStr);
      }
      return null;
    } catch (e) {
      print('[SecureStorage] Failed to retrieve token expiry: $e');
      return null;
    }
  }

  /// Check if access token exists
  /// التحقق من وجود رمز الوصول
  static Future<bool> hasAccessToken() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }

  /// Check if refresh token exists
  /// التحقق من وجود رمز التحديث
  static Future<bool> hasRefreshToken() async {
    final token = await getRefreshToken();
    return token != null && token.isNotEmpty;
  }

  /// Check if token is expired
  /// التحقق من انتهاء صلاحية الرمز
  static Future<bool> isTokenExpired() async {
    final expiry = await getTokenExpiry();
    if (expiry == null) {
      return true; // Consider expired if no expiry stored
    }
    return DateTime.now().isAfter(expiry);
  }

  /// Clear access token
  /// مسح رمز الوصول
  static Future<bool> clearAccessToken() async {
    try {
      await _storage.delete(key: _accessTokenKey);
      print('[SecureStorage] Access token cleared');
      return true;
    } catch (e) {
      print('[SecureStorage] Failed to clear access token: $e');
      return false;
    }
  }

  /// Clear refresh token
  /// مسح رمز التحديث
  static Future<bool> clearRefreshToken() async {
    try {
      await _storage.delete(key: _refreshTokenKey);
      print('[SecureStorage] Refresh token cleared');
      return true;
    } catch (e) {
      print('[SecureStorage] Failed to clear refresh token: $e');
      return false;
    }
  }

  /// Clear all tokens (logout)
  /// مسح جميع الرموز (تسجيل الخروج)
  static Future<bool> clearAllTokens() async {
    try {
      await _storage.delete(key: _accessTokenKey);
      await _storage.delete(key: _refreshTokenKey);
      await _storage.delete(key: _userIdKey);
      await _storage.delete(key: _tokenExpiryKey);
      print('[SecureStorage] All tokens cleared');
      return true;
    } catch (e) {
      print('[SecureStorage] Failed to clear tokens: $e');
      return false;
    }
  }

  /// Clear all storage (complete wipe)
  /// مسح جميع البيانات المخزنة (مسح كامل)
  static Future<bool> clearAll() async {
    try {
      await _storage.deleteAll();
      print('[SecureStorage] All data cleared');
      return true;
    } catch (e) {
      print('[SecureStorage] Failed to clear all data: $e');
      return false;
    }
  }

  /// Get all stored keys (for debugging only)
  /// الحصول على جميع المفاتيح المخزنة (للتصحيح فقط)
  static Future<Map<String, String>> getAllKeys() async {
    try {
      return await _storage.readAll();
    } catch (e) {
      print('[SecureStorage] Failed to read all keys: $e');
      return {};
    }
  }

  /// Check if secure storage is available
  /// التحقق من توفر التخزين الآمن
  static Future<bool> isStorageAvailable() async {
    try {
      // Try to write and read a test value
      const testKey = 'test_key';
      const testValue = 'test_value';
      
      await _storage.write(key: testKey, value: testValue);
      final readValue = await _storage.read(key: testKey);
      await _storage.delete(key: testKey);
      
      return readValue == testValue;
    } catch (e) {
      print('[SecureStorage] Storage not available: $e');
      return false;
    }
  }
}
