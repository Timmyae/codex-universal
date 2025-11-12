/**
 * Rate Limiting Middleware
 * 
 * البرمجية الوسيطة لتحديد معدل الطلبات
 * DDoS protection and abuse prevention
 */

const rateLimit = require('express-rate-limit');

/**
 * General rate limiter for all endpoints
 * محدد المعدل العام لجميع نقاط النهاية
 * 
 * Default: 100 requests per 15 minutes
 */
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'too_many_requests',
    error_description: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  // Key generator: by IP address
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  // Skip successful requests in some cases (optional)
  skipSuccessfulRequests: false,
  // Skip failed requests (optional)
  skipFailedRequests: false
});

/**
 * Strict rate limiter for authentication endpoints
 * محدد المعدل الصارم لنقاط المصادقة
 * 
 * More restrictive: 20 requests per 15 minutes
 */
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 20,
  message: {
    error: 'too_many_requests',
    error_description: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  // Skip successful authentications (optional)
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    console.warn(`[Rate Limit] Too many auth attempts from ${req.ip}`);
    res.status(429).json({
      error: 'too_many_requests',
      error_description: 'Too many authentication attempts, please try again later'
    });
  }
});

/**
 * Token refresh rate limiter
 * محدد المعدل لتجديد الرموز
 * 
 * Very strict: 10 requests per 15 minutes
 */
const tokenRefreshLimiter = rateLimit({
  windowMs: 900000, // 15 minutes
  max: 10,
  message: {
    error: 'too_many_requests',
    error_description: 'Too many token refresh attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Callback endpoint rate limiter
 * محدد المعدل لنقطة الاستدعاء
 * 
 * Moderate: 50 requests per 15 minutes
 */
const callbackLimiter = rateLimit({
  windowMs: 900000, // 15 minutes
  max: 50,
  message: {
    error: 'too_many_requests',
    error_description: 'Too many callback requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Create custom rate limiter
 * إنشاء محدد معدل مخصص
 * 
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} max - Maximum requests per window
 * @param {string} message - Error message
 * @returns {Function} Rate limiter middleware
 */
function createRateLimiter(windowMs, max, message) {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'too_many_requests',
      error_description: message || 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
  });
}

module.exports = {
  generalLimiter,
  authLimiter,
  tokenRefreshLimiter,
  callbackLimiter,
  createRateLimiter
};
