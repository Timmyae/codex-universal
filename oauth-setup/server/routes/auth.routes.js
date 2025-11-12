/**
 * Authentication Routes / مسارات المصادقة
 * 
 * Defines all OAuth authentication endpoints
 * يحدد جميع نقاط نهاية مصادقة OAuth
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken, requireAuth } = require('../middleware/auth.middleware');
const { getEnabledProviders } = require('../config/oauth.config');

/**
 * GET /auth/providers
 * Get list of enabled OAuth providers
 * احصل على قائمة بمزودي OAuth المفعلين
 */
router.get('/providers', (req, res) => {
  const providers = getEnabledProviders();
  res.json({
    success: true,
    providers: providers,
    message: 'Available OAuth providers',
    message_ar: 'مزودو OAuth المتاحون'
  });
});

/**
 * POST /auth/logout
 * Logout endpoint
 * نقطة نهاية تسجيل الخروج
 * 
 * Clears user session and invalidates tokens
 * يمسح جلسة المستخدم ويبطل الرموز
 */
router.post('/logout', authController.logout);

/**
 * GET /auth/status
 * Check authentication status
 * تحقق من حالة المصادقة
 * 
 * Returns current user information if authenticated
 * يعيد معلومات المستخدم الحالية إذا كان مصادقًا عليه
 */
router.get('/status', authController.getAuthStatus);

/**
 * GET /auth/me
 * Get current user profile (protected route)
 * احصل على ملف تعريف المستخدم الحالي (مسار محمي)
 * 
 * Requires authentication token
 * يتطلب رمز المصادقة
 */
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    message: 'User profile retrieved successfully',
    message_ar: 'تم استرداد ملف تعريف المستخدم بنجاح'
  });
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 * تحديث رمز الوصول باستخدام رمز التحديث
 * 
 * Note: This is a placeholder for refresh token implementation
 * ملاحظة: هذا عنصر نائب لتنفيذ رمز التحديث
 */
router.post('/refresh', (req, res) => {
  // TODO: Implement refresh token logic
  // يجب القيام به: تنفيذ منطق رمز التحديث
  res.status(501).json({
    success: false,
    error: 'Not implemented',
    message: 'Token refresh is not yet implemented',
    message_ar: 'لم يتم تنفيذ تحديث الرمز بعد'
  });
});

/**
 * Example protected route
 * مثال على مسار محمي
 */
router.get('/protected', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'This is a protected route',
    message_ar: 'هذا مسار محمي',
    user: req.user
  });
});

/**
 * GET /auth/github
 * Initiate GitHub OAuth flow
 * بدء تدفق GitHub OAuth
 * 
 * Redirects to GitHub authorization page
 * يعيد التوجيه إلى صفحة تفويض GitHub
 */
router.get('/github', authController.initiateGitHubAuth);

/**
 * GET /auth/github/callback
 * GitHub OAuth callback endpoint
 * نقطة نهاية رد اتصال GitHub OAuth
 * 
 * Handles the callback from GitHub after user authorization
 * يتعامل مع رد الاتصال من GitHub بعد تفويض المستخدم
 */
router.get('/github/callback', authController.handleGitHubCallback);

/**
 * GET /auth/:provider
 * Generic OAuth initiation (for future providers)
 * بدء OAuth العام (للمزودين المستقبليين)
 * 
 * Supports: google, facebook, twitter, etc.
 * يدعم: google، facebook، twitter، إلخ.
 */
router.get('/:provider', (req, res, next) => {
  const { provider } = req.params;
  
  // Skip if it's a reserved route / تخطي إذا كان مسارًا محجوزًا
  const reservedRoutes = ['github', 'logout', 'status', 'refresh', 'providers', 'me', 'protected'];
  if (reservedRoutes.includes(provider)) {
    return next();
  }
  
  authController.initiateOAuth(req, res);
});

/**
 * GET /auth/:provider/callback
 * Generic OAuth callback (for future providers)
 * رد اتصال OAuth العام (للمزودين المستقبليين)
 * 
 * Note: This is a placeholder. Each provider may need custom callback handling
 * ملاحظة: هذا عنصر نائب. قد يحتاج كل مزود إلى معالجة رد اتصال مخصصة
 */
router.get('/:provider/callback', (req, res) => {
  const { provider } = req.params;
  
  // For now, only GitHub is implemented / في الوقت الحالي، تم تنفيذ GitHub فقط
  res.status(501).json({
    success: false,
    error: 'Not implemented',
    message: `OAuth callback for ${provider} is not yet implemented`,
    message_ar: `لم يتم تنفيذ رد اتصال OAuth لـ ${provider} بعد`,
    hint: 'Currently only GitHub OAuth is fully implemented'
  });
});

module.exports = router;
