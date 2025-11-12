/// Flutter Secure Storage Example for OAuth Tokens
///
/// This example demonstrates how to securely store OAuth tokens
/// in Flutter using the flutter_secure_storage package.
///
/// Add to pubspec.yaml:
/// dependencies:
///   flutter_secure_storage: ^9.0.0
///
/// For Android, add to android/app/build.gradle:
/// android {
///     compileSdkVersion 33
/// }

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';

/// OAuth Token Model
class OAuthTokens {
  final String accessToken;
  final String refreshToken;
  final int timestamp;

  OAuthTokens({
    required this.accessToken,
    required this.refreshToken,
    required this.timestamp,
  });

  /// Convert to JSON
  Map<String, dynamic> toJson() => {
        'accessToken': accessToken,
        'refreshToken': refreshToken,
        'timestamp': timestamp,
      };

  /// Create from JSON
  factory OAuthTokens.fromJson(Map<String, dynamic> json) {
    return OAuthTokens(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      timestamp: json['timestamp'] as int,
    );
  }

  /// Check if access token is expired (15 minutes)
  bool get isExpired {
    final now = DateTime.now().millisecondsSinceEpoch;
    final age = now - timestamp;
    final fifteenMinutes = 15 * 60 * 1000;
    return age > fifteenMinutes;
  }
}

/// OAuth Token Manager for secure storage
class OAuthTokenManager {
  static const String _keyTokens = 'oauth_tokens';

  // Create storage with secure options
  final _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
      // Use biometric authentication if available
      // biometricAuthenticationRequired: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
      // Use biometric authentication
      // biometricAuthenticationRequired: true,
    ),
  );

  /// Store OAuth tokens securely
  Future<bool> storeTokens(String accessToken, String refreshToken) async {
    try {
      final tokens = OAuthTokens(
        accessToken: accessToken,
        refreshToken: refreshToken,
        timestamp: DateTime.now().millisecondsSinceEpoch,
      );

      final tokensJson = jsonEncode(tokens.toJson());
      await _storage.write(key: _keyTokens, value: tokensJson);
      return true;
    } catch (e) {
      print('Failed to store tokens: $e');
      return false;
    }
  }

  /// Retrieve OAuth tokens securely
  Future<OAuthTokens?> retrieveTokens() async {
    try {
      final tokensJson = await _storage.read(key: _keyTokens);
      if (tokensJson == null) {
        return null;
      }

      final tokensMap = jsonDecode(tokensJson) as Map<String, dynamic>;
      return OAuthTokens.fromJson(tokensMap);
    } catch (e) {
      print('Failed to retrieve tokens: $e');
      return null;
    }
  }

  /// Delete stored OAuth tokens
  Future<bool> deleteTokens() async {
    try {
      await _storage.delete(key: _keyTokens);
      return true;
    } catch (e) {
      print('Failed to delete tokens: $e');
      return false;
    }
  }

  /// Delete all stored data (for complete logout)
  Future<bool> deleteAll() async {
    try {
      await _storage.deleteAll();
      return true;
    } catch (e) {
      print('Failed to delete all data: $e');
      return false;
    }
  }

  /// Update access token only (after refresh)
  Future<bool> updateAccessToken(String newAccessToken) async {
    try {
      final tokens = await retrieveTokens();
      if (tokens == null) {
        return false;
      }

      return await storeTokens(newAccessToken, tokens.refreshToken);
    } catch (e) {
      print('Failed to update access token: $e');
      return false;
    }
  }

  /// Update both tokens (after rotation)
  Future<bool> updateTokens(String newAccessToken, String newRefreshToken) async {
    return await storeTokens(newAccessToken, newRefreshToken);
  }

  /// Check if tokens exist
  Future<bool> hasTokens() async {
    final tokens = await retrieveTokens();
    return tokens != null;
  }

  /// Get access token only
  Future<String?> getAccessToken() async {
    final tokens = await retrieveTokens();
    return tokens?.accessToken;
  }

  /// Get refresh token only
  Future<String?> getRefreshToken() async {
    final tokens = await retrieveTokens();
    return tokens?.refreshToken;
  }
}

/// Example usage in a Flutter app
class OAuthService {
  final OAuthTokenManager _tokenManager = OAuthTokenManager();

  /// Login and store tokens
  Future<bool> login(String accessToken, String refreshToken) async {
    final stored = await _tokenManager.storeTokens(accessToken, refreshToken);
    if (!stored) {
      throw Exception('Failed to securely store tokens');
    }
    return stored;
  }

  /// Get current tokens
  Future<OAuthTokens?> getTokens() async {
    return await _tokenManager.retrieveTokens();
  }

  /// Check if user is logged in
  Future<bool> isLoggedIn() async {
    return await _tokenManager.hasTokens();
  }

  /// Logout and clear tokens
  Future<bool> logout() async {
    return await _tokenManager.deleteTokens();
  }

  /// Refresh access token
  Future<String?> refreshAccessToken() async {
    // Get current refresh token
    final refreshToken = await _tokenManager.getRefreshToken();
    if (refreshToken == null) {
      return null;
    }

    // Call your OAuth server to refresh token
    // This is a placeholder - implement your actual refresh logic
    try {
      // final response = await http.post(
      //   Uri.parse('https://your-oauth-server.com/oauth/token'),
      //   body: {
      //     'grant_type': 'refresh_token',
      //     'refresh_token': refreshToken,
      //     'client_id': 'your-client-id',
      //   },
      // );
      //
      // if (response.statusCode == 200) {
      //   final data = jsonDecode(response.body);
      //   await _tokenManager.updateTokens(
      //     data['access_token'],
      //     data['refresh_token'],
      //   );
      //   return data['access_token'];
      // }

      return null;
    } catch (e) {
      print('Failed to refresh token: $e');
      return null;
    }
  }

  /// Make authenticated API request
  Future<void> makeAuthenticatedRequest(String url) async {
    var tokens = await getTokens();
    if (tokens == null) {
      throw Exception('Not logged in');
    }

    // If token is expired, try to refresh
    if (tokens.isExpired) {
      final newAccessToken = await refreshAccessToken();
      if (newAccessToken == null) {
        throw Exception('Failed to refresh token');
      }
      tokens = await getTokens();
    }

    // Make your API request with tokens.accessToken
    // final response = await http.get(
    //   Uri.parse(url),
    //   headers: {
    //     'Authorization': 'Bearer ${tokens!.accessToken}',
    //   },
    // );
  }
}

/// Example Widget using OAuth
/// 
/// import 'package:flutter/material.dart';
/// 
/// class OAuthLoginPage extends StatefulWidget {
///   @override
///   _OAuthLoginPageState createState() => _OAuthLoginPageState();
/// }
/// 
/// class _OAuthLoginPageState extends State<OAuthLoginPage> {
///   final OAuthService _oauthService = OAuthService();
///   bool _isLoggedIn = false;
/// 
///   @override
///   void initState() {
///     super.initState();
///     _checkLoginStatus();
///   }
/// 
///   Future<void> _checkLoginStatus() async {
///     final isLoggedIn = await _oauthService.isLoggedIn();
///     setState(() {
///       _isLoggedIn = isLoggedIn;
///     });
///   }
/// 
///   Future<void> _login() async {
///     // Perform OAuth flow and get tokens
///     const accessToken = 'your-access-token';
///     const refreshToken = 'your-refresh-token';
///     
///     await _oauthService.login(accessToken, refreshToken);
///     await _checkLoginStatus();
///   }
/// 
///   Future<void> _logout() async {
///     await _oauthService.logout();
///     await _checkLoginStatus();
///   }
/// 
///   @override
///   Widget build(BuildContext context) {
///     return Scaffold(
///       appBar: AppBar(title: Text('OAuth Example')),
///       body: Center(
///         child: _isLoggedIn
///             ? ElevatedButton(
///                 onPressed: _logout,
///                 child: Text('Logout'),
///               )
///             : ElevatedButton(
///                 onPressed: _login,
///                 child: Text('Login'),
///               ),
///       ),
///     );
///   }
/// }
