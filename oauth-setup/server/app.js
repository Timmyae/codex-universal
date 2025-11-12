const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { validateRedirectUri } = require('./middleware/redirect-validation.middleware');
const {
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  revokeToken
} = require('./utils/token.utils');
const {
  generateCodeVerifier,
  generateCodeChallenge,
  verifyCodeChallenge
} = require('./utils/pkce.utils');

const app = express();

// Security hardening middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OAuth Authorization endpoint
app.get('/oauth/authorize', validateRedirectUri, (req, res) => {
  const { client_id, response_type, scope, state, code_challenge, code_challenge_method } = req.query;
  
  // Validate required parameters
  if (!client_id || !response_type || !code_challenge) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'Missing required parameters'
    });
  }
  
  // Only support 'S256' challenge method
  if (code_challenge_method !== 'S256') {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'Only S256 code_challenge_method is supported'
    });
  }
  
  // In a real implementation, show login/consent page
  // For this example, we'll simulate authorization
  const authorizationCode = require('crypto').randomBytes(32).toString('hex');
  
  // Store code_challenge with authorization code (in production, use database)
  // This is simplified for demonstration
  global.authCodes = global.authCodes || new Map();
  global.authCodes.set(authorizationCode, {
    client_id,
    code_challenge,
    redirect_uri: req.validatedRedirectUri,
    createdAt: Date.now()
  });
  
  // Redirect back to client with authorization code
  const redirectUrl = new URL(req.validatedRedirectUri);
  redirectUrl.searchParams.set('code', authorizationCode);
  if (state) {
    redirectUrl.searchParams.set('state', state);
  }
  
  res.redirect(redirectUrl.toString());
});

// OAuth Token endpoint
app.post('/oauth/token', (req, res) => {
  const { grant_type, code, code_verifier, refresh_token, client_id } = req.body;
  
  if (!grant_type) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'grant_type is required'
    });
  }
  
  try {
    if (grant_type === 'authorization_code') {
      // Exchange authorization code for tokens
      if (!code || !code_verifier || !client_id) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'code, code_verifier, and client_id are required'
        });
      }
      
      // Retrieve stored authorization code data
      global.authCodes = global.authCodes || new Map();
      const authData = global.authCodes.get(code);
      
      if (!authData) {
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Invalid or expired authorization code'
        });
      }
      
      // Verify PKCE challenge
      if (!verifyCodeChallenge(code_verifier, authData.code_challenge)) {
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Invalid code_verifier'
        });
      }
      
      // Delete used authorization code
      global.authCodes.delete(code);
      
      // Generate tokens
      const userId = 'user123'; // In production, get from session/auth
      const accessToken = generateAccessToken(
        { sub: userId, client_id },
        process.env.JWT_SECRET || 'your-secret-key',
        '15m'
      );
      
      const refreshTokenData = generateRefreshToken(userId);
      
      return res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 900, // 15 minutes
        refresh_token: refreshTokenData.token,
        scope: 'read write'
      });
      
    } else if (grant_type === 'refresh_token') {
      // Refresh token rotation
      if (!refresh_token || !client_id) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'refresh_token and client_id are required'
        });
      }
      
      const userId = 'user123'; // In production, extract from token or session
      
      // Rotate refresh token
      const newRefreshTokenData = rotateRefreshToken(refresh_token, userId);
      
      if (!newRefreshTokenData) {
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Invalid or expired refresh_token'
        });
      }
      
      // Generate new access token
      const accessToken = generateAccessToken(
        { sub: userId, client_id },
        process.env.JWT_SECRET || 'your-secret-key',
        '15m'
      );
      
      return res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 900,
        refresh_token: newRefreshTokenData.token
      });
      
    } else {
      return res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code and refresh_token grant types are supported'
      });
    }
  } catch (error) {
    console.error('Token endpoint error:', error);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'An error occurred while processing the request'
    });
  }
});

// Token revocation endpoint
app.post('/oauth/revoke', (req, res) => {
  const { token, token_type_hint } = req.body;
  
  if (!token) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'token is required'
    });
  }
  
  try {
    revokeToken(token);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to revoke token'
    });
  }
});

// Protected resource endpoint (example)
app.get('/api/protected', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'unauthorized',
      error_description: 'Missing or invalid authorization header'
    });
  }
  
  const token = authHeader.substring(7);
  const decoded = verifyAccessToken(token, process.env.JWT_SECRET || 'your-secret-key');
  
  if (!decoded) {
    return res.status(401).json({
      error: 'unauthorized',
      error_description: 'Invalid or expired token'
    });
  }
  
  res.json({
    message: 'Access granted to protected resource',
    user: decoded.sub
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'server_error',
    error_description: 'An unexpected error occurred'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'not_found',
    error_description: 'The requested resource was not found'
  });
});

module.exports = app;
