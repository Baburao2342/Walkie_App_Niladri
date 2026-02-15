# Walkie - Quick Start Guide

## 🚀 Get Started in 5 Minutes!

### Prerequisites
- Node.js 16+ installed
- MongoDB installed and running

### Installation

**1. Start MongoDB:**
```bash
# Ubuntu/Debian
sudo systemctl start mongod

# macOS
brew services start mongodb-community

# Windows
net start MongoDB
```

**2. Install Backend Dependencies:**
```bash
cd backend
npm install
```

**3. Configure Environment:**
```bash
# Copy example env
cp .env.example .env

# Edit if needed (defaults work for local development)
nano .env
```

**4. Start the Backend Server:**
```bash
npm start
```

You should see:
```
✅ Connected to MongoDB
🚀 Server running on port 5000
📡 WebSocket server ready
```

**5. Open the Frontend:**

Open `walkie.html` in your browser, OR serve it:

```bash
# Option 1: Python
python3 -m http.server 3000

# Option 2: Node.js
npx http-server -p 3000
```

**6. Create Your First Account:**

1. Go to http://localhost:3000 (or just open walkie.html)
2. Click "Sign Up"
3. Enter email, password, and username
4. Create or join a pod!

## 🎯 Testing the API

```bash
# Health check
curl http://localhost:5000/api/health

# Register a user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'
```

## 🐳 Using Docker (Even Easier!)

```bash
# Start everything with one command
docker-compose up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose down
```

## 📁 Project Structure

```
walkie/
├── backend/
│   ├── server.js              # Main server file
│   ├── package.json           # Dependencies
│   ├── .env.example           # Environment template
│   ├── Dockerfile             # Docker configuration
│   ├── docker-compose.yml     # Multi-container setup
│   ├── nginx.conf             # Nginx reverse proxy config
│   ├── README.md              # Full documentation
│   └── SECURITY.md            # Security guide
├── frontend/
│   ├── walkie.html            # Main application
│   └── api-client.js          # API communication layer
└── docs/
    └── API.md                 # API documentation
```

## ✨ Features Available

### Authentication
- ✅ User registration
- ✅ Login/logout
- ✅ JWT token authentication
- ✅ Password hashing with bcrypt

### Messaging
- ✅ Real-time messaging
- ✅ Create pods (communities)
- ✅ Join pods with invite codes
- ✅ Multiple channels per pod
- ✅ Message history
- ✅ Online/offline status
- ✅ Typing indicators

### Security
- ✅ Rate limiting
- ✅ Input sanitization
- ✅ XSS protection
- ✅ NoSQL injection prevention
- ✅ Security headers (Helmet.js)

## 🔧 Common Commands

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Check MongoDB status
mongosh --eval "db.version()"

# View application logs (with PM2)
pm2 logs walkie-backend

# Restart server
pm2 restart walkie-backend
```

## 🌐 Default URLs

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **Health Check:** http://localhost:5000/api/health
- **WebSocket:** ws://localhost:5000

## 📚 Next Steps

1. **Read the full README.md** for detailed documentation
2. **Review SECURITY.md** before deploying to production
3. **Check the API documentation** for integration details
4. **Customize** the frontend to match your brand

## 🆘 Troubleshooting

### "Cannot connect to MongoDB"
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Or
mongosh
```

### "Port 5000 already in use"
```bash
# Find process using port
lsof -i :5000

# Kill it
kill -9 <PID>

# Or change PORT in .env file
```

### "CORS error in browser"
Make sure CLIENT_URL in .env matches your frontend URL:
```
CLIENT_URL=http://localhost:3000
```

## 🎉 You're Ready!

Your Walkie messaging platform is now running with:
- ✅ Secure authentication
- ✅ Real-time messaging
- ✅ Database persistence
- ✅ Production-ready backend

**Have fun building your community! 🚀**

---

For deployment to production, see README.md and SECURITY.md
