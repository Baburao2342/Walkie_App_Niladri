# Walkie - Real-Time Messaging Platform

A modern, secure real-time messaging platform with pods (communities), channels, and WebSocket-based communication.

>[!NOTE]
>URL: https://niladri21.github.io/Walkie_App/

## 🚀 Features

### Security
- ✅ JWT-based authentication
- ✅ Bcrypt password hashing
- ✅ Rate limiting on API endpoints
- ✅ Input sanitization and validation
- ✅ MongoDB injection protection
- ✅ Helmet.js security headers
- ✅ CORS configuration

### Functionality
- ✅ User registration and login
- ✅ Create and join pods with unique 8-digit codes
- ✅ Multiple channels per pod
- ✅ Real-time messaging with Socket.io
- ✅ Online/offline status tracking
- ✅ Typing indicators
- ✅ Message history
- ✅ User profile management
- ✅ Password change
- ✅ Avatar customization

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## 🛠️ Installation

### 1. Clone or Download the Project

```bash
# If you have the files, navigate to the project directory
cd walkie
```

### 2. Install Backend Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**Important:** Change the JWT_SECRET to a strong random string in production!

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/walkie
JWT_SECRET=change-this-to-a-very-long-random-string-min-32-chars
CLIENT_URL=http://localhost:3000
```

### 4. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# On Ubuntu/Debian
sudo systemctl start mongod

# On macOS with Homebrew
brew services start mongodb-community

# Or run MongoDB directly
mongod --dbpath /path/to/your/data/directory
```

### 5. Start the Backend Server

```bash
# Development mode with auto-restart
npm run dev

# Or production mode
npm start
```

The server will start on http://localhost:5000

### 6. Serve the Frontend

You have several options:

#### Option A: Simple HTTP Server (Development)
```bash
# Using Python 3
cd frontend
python3 -m http.server 3000

# Using Node.js http-server
npx http-server -p 3000
```

#### Option B: Using a Web Server (Production)

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /path/to/walkie/frontend;
    index walkie.html;
    
    location / {
        try_files $uri $uri/ /walkie.html;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

## 🔧 Configuration

### Frontend Configuration

Update the API URL in `walkie.html`:

```javascript
// At the top of the script section
const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';
```

For production, change these to your actual domain.

## 📝 API Documentation

### Authentication Endpoints

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "password123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Pod Endpoints

#### Create Pod
```http
POST /api/pods
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Awesome Pod"
}
```

#### Join Pod
```http
POST /api/pods/join
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "A7X9K2M4"
}
```

#### Get User's Pods
```http
GET /api/pods
Authorization: Bearer <token>
```

#### Get Pod Details
```http
GET /api/pods/:podId
Authorization: Bearer <token>
```

### Message Endpoints

#### Get Messages
```http
GET /api/pods/:podId/channels/:channelId/messages?limit=50
Authorization: Bearer <token>
```

### WebSocket Events

#### Client → Server

**Send Message:**
```javascript
socket.emit('message:send', {
  podId: 'pod_id',
  channelId: 'channel_id',
  content: 'Hello, world!'
});
```

**Typing Indicators:**
```javascript
socket.emit('typing:start', {
  podId: 'pod_id',
  channelId: 'channel_id'
});

socket.emit('typing:stop', {
  podId: 'pod_id',
  channelId: 'channel_id'
});
```

#### Server → Client

**New Message:**
```javascript
socket.on('message:new', (data) => {
  // data contains: id, content, author, createdAt, channelId
});
```

**User Online/Offline:**
```javascript
socket.on('user:online', (data) => {
  // data contains: userId, username
});

socket.on('user:offline', (data) => {
  // data contains: userId, username
});
```

## 🔒 Security Best Practices

### For Production Deployment:

1. **Change All Secrets:**
   - Generate a strong JWT_SECRET (minimum 32 characters)
   - Use environment-specific secrets

2. **Use HTTPS:**
   - Always use HTTPS in production
   - Update CORS settings accordingly

3. **Environment Variables:**
   - Never commit .env files
   - Use proper secret management (AWS Secrets Manager, HashiCorp Vault, etc.)

4. **Database Security:**
   - Use MongoDB authentication
   - Enable access control
   - Use connection string with credentials

5. **Rate Limiting:**
   - Adjust rate limits based on your needs
   - Consider using Redis for distributed rate limiting

6. **Monitoring:**
   - Set up logging (Winston, Morgan)
   - Monitor for suspicious activity
   - Set up error tracking (Sentry)

## 🚀 Deployment

### Deploying to a VPS (DigitalOcean, AWS EC2, etc.)

1. **Set up the server:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
# Follow: https://www.mongodb.com/docs/manual/installation/

# Install PM2 for process management
sudo npm install -g pm2
```

2. **Deploy the application:**
```bash
# Clone your repository or upload files
git clone your-repo.git
cd walkie

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
nano .env  # Edit with production values

# Start with PM2
pm2 start server.js --name walkie-backend
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

3. **Set up Nginx:**
```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/walkie
# Add the nginx configuration from above
sudo ln -s /etc/nginx/sites-available/walkie /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

4. **Set up SSL with Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Deploying to Heroku

1. **Create Heroku app:**
```bash
heroku create walkie-app
```

2. **Add MongoDB:**
```bash
heroku addons:create mongolab:sandbox
```

3. **Set environment variables:**
```bash
heroku config:set JWT_SECRET=your-secret-here
heroku config:set NODE_ENV=production
```

4. **Deploy:**
```bash
git push heroku main
```

### Deploying to Railway/Render

Both platforms auto-detect Node.js apps. Just:
1. Connect your Git repository
2. Set environment variables in their dashboard
3. Deploy!

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Test registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"password123"}'
```

## 📊 Database Schema

### User
```javascript
{
  email: String (unique, required),
  username: String (required),
  password: String (hashed, required),
  avatar: String,
  createdAt: Date,
  lastSeen: Date,
  isOnline: Boolean
}
```

### Pod
```javascript
{
  name: String (required),
  code: String (unique, 8 chars),
  createdBy: ObjectId (User),
  members: [{
    userId: ObjectId (User),
    joinedAt: Date,
    role: String (owner/admin/member)
  }],
  channels: [{
    name: String,
    icon: String,
    createdAt: Date
  }],
  createdAt: Date
}
```

### Message
```javascript
{
  podId: ObjectId (Pod),
  channelId: String,
  userId: ObjectId (User),
  content: String (max 2000 chars),
  createdAt: Date,
  edited: Boolean,
  editedAt: Date
}
```

## 🛡️ Rate Limits

- General API: 100 requests per 15 minutes per IP
- Auth endpoints: 5 requests per 15 minutes per IP

## 🐛 Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

### WebSocket Connection Failed
- Check CORS configuration
- Ensure Socket.io client version matches server
- Verify firewall settings allow WebSocket connections

## 📚 Tech Stack

**Backend:**
- Node.js + Express.js
- MongoDB with Mongoose
- Socket.io for WebSockets
- JWT for authentication
- Bcrypt for password hashing

**Frontend:**
- React (via Babel in-browser)
- Socket.io Client
- CSS3 with custom variables

**Security:**
- Helmet.js
- express-rate-limit
- express-mongo-sanitize
- validator.js

## 📄 License

MIT License - feel free to use this project for learning or production!

## 🤝 Contributing

This is a complete, production-ready messaging platform. Feel free to extend it with:
- File uploads
- Voice/video calls
- Message reactions
- Thread replies
- User mentions
- Search functionality
- Mobile apps (React Native)

## 💡 Support

For issues or questions, please check the documentation or create an issue in the repository.

---

Built with ❤️ using Node.js, MongoDB, and Socket.io
