/**
 * React Native Secure Storage Example for OAuth Tokens
 * 
 * This example demonstrates how to securely store OAuth tokens
 * in React Native using react-native-keychain library.
 * 
 * Installation:
 * npm install react-native-keychain
 * or
 * yarn add react-native-keychain
 */

import * as Keychain from 'react-native-keychain';

/**
 * Store OAuth tokens securely
 * @param {string} accessToken - The access token
 * @param {string} refreshToken - The refresh token
 * @returns {Promise<boolean>} Success status
 */
export async function storeTokens(accessToken, refreshToken) {
  try {
    // Store tokens in keychain with biometric protection (if available)
    await Keychain.setGenericPassword(
      'oauth_tokens', // username field (used as identifier)
      JSON.stringify({
        accessToken,
        refreshToken,
        timestamp: Date.now()
      }),
      {
        service: 'com.yourapp.oauth',
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        authenticatePromptTitle: 'Authenticate to access tokens'
      }
    );
    return true;
  } catch (error) {
    console.error('Failed to store tokens:', error);
    return false;
  }
}

/**
 * Retrieve OAuth tokens securely
 * @returns {Promise<Object|null>} Token object or null
 */
export async function retrieveTokens() {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: 'com.yourapp.oauth',
      authenticationPrompt: {
        title: 'Authenticate to access tokens',
        subtitle: 'Your credentials are required'
      }
    });

    if (credentials) {
      const tokens = JSON.parse(credentials.password);
      return tokens;
    }
    return null;
  } catch (error) {
    console.error('Failed to retrieve tokens:', error);
    return null;
  }
}

/**
 * Delete stored OAuth tokens
 * @returns {Promise<boolean>} Success status
 */
export async function deleteTokens() {
  try {
    await Keychain.resetGenericPassword({
      service: 'com.yourapp.oauth'
    });
    return true;
  } catch (error) {
    console.error('Failed to delete tokens:', error);
    return false;
  }
}

/**
 * Check if biometric authentication is available
 * @returns {Promise<boolean>} Availability status
 */
export async function isBiometricAvailable() {
  try {
    const biometryType = await Keychain.getSupportedBiometryType();
    return biometryType !== null;
  } catch (error) {
    console.error('Failed to check biometric availability:', error);
    return false;
  }
}

/**
 * Example usage in a React Native component
 */
export const OAuthTokenManager = {
  /**
   * Login and store tokens
   */
  async login(accessToken, refreshToken) {
    const stored = await storeTokens(accessToken, refreshToken);
    if (!stored) {
      throw new Error('Failed to securely store tokens');
    }
    return stored;
  },

  /**
   * Get current tokens
   */
  async getTokens() {
    const tokens = await retrieveTokens();
    if (!tokens) {
      return null;
    }

    // Check if access token is expired (simplified check)
    const now = Date.now();
    const tokenAge = now - tokens.timestamp;
    const fifteenMinutes = 15 * 60 * 1000;

    if (tokenAge > fifteenMinutes) {
      // Token might be expired, should refresh
      return { ...tokens, isExpired: true };
    }

    return { ...tokens, isExpired: false };
  },

  /**
   * Logout and clear tokens
   */
  async logout() {
    return await deleteTokens();
  },

  /**
   * Update access token (after refresh)
   */
  async updateAccessToken(newAccessToken) {
    const tokens = await retrieveTokens();
    if (!tokens) {
      throw new Error('No tokens found');
    }

    return await storeTokens(newAccessToken, tokens.refreshToken);
  },

  /**
   * Update both tokens (after rotation)
   */
  async updateTokens(newAccessToken, newRefreshToken) {
    return await storeTokens(newAccessToken, newRefreshToken);
  }
};

/**
 * React Hook for OAuth token management
 */
export function useOAuthTokens() {
  const [tokens, setTokens] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadTokens();
  }, []);

  async function loadTokens() {
    setLoading(true);
    const storedTokens = await OAuthTokenManager.getTokens();
    setTokens(storedTokens);
    setLoading(false);
  }

  async function saveTokens(accessToken, refreshToken) {
    await OAuthTokenManager.login(accessToken, refreshToken);
    await loadTokens();
  }

  async function clearTokens() {
    await OAuthTokenManager.logout();
    setTokens(null);
  }

  return {
    tokens,
    loading,
    saveTokens,
    clearTokens,
    refreshTokens: loadTokens
  };
}

// Export all functions
export default {
  storeTokens,
  retrieveTokens,
  deleteTokens,
  isBiometricAvailable,
  OAuthTokenManager,
  useOAuthTokens
};
