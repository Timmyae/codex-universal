/**
 * Authentication Middleware
 * 
 * البرمجية الوسيطة للمصادقة
 * JWT token verification middleware
 */

const { verifyToken } = require('../utils/token.utils');
const { logAuthzFailure } = require('../utils/logger.utils');

/**
 * Middleware to verify JWT access token
 * البرمجية الوسيطة للتحقق من رمز الوصول
 * 
 * Expects token in Authorization header: Bearer <token>
 */
function authMiddleware(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'unauthorized',
        error_description: 'Missing or invalid Authorization header'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token, 'access');

    if (!decoded) {
      logAuthzFailure('unknown', req.path, 'Invalid or expired token');
      
      return res.status(401).json({
        error: 'unauthorized',
        error_description: 'Invalid or expired access token'
      });
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      tokenId: decoded.tokenId
    };

    next();

  } catch (error) {
    console.error('[Auth Middleware Error]', error);
    
    return res.status(500).json({
      error: 'server_error',
      error_description: 'Internal server error'
    });
  }
}

/**
 * Optional authentication middleware
 * البرمجية الوسيطة للمصادقة الاختيارية
 * 
 * Attempts to authenticate but doesn't fail if no token provided
 */
function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided - continue without authentication
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token, 'access');

    if (decoded) {
      req.user = {
        userId: decoded.userId,
        tokenId: decoded.tokenId
      };
    }

    next();

  } catch (error) {
    // Continue even if token verification fails
    next();
  }
}

/**
 * Middleware to check if user is authenticated
 * البرمجية الوسيطة للتحقق من المصادقة
 * 
 * Use after authMiddleware to ensure user is set
 */
function requireAuth(req, res, next) {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({
      error: 'unauthorized',
      error_description: 'Authentication required'
    });
  }

  next();
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  requireAuth
};
