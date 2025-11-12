/**
 * Jest Configuration / تكوين Jest
 * 
 * Test configuration with coverage thresholds
 * تكوين الاختبار مع حدود التغطية
 */

module.exports = {
  // Test environment / بيئة الاختبار
  testEnvironment: 'node',
  
  // Coverage output directory / دليل إخراج التغطية
  coverageDirectory: 'coverage',
  
  // Collect coverage from these files / جمع التغطية من هذه الملفات
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/**/*.test.js',
    '!server/app.js', // Exclude main app file from coverage
    '!node_modules/**'
  ],
  
  // Test file patterns / أنماط ملفات الاختبار
  testMatch: [
    '**/tests/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Coverage thresholds / حدود التغطية
  // Tests will fail if coverage is below these thresholds
  // ستفشل الاختبارات إذا كانت التغطية أقل من هذه الحدود
  coverageThreshold: {
    // Global thresholds / الحدود العالمية
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    },
    // Critical files require 100% coverage / الملفات الحرجة تتطلب تغطية 100%
    './server/utils/pkce.utils.js': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100
    },
    // Token utils: High coverage required but some defensive code paths may be unreachable
    './server/utils/token.utils.js': {
      statements: 88,
      branches: 88,
      functions: 100,
      lines: 88
    }
  },
  
  // Test timeout / مهلة الاختبار
  testTimeout: 10000,
  
  // Verbose output / مخرجات مفصلة
  verbose: true,
  
  // Clear mocks between tests / مسح النماذج الوهمية بين الاختبارات
  clearMocks: true,
  
  // Force exit after tests complete / فرض الخروج بعد اكتمال الاختبارات
  forceExit: true,
  
  // Coverage reporters / مراسلو التغطية
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  
  // Setup files / ملفات الإعداد
  // setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Module paths / مسارات الوحدات
  modulePaths: ['<rootDir>'],
  
  // Transform files / تحويل الملفات
  // transform: {},
  
  // Ignore patterns / أنماط التجاهل
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/'
  ],
  
  // Coverage ignore patterns / أنماط تجاهل التغطية
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/coverage/'
  ]
};
