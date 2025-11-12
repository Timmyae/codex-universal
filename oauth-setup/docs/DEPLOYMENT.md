# Deployment Guide

## Production Deployment

### Prerequisites

- Node.js 18 or higher
- Redis server (recommended for production)
- SSL certificate (HTTPS required)
- Domain name
- GitHub OAuth App configured

### Environment Configuration

#### 1. Generate Secure Secrets

```bash
# Generate JWT secret (256 bits minimum)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 2. Configure .env for Production

```env
NODE_ENV=production
PORT=3000

# GitHub OAuth
GITHUB_CLIENT_ID=your_production_client_id
GITHUB_CLIENT_SECRET=your_production_client_secret
GITHUB_CALLBACK_URL=https://yourdomain.com/auth/github/callback

# Security (USE GENERATED SECRETS)
JWT_SECRET=your_generated_256bit_secret
JWT_REFRESH_SECRET=your_generated_256bit_refresh_secret
SESSION_SECRET=your_generated_session_secret

# Redirect URIs (production domains only)
ALLOWED_REDIRECT_URIS=https://yourdomain.com/auth/callback,https://app.yourdomain.com/callback

# Security Settings
ENABLE_PKCE=true
ENFORCE_HTTPS=true

# CORS (production domains only)
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Redis (required for production)
REDIS_URL=redis://localhost:6379
# OR
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=20
```

### Deployment Options

#### Option 1: Docker Deployment

```bash
# Build image
docker build -t oauth-server .

# Run with docker-compose
docker-compose up -d

# Check logs
docker-compose logs -f oauth-server

# Stop
docker-compose down
```

#### Option 2: PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start server/server.js --name oauth-server

# View logs
pm2 logs oauth-server

# Restart
pm2 restart oauth-server

# Stop
pm2 stop oauth-server

# Startup script (run on boot)
pm2 startup
pm2 save
```

#### Option 3: Systemd Service

Create `/etc/systemd/system/oauth-server.service`:

```ini
[Unit]
Description=OAuth Server
After=network.target

[Service]
Type=simple
User=oauth
WorkingDirectory=/opt/oauth-server
ExecStart=/usr/bin/node server/server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# Start service
sudo systemctl start oauth-server

# Enable on boot
sudo systemctl enable oauth-server

# Check status
sudo systemctl status oauth-server
```

### Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### Redis Setup

#### Option 1: Docker
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

#### Option 2: Native Installation
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis
sudo systemctl enable redis
```

### Health Monitoring

```bash
# Check health endpoint
curl https://yourdomain.com/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2024-...",
#   "uptime": 1234.56
# }
```

### Security Checklist

Before deploying:
- [ ] All secrets are strong and unique
- [ ] `NODE_ENV=production`
- [ ] `ENFORCE_HTTPS=true`
- [ ] HTTPS/SSL configured
- [ ] Redis configured and secured
- [ ] Firewall configured (allow only 443, 80)
- [ ] Rate limiting configured
- [ ] CORS origins limited to production
- [ ] Redirect URIs limited to production
- [ ] Logging and monitoring enabled
- [ ] Backup and recovery plan in place

### Monitoring & Logging

#### Application Logs
```bash
# PM2
pm2 logs oauth-server

# Docker
docker-compose logs -f oauth-server

# Systemd
sudo journalctl -u oauth-server -f
```

#### Metrics to Monitor
- Request rate
- Error rate
- Token generation rate
- Token rotation rate
- Security violations
- CPU and memory usage
- Response times

#### Recommended Tools
- **Monitoring:** Prometheus, Grafana
- **Logging:** ELK Stack, Loki
- **Error Tracking:** Sentry
- **Uptime:** Uptime Robot, Pingdom

### Backup & Recovery

#### Redis Backup
```bash
# Backup Redis data
redis-cli SAVE
cp /var/lib/redis/dump.rdb /backup/redis-$(date +%Y%m%d).rdb

# Restore
cp /backup/redis-YYYYMMDD.rdb /var/lib/redis/dump.rdb
sudo systemctl restart redis
```

### Scaling

#### Horizontal Scaling
- Use Redis for shared token blacklist
- Load balancer (Nginx, HAProxy)
- Multiple server instances
- Session affinity or shared sessions

#### Vertical Scaling
- Increase server resources
- Optimize Redis configuration
- Enable Redis clustering

### Troubleshooting

#### Common Issues

**Issue:** Tokens not being revoked
**Solution:** Ensure Redis is properly configured

**Issue:** CORS errors
**Solution:** Check CORS_ORIGINS configuration

**Issue:** Rate limiting too strict
**Solution:** Adjust RATE_LIMIT_MAX_REQUESTS

**Issue:** Memory leaks
**Solution:** Monitor with `pm2 monit`, increase heap size if needed

### Updates & Maintenance

```bash
# Update dependencies
npm audit
npm update

# Backup before update
pm2 save

# Update application
git pull
npm install
pm2 restart oauth-server

# Verify
pm2 logs oauth-server
```

### SSL Certificate Management

#### Let's Encrypt (Certbot)
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Performance Tuning

#### Node.js
```bash
# Increase heap size
export NODE_OPTIONS="--max-old-space-size=4096"
```

#### Redis
```ini
# /etc/redis/redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### Security Updates

- Subscribe to Node.js security mailing list
- Monitor npm audit regularly
- Update dependencies monthly
- Review security logs weekly
- Penetration testing quarterly
