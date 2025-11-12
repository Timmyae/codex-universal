/**
 * Database Configuration
 * 
 * إعدادات قاعدة البيانات
 * Database connection for token storage (Redis optional)
 */

const redis = require('redis');

let redisClient = null;

/**
 * Redis configuration
 * إعدادات Redis
 */
const redisConfig = {
  url: process.env.REDIS_URL,
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB) || 0
};

/**
 * Initialize Redis client
 * تهيئة عميل Redis
 * 
 * @returns {Promise<Object>} Redis client or null
 */
async function initRedis() {
  // Skip Redis if not configured
  if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
    console.log('[Database] Redis not configured - using in-memory storage');
    return null;
  }

  try {
    const client = redis.createClient(
      redisConfig.url || {
        socket: {
          host: redisConfig.host,
          port: redisConfig.port
        },
        password: redisConfig.password,
        database: redisConfig.db
      }
    );

    client.on('error', (err) => {
      console.error('[Redis] Connection error:', err);
    });

    client.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });

    client.on('ready', () => {
      console.log('[Redis] Client ready');
    });

    client.on('reconnecting', () => {
      console.log('[Redis] Reconnecting...');
    });

    await client.connect();
    redisClient = client;
    
    return client;

  } catch (error) {
    console.error('[Redis] Initialization error:', error.message);
    console.log('[Database] Falling back to in-memory storage');
    return null;
  }
}

/**
 * Get Redis client
 * الحصول على عميل Redis
 * 
 * @returns {Object|null} Redis client or null
 */
function getRedisClient() {
  return redisClient;
}

/**
 * Check if Redis is available
 * التحقق من توفر Redis
 * 
 * @returns {boolean} True if Redis is connected
 */
function isRedisAvailable() {
  return redisClient !== null && redisClient.isReady;
}

/**
 * Close Redis connection
 * إغلاق اتصال Redis
 */
async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('[Redis] Connection closed');
  }
}

/**
 * Redis token blacklist operations
 * عمليات القائمة السوداء للرموز في Redis
 */
const redisTokenOps = {
  /**
   * Add token to blacklist
   * إضافة رمز إلى القائمة السوداء
   */
  async addToBlacklist(tokenHash, expirySeconds = 86400) {
    if (!isRedisAvailable()) return false;

    try {
      await redisClient.setEx(
        `blacklist:${tokenHash}`,
        expirySeconds,
        JSON.stringify({
          revokedAt: Date.now()
        })
      );
      return true;
    } catch (error) {
      console.error('[Redis] Error adding to blacklist:', error);
      return false;
    }
  },

  /**
   * Check if token is blacklisted
   * التحقق من وجود الرمز في القائمة السوداء
   */
  async isBlacklisted(tokenHash) {
    if (!isRedisAvailable()) return false;

    try {
      const result = await redisClient.get(`blacklist:${tokenHash}`);
      return result !== null;
    } catch (error) {
      console.error('[Redis] Error checking blacklist:', error);
      return false;
    }
  },

  /**
   * Store refresh token metadata
   * تخزين بيانات رمز التحديث
   */
  async storeRefreshToken(tokenId, metadata, expirySeconds = 2592000) {
    if (!isRedisAvailable()) return false;

    try {
      await redisClient.setEx(
        `refresh:${tokenId}`,
        expirySeconds,
        JSON.stringify(metadata)
      );
      return true;
    } catch (error) {
      console.error('[Redis] Error storing refresh token:', error);
      return false;
    }
  },

  /**
   * Get refresh token metadata
   * الحصول على بيانات رمز التحديث
   */
  async getRefreshToken(tokenId) {
    if (!isRedisAvailable()) return null;

    try {
      const data = await redisClient.get(`refresh:${tokenId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[Redis] Error getting refresh token:', error);
      return null;
    }
  },

  /**
   * Delete refresh token
   * حذف رمز التحديث
   */
  async deleteRefreshToken(tokenId) {
    if (!isRedisAvailable()) return false;

    try {
      await redisClient.del(`refresh:${tokenId}`);
      return true;
    } catch (error) {
      console.error('[Redis] Error deleting refresh token:', error);
      return false;
    }
  }
};

module.exports = {
  initRedis,
  getRedisClient,
  isRedisAvailable,
  closeRedis,
  redisTokenOps
};
