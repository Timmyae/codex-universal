/**
 * Authentication Middleware / وسيطة المصادقة
 * 
 * Middleware for protecting routes and verifying JWT tokens
 * الوسيطة لحماية المسارات والتحقق من رموز JWT
 */

const { verifyToken, extractTokenFromHeader } = require('../utils/token.utils');

/**
 * Middleware to verify JWT token and authenticate user
 * وسيطة للتحقق من رمز JWT ومصادقة المستخدم
 * 
 * Usage: app.get('/protected', authenticateToken, (req, res) => {...})
 * الاستخدام: app.get('/protected', authenticateToken, (req, res) => {...})
 */
function authenticateToken(req, res, next) {
  // Extract token from Authorization header / استخراج الرمز من رأس التفويض
  const authHeader = req.headers['authorization'];
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
      message: 'No authentication token provided',
      message_ar: 'لم يتم توفير رمز المصادقة'
    });
  }

  // Verify token / التحقق من الرمز
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token',
      message: 'Authentication token is invalid or expired',
      message_ar: 'رمز المصادقة غير صالح أو منتهي الصلاحية'
    });
  }

  // Attach user information to request object / إرفاق معلومات المستخدم بكائن الطلب
  req.user = {
    userId: decoded.userId,
    email: decoded.email,
    provider: decoded.provider,
    username: decoded.username
  };

  next();
}

/**
 * Optional authentication middleware
 * وسيطة المصادقة الاختيارية
 * 
 * Attempts to authenticate but allows request to proceed even if token is invalid
 * يحاول المصادقة ولكن يسمح بمتابعة الطلب حتى لو كان الرمز غير صالح
 */
function optionalAuthentication(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = extractTokenFromHeader(authHeader);

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        provider: decoded.provider,
        username: decoded.username
      };
    }
  }

  // Continue regardless of authentication status / استمر بغض النظر عن حالة المصادقة
  next();
}

/**
 * Middleware to check if user is authenticated via session
 * وسيطة للتحقق مما إذا كان المستخدم مصادقًا عليه عبر الجلسة
 */
function requireAuth(req, res, next) {
  // Check session authentication / تحقق من مصادقة الجلسة
  if (req.session && req.session.user) {
    req.user = req.session.user;
    return next();
  }

  // Check token authentication / تحقق من مصادقة الرمز
  const authHeader = req.headers['authorization'];
  const token = extractTokenFromHeader(authHeader);

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        provider: decoded.provider,
        username: decoded.username
      };
      return next();
    }
  }

  // Not authenticated / غير مصادق عليه
  return res.status(401).json({
    success: false,
    error: 'Authentication required',
    message: 'You must be logged in to access this resource',
    message_ar: 'يجب عليك تسجيل الدخول للوصول إلى هذا المورد'
  });
}

/**
 * Middleware to log request details (for debugging)
 * وسيطة لتسجيل تفاصيل الطلب (للتصحيح)
 */
function requestLogger(req, res, next) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  
  // Log authentication status / سجل حالة المصادقة
  if (req.user) {
    console.log(`  Authenticated user: ${req.user.email || req.user.userId}`);
  }
  
  next();
}

/**
 * Error handling middleware
 * وسيطة معالجة الأخطاء
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Handle specific error types / معالجة أنواع أخطاء محددة
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: err.message,
      message_ar: 'غير مصرح'
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: err.message,
      message_ar: 'خطأ في التحقق'
    });
  }

  // Generic error response / استجابة خطأ عامة
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    message: 'An unexpected error occurred',
    message_ar: 'حدث خطأ غير متوقع'
  });
}

/**
 * CORS configuration middleware
 * وسيطة تكوين CORS
 */
function configureCORS() {
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:19006'];

  return (req, res, next) => {
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests / معالجة طلبات الاختبار المسبق
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    
    next();
  };
}

module.exports = {
  authenticateToken,
  optionalAuthentication,
  requireAuth,
  requestLogger,
  errorHandler,
  configureCORS
};
