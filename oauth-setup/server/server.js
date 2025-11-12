/**
 * Server Entry Point
 * 
 * نقطة دخول الخادم
 * Start the OAuth server
 */

const app = require('./app');
const { initRedis } = require('./config/database.config');

const PORT = process.env.PORT || 3000;

/**
 * Start server
 * بدء الخادم
 */
async function startServer() {
  try {
    // Initialize Redis (optional)
    await initRedis();

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log('='.repeat(50));
      console.log('🚀 Codex Universal OAuth Server');
      console.log('='.repeat(50));
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Port: ${PORT}`);
      console.log(`URL: http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/health`);
      console.log('='.repeat(50));
      console.log('Security Features:');
      console.log(`  ✓ PKCE: ${process.env.ENABLE_PKCE === 'true' ? 'Enabled' : 'Disabled'}`);
      console.log(`  ✓ HTTPS: ${process.env.ENFORCE_HTTPS === 'true' ? 'Enforced' : 'Optional'}`);
      console.log(`  ✓ Rate Limiting: Enabled`);
      console.log(`  ✓ Token Rotation: Enabled`);
      console.log(`  ✓ Security Headers: Enabled`);
      console.log('='.repeat(50));
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('HTTP server closed');
        
        // Close database connections
        const { closeRedis } = require('./config/database.config');
        await closeRedis();
        
        console.log('Shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('[Uncaught Exception]', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('[Unhandled Rejection]', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    console.error('[Server] Startup error:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { startServer };
