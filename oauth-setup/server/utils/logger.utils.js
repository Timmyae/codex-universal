/**
 * Security Logger Utilities
 * 
 * أدوات تسجيل الأمان
 * Security-focused logging for audit trails
 * 
 * Logs security events for:
 * - Authentication attempts
 * - Token operations
 * - Authorization failures
 * - Security violations
 */

const fs = require('fs');
const path = require('path');

// Log levels
const LogLevel = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  SECURITY: 'SECURITY'
};

// Log directory
const LOG_DIR = path.join(__dirname, '../../logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Format log entry
 * تنسيق إدخال السجل
 * 
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 * @returns {string} Formatted log entry
 */
function formatLogEntry(level, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level,
    message,
    ...metadata
  };
  
  return JSON.stringify(entry);
}

/**
 * Write log to file
 * كتابة السجل إلى ملف
 * 
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 */
function writeLog(level, message, metadata = {}) {
  const logEntry = formatLogEntry(level, message, metadata);
  
  // Console output (development)
  if (process.env.NODE_ENV !== 'production') {
    const color = getColorForLevel(level);
    console.log(`${color}[${level}]${'\x1b[0m'} ${message}`, metadata);
  }

  // File output
  const logFile = path.join(LOG_DIR, `${getCurrentDate()}.log`);
  fs.appendFileSync(logFile, logEntry + '\n', 'utf8');
}

/**
 * Get color code for log level
 * الحصول على رمز اللون لمستوى السجل
 * 
 * @param {string} level - Log level
 * @returns {string} ANSI color code
 */
function getColorForLevel(level) {
  const colors = {
    ERROR: '\x1b[31m',      // Red
    WARN: '\x1b[33m',       // Yellow
    INFO: '\x1b[36m',       // Cyan
    DEBUG: '\x1b[37m',      // White
    SECURITY: '\x1b[35m'    // Magenta
  };
  
  return colors[level] || '\x1b[37m';
}

/**
 * Get current date for log file naming
 * الحصول على التاريخ الحالي لتسمية ملف السجل
 * 
 * @returns {string} Date in YYYY-MM-DD format
 */
function getCurrentDate() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Sanitize sensitive data from logs
 * تنقية البيانات الحساسة من السجلات
 * 
 * Never log:
 * - Passwords
 * - Tokens (full)
 * - API keys
 * - Secrets
 * 
 * @param {Object} data - Data to sanitize
 * @returns {Object} Sanitized data
 */
function sanitizeLogData(data) {
  const sensitive = ['password', 'token', 'secret', 'key', 'authorization'];
  const sanitized = { ...data };

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();
    
    if (sensitive.some(s => lowerKey.includes(s))) {
      // Show only first/last 4 chars for tokens
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 8) {
        sanitized[key] = `${sanitized[key].substring(0, 4)}...${sanitized[key].substring(sanitized[key].length - 4)}`;
      } else {
        sanitized[key] = '***REDACTED***';
      }
    }
  }

  return sanitized;
}

/**
 * Log security event
 * تسجيل حدث أمني
 * 
 * @param {string} event - Event name
 * @param {Object} details - Event details
 */
function logSecurity(event, details = {}) {
  const sanitized = sanitizeLogData(details);
  writeLog(LogLevel.SECURITY, event, sanitized);
}

/**
 * Log authentication attempt
 * تسجيل محاولة المصادقة
 * 
 * @param {boolean} success - Whether authentication succeeded
 * @param {string} userId - User identifier
 * @param {string} method - Authentication method
 * @param {Object} metadata - Additional metadata
 */
function logAuthAttempt(success, userId, method, metadata = {}) {
  const event = success ? 'AUTH_SUCCESS' : 'AUTH_FAILURE';
  logSecurity(event, {
    userId,
    method,
    success,
    ...metadata
  });
}

/**
 * Log token operation
 * تسجيل عملية الرمز
 * 
 * @param {string} operation - Operation type (generate, verify, revoke)
 * @param {string} tokenType - Token type (access, refresh)
 * @param {Object} details - Operation details
 */
function logTokenOperation(operation, tokenType, details = {}) {
  logSecurity(`TOKEN_${operation.toUpperCase()}`, {
    tokenType,
    ...sanitizeLogData(details)
  });
}

/**
 * Log authorization failure
 * تسجيل فشل التفويض
 * 
 * @param {string} userId - User identifier
 * @param {string} resource - Attempted resource
 * @param {string} reason - Failure reason
 */
function logAuthzFailure(userId, resource, reason) {
  logSecurity('AUTHZ_FAILURE', {
    userId,
    resource,
    reason
  });
}

/**
 * Log security violation
 * تسجيل انتهاك أمني
 * 
 * @param {string} violation - Violation type
 * @param {Object} details - Violation details
 */
function logSecurityViolation(violation, details = {}) {
  writeLog(LogLevel.SECURITY, `SECURITY_VIOLATION: ${violation}`, sanitizeLogData(details));
  
  // In production, trigger alert/notification
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate with alerting system (email, Slack, PagerDuty, etc.)
    console.error('SECURITY VIOLATION DETECTED:', violation);
  }
}

/**
 * Log error
 * تسجيل خطأ
 * 
 * @param {string} message - Error message
 * @param {Error} error - Error object
 * @param {Object} metadata - Additional metadata
 */
function logError(message, error, metadata = {}) {
  writeLog(LogLevel.ERROR, message, {
    error: error.message,
    stack: error.stack,
    ...sanitizeLogData(metadata)
  });
}

/**
 * Log warning
 * تسجيل تحذير
 * 
 * @param {string} message - Warning message
 * @param {Object} metadata - Additional metadata
 */
function logWarning(message, metadata = {}) {
  writeLog(LogLevel.WARN, message, sanitizeLogData(metadata));
}

/**
 * Log info
 * تسجيل معلومات
 * 
 * @param {string} message - Info message
 * @param {Object} metadata - Additional metadata
 */
function logInfo(message, metadata = {}) {
  writeLog(LogLevel.INFO, message, sanitizeLogData(metadata));
}

/**
 * Log debug
 * تسجيل تصحيح الأخطاء
 * 
 * @param {string} message - Debug message
 * @param {Object} metadata - Additional metadata
 */
function logDebug(message, metadata = {}) {
  if (process.env.NODE_ENV !== 'production') {
    writeLog(LogLevel.DEBUG, message, metadata);
  }
}

module.exports = {
  LogLevel,
  logSecurity,
  logAuthAttempt,
  logTokenOperation,
  logAuthzFailure,
  logSecurityViolation,
  logError,
  logWarning,
  logInfo,
  logDebug,
  sanitizeLogData
};
