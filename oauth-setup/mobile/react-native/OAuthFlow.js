/**
 * Complete OAuth Flow - React Native
 * 
 * تدفق OAuth الكامل - React Native
 * Complete OAuth 2.0 flow with PKCE for React Native
 */

import React, { useState, useEffect } from 'react';
import { View, Button, Text, StyleSheet, Alert, Linking } from 'react-native';
import axios from 'axios';
import crypto from 'react-native-crypto';
import {
  storeTokens,
  getAccessToken,
  getRefreshToken,
  clearAllTokens,
} from './SecureStorageExample';

// OAuth Server Configuration
const OAUTH_CONFIG = {
  serverUrl: 'http://localhost:3000', // Change to your server URL
  authEndpoint: '/auth/github',
  callbackEndpoint: '/auth/github/callback',
  refreshEndpoint: '/auth/refresh',
  revokeEndpoint: '/auth/revoke',
  clientRedirectUri: 'yourapp://oauth/callback', // Your app's deep link
};

/**
 * Generate PKCE code verifier and challenge
 * توليد معرف التحقق وتحدي PKCE
 */
function generatePKCE() {
  // Generate random code verifier (43-128 characters)
  const randomBytes = crypto.randomBytes(64);
  const codeVerifier = randomBytes
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .substring(0, 128);

  // Calculate code challenge (SHA256 hash of verifier)
  const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64');
  const codeChallenge = hash
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return { codeVerifier, codeChallenge };
}

/**
 * OAuth Flow Component
 * مكون تدفق OAuth
 */
export default function OAuthFlow() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
    
    // Listen for deep link callbacks
    Linking.addEventListener('url', handleDeepLink);
    
    return () => {
      Linking.removeEventListener('url', handleDeepLink);
    };
  }, []);

  /**
   * Check if user is already authenticated
   * التحقق من حالة المصادقة
   */
  async function checkAuthStatus() {
    try {
      const accessToken = await getAccessToken();
      
      if (accessToken) {
        // Verify token with server
        const isValid = await verifyToken(accessToken);
        
        if (isValid) {
          setIsAuthenticated(true);
          await fetchUserInfo(accessToken);
        } else {
          // Token invalid, try to refresh
          await refreshTokens();
        }
      }
    } catch (error) {
      console.error('[OAuth] Check auth status error:', error);
    }
  }

  /**
   * Initiate OAuth flow
   * بدء تدفق OAuth
   */
  async function initiateOAuth() {
    try {
      setLoading(true);

      // Generate PKCE parameters
      const { codeVerifier, codeChallenge } = generatePKCE();

      // Store code verifier securely (needed for token exchange)
      await storeTokens(codeVerifier, ''); // Temporary storage

      // Build authorization URL
      const authUrl = `${OAUTH_CONFIG.serverUrl}${OAUTH_CONFIG.authEndpoint}?` +
        `redirect_uri=${encodeURIComponent(OAUTH_CONFIG.clientRedirectUri)}&` +
        `code_challenge=${codeChallenge}&` +
        `code_challenge_method=S256`;

      // Open browser for authorization
      const supported = await Linking.canOpenURL(authUrl);
      
      if (supported) {
        await Linking.openURL(authUrl);
      } else {
        Alert.alert('Error', 'Cannot open authorization URL');
      }
    } catch (error) {
      console.error('[OAuth] Initiate error:', error);
      Alert.alert('Error', 'Failed to initiate OAuth flow');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle deep link callback
   * معالجة رابط العودة العميق
   */
  async function handleDeepLink({ url }) {
    try {
      if (!url.startsWith(OAUTH_CONFIG.clientRedirectUri)) {
        return;
      }

      // Parse callback URL
      const params = new URLSearchParams(url.split('#')[1]);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        // Store tokens securely
        await storeTokens(accessToken, refreshToken);
        
        setIsAuthenticated(true);
        await fetchUserInfo(accessToken);
        
        Alert.alert('Success', 'Authentication successful!');
      } else {
        Alert.alert('Error', 'Failed to receive tokens');
      }
    } catch (error) {
      console.error('[OAuth] Handle callback error:', error);
      Alert.alert('Error', 'Authentication failed');
    }
  }

  /**
   * Verify access token
   * التحقق من رمز الوصول
   */
  async function verifyToken(accessToken) {
    try {
      const response = await axios.get(
        `${OAUTH_CONFIG.serverUrl}/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fetch user information
   * جلب معلومات المستخدم
   */
  async function fetchUserInfo(accessToken) {
    try {
      const response = await axios.get(
        `${OAUTH_CONFIG.serverUrl}/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setUser(response.data);
    } catch (error) {
      console.error('[OAuth] Fetch user info error:', error);
    }
  }

  /**
   * Refresh access token
   * تجديد رمز الوصول
   */
  async function refreshTokens() {
    try {
      const refreshToken = await getRefreshToken();
      
      if (!refreshToken) {
        return false;
      }

      const response = await axios.post(
        `${OAUTH_CONFIG.serverUrl}${OAUTH_CONFIG.refreshEndpoint}`,
        {
          refresh_token: refreshToken,
        }
      );

      if (response.data.access_token && response.data.refresh_token) {
        // Store new tokens
        await storeTokens(
          response.data.access_token,
          response.data.refresh_token
        );
        
        setIsAuthenticated(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[OAuth] Refresh token error:', error);
      return false;
    }
  }

  /**
   * Logout (revoke tokens)
   * تسجيل الخروج (إبطال الرموز)
   */
  async function logout() {
    try {
      const accessToken = await getAccessToken();
      
      if (accessToken) {
        // Revoke token on server
        await axios.post(
          `${OAUTH_CONFIG.serverUrl}${OAUTH_CONFIG.revokeEndpoint}`,
          {
            token: accessToken,
            token_type_hint: 'access_token',
          }
        );
      }

      // Clear tokens from secure storage
      await clearAllTokens();
      
      setIsAuthenticated(false);
      setUser(null);
      
      Alert.alert('Success', 'Logged out successfully');
    } catch (error) {
      console.error('[OAuth] Logout error:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  }

  // Render UI
  return (
    <View style={styles.container}>
      <Text style={styles.title}>OAuth Authentication</Text>
      
      {!isAuthenticated ? (
        <Button
          title={loading ? 'Loading...' : 'Login with GitHub'}
          onPress={initiateOAuth}
          disabled={loading}
        />
      ) : (
        <View>
          <Text style={styles.welcomeText}>
            Welcome, {user?.username || 'User'}!
          </Text>
          <Button title="Logout" onPress={logout} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 18,
    marginBottom: 20,
  },
});
