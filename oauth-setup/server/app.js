/**
 * Express Application Setup
 * 
 * إعداد تطبيق Express
 * Main Express application with security middleware
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
require('dotenv').config();

const { securityConfig } = require('./config/security.config');
const { oauthConfig } = require('./config/oauth.config');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler.middleware');
const { generalLimiter } = require('./middleware/rate-limiter.middleware');
const authRoutes = require('./routes/auth.routes');

// Create Express app
const app = express();

// Trust proxy (for rate limiting by IP when behind proxy)
app.set('trust proxy', 1);

// Security headers (Helmet)
app.use(helmet(securityConfig.helmet));

// CORS
app.use(cors(securityConfig.cors));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(securityConfig.logging.format));
}

// Session middleware (for storing code_verifier and state)
app.use(session(oauthConfig.session));

// General rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API info endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Codex Universal OAuth Service',
    version: '1.0.0',
    description: 'Secure OAuth 2.0 implementation with PKCE and token rotation',
    endpoints: {
      health: 'GET /health',
      auth: {
        initiate: 'GET /auth/github',
        callback: 'GET /auth/github/callback',
        refresh: 'POST /auth/refresh',
        revoke: 'POST /auth/revoke',
        me: 'GET /auth/me'
      }
    },
    security: {
      pkce: oauthConfig.enablePKCE ? 'enabled' : 'disabled',
      https: securityConfig.enforceHttps ? 'enforced' : 'optional',
      rateLimiting: 'enabled'
    }
  });
});

// Authentication routes
app.use('/auth', authRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Validate configurations on startup
try {
  securityConfig.validate();
  oauthConfig.validateAll();
  console.log('[App] Configuration validation successful');
} catch (error) {
  console.error('[App] Configuration validation failed:', error.message);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

module.exports = app;
