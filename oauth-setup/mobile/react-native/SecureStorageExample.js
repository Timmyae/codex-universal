/**
 * React Native Secure Token Storage Example
 * مثال على تخزين الرموز الآمن في React Native
 * 
 * This example demonstrates secure OAuth token storage using react-native-keychain
 * يوضح هذا المثال تخزين رموز OAuth الآمن باستخدام react-native-keychain
 * 
 * Installation / التثبيت:
 * npm install react-native-keychain
 * 
 * iOS: pod install (in ios directory)
 * Android: Automatic linking
 */

import * as Keychain from 'react-native-keychain';

/**
 * Service name for keychain
 * اسم الخدمة للسلسلة الرئيسية
 */
const SERVICE_NAME = 'com.codexuniversal.oauth';

/**
 * Store OAuth tokens securely
 * تخزين رموز OAuth بشكل آمن
 * 
 * Uses iOS Keychain or Android Keystore for hardware-backed encryption
 * يستخدم iOS Keychain أو Android Keystore للتشفير المدعوم بالأجهزة
 * 
 * @param {string} accessToken - OAuth access token
 * @param {string} refreshToken - OAuth refresh token
 * @param {Object} user - User information
 * @returns {Promise<boolean>} True if storage successful
 */
export async function storeTokensSecurely(accessToken, refreshToken, user = {}) {
  try {
    // ✅ SECURE: Using react-native-keychain with hardware-backed encryption
    // آمن: استخدام react-native-keychain مع التشفير المدعوم بالأجهزة
    
    const tokenData = {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        provider: user.provider
      },
      timestamp: Date.now(),
      expiresIn: 15 * 60 * 1000 // 15 minutes in milliseconds
    };

    await Keychain.setGenericPassword(
      'oauth_tokens', // username (identifier)
      JSON.stringify(tokenData), // password (actual data)
      {
        // iOS: Require device unlock to access
        // iOS: يتطلب إلغاء قفل الجهاز للوصول
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
        
        // Require biometric or device passcode
        // يتطلب القياسات الحيوية أو رمز مرور الجهاز
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        
        // Service name for isolation
        // اسم الخدمة للعزل
        service: SERVICE_NAME,
        
        // Security level (Android)
        // مستوى الأمان (Android)
        securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE
      }
    );

    console.log('✅ Tokens stored securely in device keychain');
    return true;
  } catch (error) {
    console.error('❌ Failed to store tokens securely:', error.message);
    
    // Handle specific errors / معالجة أخطاء محددة
    if (error.message.includes('User canceled')) {
      console.log('User canceled biometric authentication');
    }
    
    return false;
  }
}

/**
 * Retrieve OAuth tokens from secure storage
 * استرداد رموز OAuth من التخزين الآمن
 * 
 * @param {boolean} requireBiometric - Require biometric auth (default: false)
 * @returns {Promise<Object|null>} Token data or null if not found
 */
export async function getTokensSecurely(requireBiometric = false) {
  try {
    const options = {
      service: SERVICE_NAME
    };

    // Optional: Require biometric authentication
    // اختياري: يتطلب المصادقة البيومترية
    if (requireBiometric) {
      options.authenticationPrompt = {
        title: 'Authentication Required',
        subtitle: 'Please authenticate to access your account',
        description: 'We need to verify your identity',
        cancel: 'Cancel'
      };
    }

    const credentials = await Keychain.getGenericPassword(options);

    if (!credentials) {
      console.log('No tokens found in secure storage');
      return null;
    }

    // Parse stored token data / تحليل بيانات الرمز المخزنة
    const tokenData = JSON.parse(credentials.password);

    // Check if access token is expired / تحقق مما إذا كان رمز الوصول منتهي الصلاحية
    const tokenAge = Date.now() - tokenData.timestamp;
    const isExpired = tokenAge > tokenData.expiresIn;

    if (isExpired) {
      console.log('⚠️ Access token expired, refresh needed');
      tokenData.isExpired = true;
    }

    console.log('✅ Tokens retrieved from secure storage');
    return tokenData;
  } catch (error) {
    console.error('❌ Failed to retrieve tokens:', error.message);
    return null;
  }
}

/**
 * Delete OAuth tokens from secure storage
 * حذف رموز OAuth من التخزين الآمن
 * 
 * Call this on logout / اتصل بهذا عند تسجيل الخروج
 * 
 * @returns {Promise<boolean>} True if deletion successful
 */
export async function deleteTokensSecurely() {
  try {
    await Keychain.resetGenericPassword({
      service: SERVICE_NAME
    });

    console.log('✅ Tokens deleted from secure storage');
    return true;
  } catch (error) {
    console.error('❌ Failed to delete tokens:', error.message);
    return false;
  }
}

/**
 * Check if biometric authentication is available
 * تحقق مما إذا كانت المصادقة البيومترية متاحة
 * 
 * @returns {Promise<Object>} Biometric info
 */
export async function checkBiometricAvailability() {
  try {
    const biometryType = await Keychain.getSupportedBiometryType();
    
    return {
      available: biometryType !== null,
      type: biometryType, // 'FaceID', 'TouchID', 'Fingerprint', 'Iris', etc.
      supported: true
    };
  } catch (error) {
    console.error('Failed to check biometric availability:', error.message);
    return {
      available: false,
      type: null,
      supported: false
    };
  }
}

/**
 * Update access token (after refresh)
 * تحديث رمز الوصول (بعد التحديث)
 * 
 * @param {string} newAccessToken - New access token
 * @returns {Promise<boolean>} True if update successful
 */
export async function updateAccessToken(newAccessToken) {
  try {
    // Get existing tokens / الحصول على الرموز الموجودة
    const existingData = await getTokensSecurely();
    
    if (!existingData) {
      throw new Error('No existing tokens found');
    }

    // Update access token and timestamp / تحديث رمز الوصول والطابع الزمني
    existingData.accessToken = newAccessToken;
    existingData.timestamp = Date.now();
    existingData.isExpired = false;

    // Store updated tokens / تخزين الرموز المحدثة
    await Keychain.setGenericPassword(
      'oauth_tokens',
      JSON.stringify(existingData),
      {
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
        service: SERVICE_NAME,
        securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE
      }
    );

    console.log('✅ Access token updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to update access token:', error.message);
    return false;
  }
}

/**
 * Complete OAuth flow with secure storage
 * تدفق OAuth الكامل مع التخزين الآمن
 * 
 * Example usage / مثال على الاستخدام:
 */
export async function oauthLoginExample() {
  try {
    // Step 1: Initiate OAuth (redirect to provider)
    // الخطوة 1: بدء OAuth (إعادة التوجيه إلى المزود)
    const oauthUrl = 'https://your-oauth-server.com/auth/github';
    // ... open OAuth URL in browser/webview

    // Step 2: Receive tokens from OAuth callback
    // الخطوة 2: تلقي الرموز من رد اتصال OAuth
    const { accessToken, refreshToken, user } = await getOAuthTokens();

    // Step 3: ✅ SECURELY store tokens
    // الخطوة 3: ✅ تخزين الرموز بشكل آمن
    const stored = await storeTokensSecurely(accessToken, refreshToken, user);

    if (stored) {
      console.log('✅ OAuth login successful, tokens stored securely');
      return true;
    } else {
      throw new Error('Failed to store tokens');
    }
  } catch (error) {
    console.error('❌ OAuth login failed:', error.message);
    return false;
  }
}

/**
 * Make authenticated API request with automatic token refresh
 * إجراء طلب API مصادق عليه مع تحديث الرمز التلقائي
 * 
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export async function authenticatedFetch(url, options = {}) {
  try {
    // Get tokens from secure storage / الحصول على الرموز من التخزين الآمن
    const tokenData = await getTokensSecurely();

    if (!tokenData) {
      throw new Error('Not authenticated');
    }

    // If token is expired, refresh it / إذا كان الرمز منتهي الصلاحية، قم بتحديثه
    if (tokenData.isExpired) {
      console.log('Token expired, refreshing...');
      const newTokens = await refreshAccessToken(tokenData.refreshToken);
      
      if (newTokens) {
        await updateAccessToken(newTokens.accessToken);
        tokenData.accessToken = newTokens.accessToken;
      } else {
        throw new Error('Failed to refresh token');
      }
    }

    // Make authenticated request / إجراء طلب مصادق عليه
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${tokenData.accessToken}`
      }
    });

    return response;
  } catch (error) {
    console.error('❌ Authenticated fetch failed:', error.message);
    throw error;
  }
}

/**
 * Logout and clear tokens
 * تسجيل الخروج ومسح الرموز
 */
export async function logout() {
  try {
    // Call backend logout endpoint / استدعاء نقطة نهاية تسجيل الخروج الخلفية
    await fetch('https://your-oauth-server.com/auth/logout', {
      method: 'POST'
    });

    // Clear secure storage / مسح التخزين الآمن
    await deleteTokensSecurely();

    console.log('✅ Logout successful');
    return true;
  } catch (error) {
    console.error('❌ Logout failed:', error.message);
    // Still clear local tokens even if backend call fails
    // ما زال يمسح الرموز المحلية حتى لو فشل استدعاء الخلفية
    await deleteTokensSecurely();
    return false;
  }
}

// Helper function placeholder / عنصر نائب لوظيفة المساعد
async function getOAuthTokens() {
  // Implement OAuth callback handling / تنفيذ معالجة رد اتصال OAuth
  throw new Error('Implement OAuth callback handling');
}

// Helper function placeholder / عنصر نائب لوظيفة المساعد
async function refreshAccessToken(refreshToken) {
  // Implement token refresh / تنفيذ تحديث الرمز
  throw new Error('Implement token refresh');
}

/**
 * ⚠️ SECURITY NOTES / ملاحظات الأمان:
 * 
 * ✅ DO:
 * - Use react-native-keychain for token storage
 * - Enable biometric authentication when possible
 * - Check token expiry before API calls
 * - Clear tokens on logout
 * - Use HTTPS for all API calls
 * 
 * ❌ DON'T:
 * - Store tokens in AsyncStorage
 * - Log tokens to console
 * - Store tokens in Redux state (unless ephemeral)
 * - Transmit tokens over HTTP
 * - Keep tokens after user logs out
 * 
 * 📚 Learn More:
 * - https://github.com/oblador/react-native-keychain
 * - https://owasp.org/www-project-mobile-security/
 * - OAuth 2.0 for Native Apps (RFC 8252)
 */

export default {
  storeTokensSecurely,
  getTokensSecurely,
  deleteTokensSecurely,
  checkBiometricAvailability,
  updateAccessToken,
  authenticatedFetch,
  logout
};
