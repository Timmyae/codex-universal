/**
 * OAuth Authentication Server / خادم مصادقة OAuth
 * 
 * Express server for handling OAuth authentication flows
 * خادم Express للتعامل مع تدفقات مصادقة OAuth
 * 
 * @author Codex Universal Team
 * @version 1.0.0
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// Import routes and middleware / استيراد المسارات والوسيطة
const authRoutes = require('./routes/auth.routes');
const { requestLogger, errorHandler } = require('./middleware/auth.middleware');
const { validateOAuthConfig } = require('./config/oauth.config');

// Initialize Express app / تهيئة تطبيق Express
const app = express();
const PORT = process.env.PORT || 3000;

// Validate OAuth configuration / التحقق من صحة تكوين OAuth
console.log('🔧 Validating OAuth configuration...');
validateOAuthConfig();

/**
 * Middleware Configuration / تكوين الوسيطة
 */

// Body parsing middleware / وسيطة تحليل الجسم
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS configuration / تكوين CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:19006'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    // السماح بالطلبات بدون أصل (تطبيقات الجوال، Postman، إلخ.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Session configuration / تكوين الجلسة
app.use(session({
  secret: process.env.SESSION_SECRET || 'codex-universal-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Rate limiting / تحديد المعدل
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later',
    message_ar: 'عدد كبير جدًا من الطلبات من هذا IP، يرجى المحاولة مرة أخرى لاحقًا'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes / تطبيق تحديد المعدل على جميع المسارات
app.use(limiter);

// Request logging middleware / وسيطة تسجيل الطلبات
if (process.env.LOG_LEVEL === 'debug') {
  app.use(requestLogger);
}

/**
 * Routes / المسارات
 */

// Health check endpoint / نقطة نهاية فحص الصحة
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    message: 'OAuth server is running',
    message_ar: 'خادم OAuth يعمل',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint / نقطة النهاية الجذرية
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Codex Universal OAuth Authentication Server',
    message_ar: 'خادم مصادقة OAuth العالمي لـ Codex',
    version: '1.0.0',
    documentation: '/docs',
    endpoints: {
      health: '/health',
      providers: '/auth/providers',
      github: '/auth/github',
      status: '/auth/status',
      logout: '/auth/logout'
    }
  });
});

// API documentation endpoint / نقطة نهاية وثائق API
app.get('/docs', (req, res) => {
  res.json({
    success: true,
    title: 'OAuth API Documentation',
    version: '1.0.0',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    endpoints: [
      {
        method: 'GET',
        path: '/health',
        description: 'Health check endpoint',
        description_ar: 'نقطة نهاية فحص الصحة',
        authentication: false
      },
      {
        method: 'GET',
        path: '/auth/providers',
        description: 'Get list of enabled OAuth providers',
        description_ar: 'احصل على قائمة بمزودي OAuth المفعلين',
        authentication: false
      },
      {
        method: 'GET',
        path: '/auth/github',
        description: 'Initiate GitHub OAuth flow',
        description_ar: 'بدء تدفق GitHub OAuth',
        authentication: false
      },
      {
        method: 'GET',
        path: '/auth/github/callback',
        description: 'GitHub OAuth callback',
        description_ar: 'رد اتصال GitHub OAuth',
        authentication: false
      },
      {
        method: 'GET',
        path: '/auth/status',
        description: 'Check authentication status',
        description_ar: 'تحقق من حالة المصادقة',
        authentication: false
      },
      {
        method: 'POST',
        path: '/auth/logout',
        description: 'Logout user',
        description_ar: 'تسجيل خروج المستخدم',
        authentication: false
      },
      {
        method: 'GET',
        path: '/auth/me',
        description: 'Get current user profile',
        description_ar: 'احصل على ملف تعريف المستخدم الحالي',
        authentication: true
      },
      {
        method: 'GET',
        path: '/auth/protected',
        description: 'Example protected route',
        description_ar: 'مثال على مسار محمي',
        authentication: true
      }
    ]
  });
});

// Mount authentication routes / تركيب مسارات المصادقة
app.use('/auth', authRoutes);

// 404 handler / معالج 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    message_ar: 'المسار غير موجود'
  });
});

// Error handling middleware / وسيطة معالجة الأخطاء
app.use(errorHandler);

/**
 * Start Server / بدء الخادم
 */
const server = app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║     🚀 Codex Universal OAuth Server                       ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Server running on: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('📚 Endpoints:');
  console.log(`   • Health Check: ${process.env.BASE_URL || `http://localhost:${PORT}`}/health`);
  console.log(`   • Documentation: ${process.env.BASE_URL || `http://localhost:${PORT}`}/docs`);
  console.log(`   • OAuth Providers: ${process.env.BASE_URL || `http://localhost:${PORT}`}/auth/providers`);
  console.log('');
  console.log('Press Ctrl+C to stop the server');
  console.log('════════════════════════════════════════════════════════════');
});

// Graceful shutdown / إيقاف تشغيل رشيق
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
