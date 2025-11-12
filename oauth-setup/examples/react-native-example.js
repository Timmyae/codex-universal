/**
 * React Native OAuth Integration Example
 * مثال على تكامل OAuth في React Native
 * 
 * This example shows how to integrate the OAuth server with React Native
 * يوضح هذا المثال كيفية دمج خادم OAuth مع React Native
 * 
 * Installation / التثبيت:
 * npm install react-native-app-auth @react-native-async-storage/async-storage
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { authorize, refresh, revoke } from 'react-native-app-auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// OAuth Configuration / تكوين OAuth
const config = {
  issuer: 'http://your-oauth-server.com', // Change to your server / غيّر إلى خادمك
  clientId: 'your-github-client-id', // Your GitHub OAuth Client ID
  redirectUrl: 'com.yourapp://oauth', // Your app's deep link scheme
  scopes: ['user:email', 'read:user'],
  serviceConfiguration: {
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'http://your-oauth-server.com/auth/github/callback',
  },
};

// Storage keys / مفاتيح التخزين
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';

const OAuthExample = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status on mount / التحقق من حالة المصادقة عند التحميل
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Check if user is already authenticated / تحقق مما إذا كان المستخدم مصادقًا بالفعل
  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const userData = await AsyncStorage.getItem(USER_KEY);

      if (token && userData) {
        setIsAuthenticated(true);
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  // Login with GitHub OAuth / تسجيل الدخول باستخدام GitHub OAuth
  const loginWithGitHub = async () => {
    setIsLoading(true);
    try {
      const result = await authorize(config);

      // Store tokens / تخزين الرموز
      await AsyncStorage.setItem(TOKEN_KEY, result.accessToken);
      if (result.refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
      }

      // Fetch user profile / جلب ملف تعريف المستخدم
      await fetchUserProfile(result.accessToken);

      setIsAuthenticated(true);
      Alert.alert('Success', 'Logged in successfully!');
    } catch (error) {
      console.error('OAuth error:', error);
      Alert.alert('Error', 'Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user profile from API / جلب ملف تعريف المستخدم من API
  const fetchUserProfile = async (token) => {
    try {
      const response = await fetch('http://your-oauth-server.com/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success && data.user) {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Logout / تسجيل الخروج
  const logout = async () => {
    try {
      // Clear tokens / مسح الرموز
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);

      setIsAuthenticated(false);
      setUser(null);
      Alert.alert('Success', 'Logged out successfully!');
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Failed to logout.');
    }
  };

  // Test protected API / اختبار API المحمي
  const testProtectedAPI = async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);

      if (!token) {
        Alert.alert('Error', 'No token found. Please login.');
        return;
      }

      const response = await fetch('http://your-oauth-server.com/auth/protected', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Protected API test successful!');
      } else {
        Alert.alert('Error', data.message || 'API test failed');
      }
    } catch (error) {
      console.error('Error testing API:', error);
      Alert.alert('Error', 'Failed to test API.');
    }
  };

  // Render loading state / عرض حالة التحميل
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Authenticating...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>🔐 OAuth Demo</Text>
        <Text style={styles.subtitle}>React Native Integration</Text>

        {!isAuthenticated ? (
          // Logged Out View / عرض غير مسجل الدخول
          <View style={styles.card}>
            <Text style={styles.statusText}>⚠️ Not authenticated</Text>
            <TouchableOpacity
              style={styles.buttonGitHub}
              onPress={loginWithGitHub}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Login with GitHub</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Logged In View / عرض مسجل الدخول
          <View style={styles.card}>
            <Text style={styles.statusTextSuccess}>✅ Authenticated</Text>

            {user && (
              <View style={styles.userInfo}>
                <Text style={styles.userInfoTitle}>👤 User Profile</Text>
                <Text style={styles.userInfoText}>
                  <Text style={styles.bold}>ID:</Text> {user.userId || user.id}
                </Text>
                <Text style={styles.userInfoText}>
                  <Text style={styles.bold}>Email:</Text> {user.email}
                </Text>
                <Text style={styles.userInfoText}>
                  <Text style={styles.bold}>Username:</Text> {user.username}
                </Text>
                <Text style={styles.userInfoText}>
                  <Text style={styles.bold}>Provider:</Text> {user.provider}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.buttonAPI}
              onPress={testProtectedAPI}
            >
              <Text style={styles.buttonText}>Test Protected API</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buttonLogout}
              onPress={logout}
            >
              <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.footer}>Made with ❤️ for Codex Universal</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#667eea',
  },
  loadingText: {
    marginTop: 10,
    color: '#fff',
    fontSize: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#856404',
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
  statusTextSuccess: {
    fontSize: 16,
    color: '#155724',
    backgroundColor: '#d4edda',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
  userInfo: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  userInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  userInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  bold: {
    fontWeight: 'bold',
    color: '#333',
  },
  buttonGitHub: {
    backgroundColor: '#24292e',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonAPI: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonLogout: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    color: '#fff',
    marginTop: 30,
    fontSize: 12,
  },
});

export default OAuthExample;

/**
 * Setup Instructions / تعليمات الإعداد:
 * 
 * 1. Install dependencies / تثبيت التبعيات:
 *    npm install react-native-app-auth @react-native-async-storage/async-storage
 * 
 * 2. Configure deep linking in your app / تكوين الربط العميق في تطبيقك:
 *    - iOS: Add URL scheme in Info.plist
 *    - Android: Add intent filter in AndroidManifest.xml
 * 
 * 3. Update configuration / تحديث التكوين:
 *    - Change API_BASE_URL to your OAuth server
 *    - Update redirectUrl to your app's URL scheme
 *    - Set your GitHub Client ID
 * 
 * 4. Test / اختبار:
 *    - Run the app
 *    - Click "Login with GitHub"
 *    - Authorize the app
 *    - View user profile
 */
