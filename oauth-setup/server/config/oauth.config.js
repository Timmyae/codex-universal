/**
 * OAuth Configuration
 * 
 * إعدادات OAuth
 * OAuth provider configurations
 */

/**
 * GitHub OAuth Configuration
 * إعدادات GitHub OAuth
 */
const githubConfig = {
  clientId: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackUrl: process.env.GITHUB_CALLBACK_URL,
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  userUrl: 'https://api.github.com/user',
  scope: 'read:user user:email',
  
  // Validate configuration
  validate() {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('GitHub OAuth credentials not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET');
    }
    if (!this.callbackUrl) {
      throw new Error('GitHub callback URL not configured. Set GITHUB_CALLBACK_URL');
    }
  }
};

/**
 * Get authorization URL with PKCE
 * الحصول على رابط التفويض مع PKCE
 * 
 * @param {string} state - CSRF protection state
 * @param {string} codeChallenge - PKCE code challenge
 * @param {string} redirectUri - Redirect URI after authorization
 * @returns {string} Authorization URL
 */
function getGitHubAuthUrl(state, codeChallenge, redirectUri = null) {
  const params = new URLSearchParams({
    client_id: githubConfig.clientId,
    redirect_uri: redirectUri || githubConfig.callbackUrl,
    scope: githubConfig.scope,
    state: state,
    response_type: 'code'
  });

  // Add PKCE parameters if enabled
  if (process.env.ENABLE_PKCE === 'true' && codeChallenge) {
    params.append('code_challenge', codeChallenge);
    params.append('code_challenge_method', 'S256');
  }

  return `${githubConfig.authorizationUrl}?${params.toString()}`;
}

/**
 * OAuth configuration object
 * كائن إعدادات OAuth
 */
const oauthConfig = {
  github: githubConfig,
  
  // Enable PKCE
  enablePKCE: process.env.ENABLE_PKCE === 'true',
  
  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET,
    name: 'oauth_session',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true, // Prevent XSS
      maxAge: 600000, // 10 minutes
      sameSite: 'lax' // CSRF protection
    }
  },
  
  // Validate all configurations
  validateAll() {
    this.github.validate();
    
    if (!this.session.secret) {
      throw new Error('Session secret not configured. Set SESSION_SECRET');
    }
    
    if (this.enablePKCE) {
      console.log('[OAuth] PKCE is enabled for enhanced security');
    } else {
      console.warn('[OAuth] PKCE is disabled - this is not recommended for production');
    }
  }
};

module.exports = {
  oauthConfig,
  getGitHubAuthUrl
};
