/**
 * Secure Token Storage Example - React Native
 * 
 * مثال على التخزين الآمن للرموز - React Native
 * Demonstrates secure token storage using react-native-keychain
 * 
 * @see https://github.com/oblador/react-native-keychain
 */

import * as Keychain from 'react-native-keychain';

// Service name for keychain (use your app bundle ID)
const SERVICE_NAME = 'com.yourapp.oauth';

/**
 * Security Configuration
 * إعدادات الأمان
 */
const KEYCHAIN_OPTIONS = {
  service: SERVICE_NAME,
  // iOS: Keychain protection level
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
  // Android: Use biometric authentication (optional)
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
  // Storage: Use hardware-backed keystore
  storage: Keychain.STORAGE_TYPE.AES,
};

/**
 * Store access token securely
 * تخزين رمز الوصول بشكل آمن
 * 
 * @param {string} accessToken - The access token to store
 * @returns {Promise<boolean>} Success status
 */
export async function storeAccessToken(accessToken) {
  try {
    await Keychain.setGenericPassword(
      'access_token', // username field (key identifier)
      accessToken,    // password field (actual token)
      {
        ...KEYCHAIN_OPTIONS,
        // Additional security: require device unlock
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }
    );
    
    console.log('[SecureStorage] Access token stored securely');
    return true;
  } catch (error) {
    console.error('[SecureStorage] Failed to store access token:', error);
    return false;
  }
}

/**
 * Store refresh token securely
 * تخزين رمز التحديث بشكل آمن
 * 
 * @param {string} refreshToken - The refresh token to store
 * @returns {Promise<boolean>} Success status
 */
export async function storeRefreshToken(refreshToken) {
  try {
    await Keychain.setGenericPassword(
      'refresh_token',
      refreshToken,
      {
        ...KEYCHAIN_OPTIONS,
        service: `${SERVICE_NAME}.refresh`,
        // More restrictive: require biometric on access
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      }
    );
    
    console.log('[SecureStorage] Refresh token stored securely');
    return true;
  } catch (error) {
    console.error('[SecureStorage] Failed to store refresh token:', error);
    return false;
  }
}

/**
 * Retrieve access token
 * استرجاع رمز الوصول
 * 
 * @returns {Promise<string|null>} Access token or null
 */
export async function getAccessToken() {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: SERVICE_NAME,
    });
    
    if (credentials) {
      return credentials.password; // Token is stored in password field
    }
    
    return null;
  } catch (error) {
    console.error('[SecureStorage] Failed to retrieve access token:', error);
    return null;
  }
}

/**
 * Retrieve refresh token
 * استرجاع رمز التحديث
 * 
 * @returns {Promise<string|null>} Refresh token or null
 */
export async function getRefreshToken() {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: `${SERVICE_NAME}.refresh`,
    });
    
    if (credentials) {
      return credentials.password;
    }
    
    return null;
  } catch (error) {
    console.error('[SecureStorage] Failed to retrieve refresh token:', error);
    return null;
  }
}

/**
 * Store both tokens at once
 * تخزين كلا الرمزين معاً
 * 
 * @param {string} accessToken - Access token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<boolean>} Success status
 */
export async function storeTokens(accessToken, refreshToken) {
  try {
    const accessSuccess = await storeAccessToken(accessToken);
    const refreshSuccess = await storeRefreshToken(refreshToken);
    
    return accessSuccess && refreshSuccess;
  } catch (error) {
    console.error('[SecureStorage] Failed to store tokens:', error);
    return false;
  }
}

/**
 * Clear access token
 * مسح رمز الوصول
 * 
 * @returns {Promise<boolean>} Success status
 */
export async function clearAccessToken() {
  try {
    await Keychain.resetGenericPassword({
      service: SERVICE_NAME,
    });
    
    console.log('[SecureStorage] Access token cleared');
    return true;
  } catch (error) {
    console.error('[SecureStorage] Failed to clear access token:', error);
    return false;
  }
}

/**
 * Clear refresh token
 * مسح رمز التحديث
 * 
 * @returns {Promise<boolean>} Success status
 */
export async function clearRefreshToken() {
  try {
    await Keychain.resetGenericPassword({
      service: `${SERVICE_NAME}.refresh`,
    });
    
    console.log('[SecureStorage] Refresh token cleared');
    return true;
  } catch (error) {
    console.error('[SecureStorage] Failed to clear refresh token:', error);
    return false;
  }
}

/**
 * Clear all tokens (logout)
 * مسح جميع الرموز (تسجيل الخروج)
 * 
 * @returns {Promise<boolean>} Success status
 */
export async function clearAllTokens() {
  try {
    await clearAccessToken();
    await clearRefreshToken();
    
    console.log('[SecureStorage] All tokens cleared');
    return true;
  } catch (error) {
    console.error('[SecureStorage] Failed to clear tokens:', error);
    return false;
  }
}

/**
 * Check if tokens exist
 * التحقق من وجود الرموز
 * 
 * @returns {Promise<Object>} Status of tokens
 */
export async function hasTokens() {
  const accessToken = await getAccessToken();
  const refreshToken = await getRefreshToken();
  
  return {
    hasAccessToken: accessToken !== null,
    hasRefreshToken: refreshToken !== null,
    hasAnyToken: accessToken !== null || refreshToken !== null,
  };
}

/**
 * Get Keychain capabilities
 * الحصول على قدرات Keychain
 * 
 * @returns {Promise<Object>} Device capabilities
 */
export async function getKeychainCapabilities() {
  try {
    const canUseKeychain = await Keychain.getSupportedBiometryType();
    
    return {
      biometryType: canUseKeychain,
      canUseBiometry: canUseKeychain !== null,
      canUseKeychain: true,
    };
  } catch (error) {
    console.error('[SecureStorage] Failed to get capabilities:', error);
    return {
      biometryType: null,
      canUseBiometry: false,
      canUseKeychain: false,
    };
  }
}

// Export all functions
export default {
  storeAccessToken,
  storeRefreshToken,
  getAccessToken,
  getRefreshToken,
  storeTokens,
  clearAccessToken,
  clearRefreshToken,
  clearAllTokens,
  hasTokens,
  getKeychainCapabilities,
};
