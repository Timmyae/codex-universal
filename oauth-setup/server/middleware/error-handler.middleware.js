/**
 * Error Handler Middleware
 * 
 * البرمجية الوسيطة لمعالجة الأخطاء
 * Centralized error handling
 */

const { logError } = require('../utils/logger.utils');

/**
 * Error handler middleware
 * معالج الأخطاء المركزي
 * 
 * Must be registered last in middleware chain
 */
function errorHandler(err, req, res, next) {
  // Log error
  logError('Unhandled error', err, {
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Default error response
  const errorResponse = {
    error: 'server_error',
    error_description: 'An internal server error occurred'
  };

  // Add error details in development
  if (isDevelopment) {
    errorResponse.details = {
      message: err.message,
      stack: err.stack
    };
  }

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Not Found handler
 * معالج الخطأ 404
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'not_found',
    error_description: 'The requested resource was not found'
  });
}

/**
 * Async error wrapper
 * غلاف الأخطاء غير المتزامنة
 * 
 * Wraps async route handlers to catch errors
 * 
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
