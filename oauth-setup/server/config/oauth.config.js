/**
 * OAuth Providers Configuration / تكوين مزودي OAuth
 * 
 * Centralized configuration for all OAuth providers
 * تكوين مركزي لجميع مزودي OAuth
 * 
 * This file defines the configuration for different OAuth providers
 * يحدد هذا الملف التكوين لمختلف مزودي OAuth
 */

require('dotenv').config();

/**
 * OAuth Provider Configuration Structure / هيكل تكوين مزود OAuth
 * @typedef {Object} OAuthProvider
 * @property {string} clientId - Client ID from provider
 * @property {string} clientSecret - Client Secret from provider
 * @property {string} callbackUrl - OAuth callback URL
 * @property {string} authorizationUrl - Authorization endpoint
 * @property {string} tokenUrl - Token exchange endpoint
 * @property {string} userInfoUrl - User information endpoint
 * @property {string[]} scopes - Required OAuth scopes
 */

const oauthProviders = {
  // GitHub OAuth Configuration / تكوين GitHub OAuth
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackUrl: process.env.GITHUB_CALLBACK_URL,
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    userEmailUrl: 'https://api.github.com/user/emails',
    scopes: ['user:email', 'read:user'],
    enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
  },

  // Google OAuth Configuration (Placeholder) / تكوين Google OAuth (عنصر نائب)
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['openid', 'profile', 'email'],
    enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  },

  // Facebook OAuth Configuration (Placeholder) / تكوين Facebook OAuth (عنصر نائب)
  facebook: {
    clientId: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackUrl: process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:3000/auth/facebook/callback',
    authorizationUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    userInfoUrl: 'https://graph.facebook.com/me?fields=id,name,email,picture',
    scopes: ['email', 'public_profile'],
    enabled: !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET)
  },

  // Twitter OAuth Configuration (Placeholder) / تكوين Twitter OAuth (عنصر نائب)
  twitter: {
    clientId: process.env.TWITTER_CONSUMER_KEY,
    clientSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackUrl: process.env.TWITTER_CALLBACK_URL || 'http://localhost:3000/auth/twitter/callback',
    authorizationUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    userInfoUrl: 'https://api.twitter.com/2/users/me',
    scopes: ['tweet.read', 'users.read'],
    enabled: !!(process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET)
  }
};

/**
 * Get configuration for a specific OAuth provider
 * احصل على تكوين مزود OAuth محدد
 * 
 * @param {string} provider - Provider name (github, google, facebook, etc.)
 * @returns {OAuthProvider|null} Provider configuration or null if not found
 */
function getProviderConfig(provider) {
  const providerName = provider.toLowerCase();
  if (!oauthProviders[providerName]) {
    console.error(`OAuth provider "${provider}" not found`);
    return null;
  }
  
  if (!oauthProviders[providerName].enabled) {
    console.error(`OAuth provider "${provider}" is not enabled. Check environment variables.`);
    return null;
  }
  
  return oauthProviders[providerName];
}

/**
 * Get list of enabled OAuth providers
 * احصل على قائمة بمزودي OAuth المفعلين
 * 
 * @returns {string[]} List of enabled provider names
 */
function getEnabledProviders() {
  return Object.keys(oauthProviders).filter(
    provider => oauthProviders[provider].enabled
  );
}

/**
 * Validate OAuth configuration on startup
 * التحقق من صحة تكوين OAuth عند بدء التشغيل
 */
function validateOAuthConfig() {
  const enabledProviders = getEnabledProviders();
  
  if (enabledProviders.length === 0) {
    console.warn('⚠️  No OAuth providers are enabled. Please configure at least one provider in .env file');
    return false;
  }
  
  console.log(`✅ OAuth enabled for: ${enabledProviders.join(', ')}`);
  return true;
}

module.exports = {
  oauthProviders,
  getProviderConfig,
  getEnabledProviders,
  validateOAuthConfig
};
