# Walkie Security & Deployment Guide

## 🔒 Security Checklist

### Before Production Deployment

- [ ] Change all default secrets and passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up monitoring and logging
- [ ] Enable database authentication
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable security headers
- [ ] Implement backup strategy
- [ ] Set up error tracking

## 🚀 Deployment Options

### Option 1: Docker Compose (Recommended for Beginners)

**Advantages:**
- Easy to set up
- Includes MongoDB
- Isolated environment
- Easy to scale

**Steps:**

1. **Install Docker and Docker Compose:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
```

2. **Configure Environment:**
```bash
# Create .env file
cat > .env << EOF
JWT_SECRET=$(openssl rand -base64 32)
MONGODB_ROOT_PASSWORD=$(openssl rand -base64 24)
CLIENT_URL=https://your-domain.com
EOF
```

3. **Start Services:**
```bash
# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

4. **Update SSL Certificate:**
```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Update nginx.conf with certificate paths
```

### Option 2: Traditional VPS Deployment

**Steps:**

1. **Prepare Server:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

2. **Configure MongoDB Security:**
```bash
# Connect to MongoDB
mongosh

# Create admin user
use admin
db.createUser({
  user: "admin",
  pwd: "your-strong-password",
  roles: ["root"]
})

# Create app database and user
use walkie
db.createUser({
  user: "walkieapp",
  pwd: "another-strong-password",
  roles: ["readWrite"]
})

exit

# Enable authentication in MongoDB config
sudo nano /etc/mongod.conf
# Add:
# security:
#   authorization: enabled

# Restart MongoDB
sudo systemctl restart mongod
```

3. **Deploy Application:**
```bash
# Clone or upload your code
cd /var/www
sudo git clone your-repo.git walkie
cd walkie

# Install dependencies
npm install --production

# Create .env file
sudo nano .env
# Add your configuration

# Install PM2
sudo npm install -g pm2

# Start application
pm2 start server.js --name walkie-backend

# Save PM2 config
pm2 save
pm2 startup
```

4. **Configure Nginx:**
```bash
# Install Nginx
sudo apt install nginx

# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/walkie

# Enable site
sudo ln -s /etc/nginx/sites-available/walkie /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

5. **Setup SSL:**
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

### Option 3: Cloud Platform (Heroku, Railway, Render)

**Heroku:**

```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Create app
heroku create walkie-app

# Add MongoDB addon
heroku addons:create mongolab:sandbox

# Set environment variables
heroku config:set JWT_SECRET=$(openssl rand -base64 32)
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# Scale
heroku ps:scale web=1
```

**Railway:**

1. Connect GitHub repository
2. Add MongoDB service
3. Set environment variables in dashboard
4. Deploy automatically on push

## 🔐 Security Best Practices

### 1. Environment Variables

**Never commit sensitive data!**

```bash
# Generate strong secrets
openssl rand -base64 32

# Use different secrets for each environment
# Development, Staging, Production
```

### 2. Rate Limiting

Current settings:
- General API: 100 requests/15min
- Auth endpoints: 5 requests/15min

**Adjust based on your needs:**

```javascript
// In server.js
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Adjust this
  message: 'Too many requests'
});
```

### 3. CORS Configuration

```javascript
// For production, specify exact origins
const corsOptions = {
  origin: process.env.CLIENT_URL,
  credentials: true
};
app.use(cors(corsOptions));
```

### 4. Database Security

- ✅ Enable authentication
- ✅ Use strong passwords
- ✅ Limit network access
- ✅ Regular backups
- ✅ Monitor for suspicious activity

```bash
# Backup MongoDB
mongodump --uri="mongodb://username:password@localhost:27017/walkie" --out=/backup/$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb://username:password@localhost:27017/walkie" /backup/20240115
```

### 5. Input Validation

All inputs are validated using validator.js:
- Email format validation
- Password length (min 8 characters)
- Username length (2-30 characters)
- Message length (max 2000 characters)
- XSS prevention through sanitization

### 6. Password Security

- Bcrypt hashing (cost factor: 12)
- Passwords never sent in responses
- Secure password reset flow (implement if needed)

### 7. JWT Security

```javascript
// Token expiration
const JWT_EXPIRE = '7d';

// Refresh tokens (implement if needed)
// Store refresh tokens in database
// Short-lived access tokens
```

### 8. HTTPS Only

```nginx
# Force HTTPS redirect
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### 9. Security Headers

Helmet.js automatically adds:
- X-DNS-Prefetch-Control
- X-Frame-Options
- Strict-Transport-Security
- X-Download-Options
- X-Content-Type-Options
- X-XSS-Protection

### 10. Logging & Monitoring

**Add logging:**

```bash
npm install winston morgan
```

```javascript
// logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

module.exports = logger;
```

**Monitor metrics:**
- Failed login attempts
- API response times
- Database query performance
- WebSocket connections
- Error rates

## 🔥 Firewall Configuration

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# For MongoDB (if external access needed)
sudo ufw allow from trusted-ip to any port 27017
```

## 📊 Monitoring Setup

### Using PM2

```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs walkie-backend

# Metrics
pm2 install pm2-metrics
```

### Using External Services

**Recommended:**
- Sentry for error tracking
- Datadog for APM
- LogDNA for logging
- UptimeRobot for uptime monitoring

## 🔄 CI/CD Pipeline

**GitHub Actions Example:**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/walkie
            git pull
            npm install
            pm2 restart walkie-backend
```

## 🆘 Troubleshooting

### High CPU Usage
```bash
# Check processes
pm2 monit

# Restart if needed
pm2 restart walkie-backend
```

### Memory Leaks
```bash
# Monitor memory
pm2 monit

# Set memory limit
pm2 start server.js --name walkie-backend --max-memory-restart 500M
```

### Database Connection Issues
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check connections
mongosh --eval "db.serverStatus().connections"

# Check logs
sudo tail -f /var/log/mongodb/mongod.log
```

### WebSocket Issues
```bash
# Check if port is accessible
telnet your-domain.com 5000

# Check nginx config for WebSocket
sudo nginx -t
```

## 📈 Scaling

### Horizontal Scaling

1. **Load Balancer Setup:**
   - Use Nginx or HAProxy
   - Distribute traffic across multiple servers
   - Sticky sessions for WebSocket

2. **Database Replication:**
   - MongoDB replica sets
   - Read replicas for scaling reads

3. **Redis for Session Storage:**
   - Shared session store
   - Pub/Sub for real-time events

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize database queries
- Implement caching (Redis)

## 🎯 Performance Optimization

1. **Database Indexing:**
```javascript
// Add indexes in server.js
userSchema.index({ email: 1 });
messageSchema.index({ podId: 1, channelId: 1, createdAt: -1 });
```

2. **Caching:**
```bash
npm install redis
```

3. **CDN for Static Assets:**
- Use Cloudflare or AWS CloudFront
- Serve frontend from CDN

4. **Compression:**
```javascript
const compression = require('compression');
app.use(compression());
```

## 🔒 Compliance

### GDPR Considerations
- User data deletion
- Data export
- Privacy policy
- Cookie consent
- Data retention policies

### Implement:
```javascript
// Delete user account
app.delete('/api/users/me', authenticate, async (req, res) => {
  await User.findByIdAndDelete(req.user._id);
  await Message.deleteMany({ userId: req.user._id });
  res.json({ message: 'Account deleted' });
});

// Export user data
app.get('/api/users/data-export', authenticate, async (req, res) => {
  const userData = await User.findById(req.user._id);
  const messages = await Message.find({ userId: req.user._id });
  res.json({ user: userData, messages });
});
```

## 📞 Support

For issues or questions:
- Check the main README.md
- Review this security guide
- Check server logs
- Monitor error tracking service

---

**Remember:** Security is an ongoing process, not a one-time setup!
