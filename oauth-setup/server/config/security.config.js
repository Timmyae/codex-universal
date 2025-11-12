/**
 * Security Configuration
 * 
 * إعدادات الأمان
 * Security settings and policies
 */

/**
 * Security configuration object
 * كائن إعدادات الأمان
 */
const securityConfig = {
  // JWT Settings
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '30d',
    issuer: 'codex-universal-oauth',
    audience: 'codex-universal-api'
  },

  // CORS Settings
  cors: {
    origin: function(origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim());
      
      if (allowedOrigins.length === 0) {
        // No origins configured - allow all in development
        if (process.env.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        // Deny all in production if not configured
        return callback(new Error('CORS origin not allowed'));
      }
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS origin not allowed'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
    maxAge: 86400 // 24 hours
  },

  // Helmet Settings (Security Headers)
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
    frameguard: {
      action: 'deny'
    }
  },

  // HTTPS Enforcement
  enforceHttps: process.env.ENFORCE_HTTPS === 'true',

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 900000,
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 20
  },

  // Session Settings
  session: {
    secret: process.env.SESSION_SECRET,
    name: 'oauth_sid',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 600000, // 10 minutes
      sameSite: 'lax'
    }
  },

  // PKCE Settings
  pkce: {
    enabled: process.env.ENABLE_PKCE === 'true',
    verifierLength: 128, // Maximum length for best security
    method: 'S256' // Only S256 supported by GitHub
  },

  // Token Settings
  token: {
    // Store code verifier in session (never localStorage)
    storeVerifierInSession: true,
    // Rotate refresh tokens on use
    rotateRefreshTokens: true,
    // Revoke old refresh token when rotating
    revokeOldToken: true
  },

  // Redirect URI Settings
  redirectUri: {
    allowedUris: (process.env.ALLOWED_REDIRECT_URIS || '').split(',').map(u => u.trim()),
    strictValidation: true,
    allowWildcards: false
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    logAuthAttempts: true,
    logTokenOperations: true,
    logSecurityViolations: true
  },

  // Validate configuration
  validate() {
    const errors = [];

    if (!this.jwt.secret) {
      errors.push('JWT_SECRET is not configured');
    }

    if (!this.session.secret) {
      errors.push('SESSION_SECRET is not configured');
    }

    if (this.redirectUri.allowedUris.length === 0) {
      errors.push('ALLOWED_REDIRECT_URIS is not configured');
    }

    if (process.env.NODE_ENV === 'production') {
      if (!this.enforceHttps) {
        console.warn('[Security] ENFORCE_HTTPS should be true in production');
      }

      if (!this.pkce.enabled) {
        console.warn('[Security] PKCE should be enabled in production');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Security configuration errors:\n${errors.join('\n')}`);
    }

    console.log('[Security] Configuration validated successfully');
  }
};

module.exports = {
  securityConfig
};
