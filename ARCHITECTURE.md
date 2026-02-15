# Walkie Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    walkie.html (Frontend)                  │ │
│  │  - React Components                                        │ │
│  │  - User Interface                                          │ │
│  │  - Neon Design Theme                                       │ │
│  └────────────┬──────────────────────────┬───────────────────┘ │
│               │                          │                      │
│               │ HTTP/REST API            │ WebSocket            │
│               │ (Authentication,         │ (Real-time           │
│               │  CRUD operations)        │  messaging)          │
└───────────────┼──────────────────────────┼──────────────────────┘
                │                          │
                ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVER (Node.js)                   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                Express.js (HTTP Server)                │    │
│  │  - RESTful API Endpoints                              │    │
│  │  - Authentication (JWT)                               │    │
│  │  - Rate Limiting                                      │    │
│  │  - Input Validation                                   │    │
│  │  - Security Middleware                                │    │
│  └────────────────────┬───────────────────────────────────┘    │
│                       │                                         │
│  ┌────────────────────┴───────────────────────────────────┐    │
│  │              Socket.io (WebSocket Server)              │    │
│  │  - Real-time message broadcasting                     │    │
│  │  - User presence tracking                             │    │
│  │  - Typing indicators                                  │    │
│  │  - Room management                                    │    │
│  └────────────────────┬───────────────────────────────────┘    │
│                       │                                         │
│                       │ Mongoose ODM                            │
│                       │                                         │
└───────────────────────┼─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MongoDB Database                              │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    Users     │  │     Pods     │  │   Messages   │         │
│  │              │  │              │  │              │         │
│  │ - email      │  │ - name       │  │ - content    │         │
│  │ - username   │  │ - code       │  │ - author     │         │
│  │ - password   │  │ - members    │  │ - timestamp  │         │
│  │ - avatar     │  │ - channels   │  │ - podId      │         │
│  │ - isOnline   │  │              │  │ - channelId  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. User Registration Flow

```
User Browser                Backend Server              Database
    │                            │                          │
    │  POST /api/auth/register  │                          │
    │ (email, password, user)   │                          │
    ├──────────────────────────>│                          │
    │                            │                          │
    │                            │  Validate Input          │
    │                            │  (email format, etc)     │
    │                            │                          │
    │                            │  Hash Password           │
    │                            │  (bcrypt, cost=12)       │
    │                            │                          │
    │                            │  CREATE User             │
    │                            ├─────────────────────────>│
    │                            │                          │
    │                            │  User Saved              │
    │                            │<─────────────────────────┤
    │                            │                          │
    │                            │  Generate JWT Token      │
    │                            │                          │
    │  Response: {token, user}   │                          │
    │<───────────────────────────┤                          │
    │                            │                          │
    │  Store token in           │                          │
    │  localStorage             │                          │
    │                            │                          │
```

### 2. Login Flow

```
User Browser                Backend Server              Database
    │                            │                          │
    │  POST /api/auth/login     │                          │
    │  (email, password)        │                          │
    ├──────────────────────────>│                          │
    │                            │                          │
    │                            │  FIND User by email      │
    │                            ├─────────────────────────>│
    │                            │                          │
    │                            │  User Found              │
    │                            │<─────────────────────────┤
    │                            │                          │
    │                            │  Compare Password        │
    │                            │  (bcrypt.compare)        │
    │                            │                          │
    │                            │  ✓ Password Match        │
    │                            │                          │
    │                            │  Generate JWT Token      │
    │                            │                          │
    │  Response: {token, user}   │                          │
    │<───────────────────────────┤                          │
    │                            │                          │
    │  Store token              │                          │
    │  Redirect to dashboard    │                          │
    │                            │                          │
```

### 3. Create Pod Flow

```
User Browser                Backend Server              Database
    │                            │                          │
    │  POST /api/pods           │                          │
    │  {name: "My Pod"}         │                          │
    │  + JWT Token              │                          │
    ├──────────────────────────>│                          │
    │                            │                          │
    │                            │  Verify JWT Token        │
    │                            │  (extract userId)        │
    │                            │                          │
    │                            │  Generate 8-digit code   │
    │                            │  (e.g., A7X9K2M4)        │
    │                            │                          │
    │                            │  Check code unique       │
    │                            ├─────────────────────────>│
    │                            │                          │
    │                            │  Code is unique ✓        │
    │                            │<─────────────────────────┤
    │                            │                          │
    │                            │  CREATE Pod with:        │
    │                            │  - name                  │
    │                            │  - code                  │
    │                            │  - creator (userId)      │
    │                            │  - default channels      │
    │                            ├─────────────────────────>│
    │                            │                          │
    │                            │  Pod Created             │
    │                            │<─────────────────────────┤
    │                            │                          │
    │  Response: {pod, code}     │                          │
    │<───────────────────────────┤                          │
    │                            │                          │
    │  Display code to user     │                          │
    │                            │                          │
```

### 4. Real-Time Messaging Flow

```
User A Browser         Backend Server (Socket.io)    User B Browser
    │                            │                          │
    │  WebSocket Connected       │  WebSocket Connected     │
    │  (with JWT token)          │  (with JWT token)        │
    ├───────────────────────────>│<─────────────────────────┤
    │                            │                          │
    │  Join room: pod_123        │  Join room: pod_123      │
    ├───────────────────────────>│<─────────────────────────┤
    │                            │                          │
    │  emit: message:send        │                          │
    │  {podId, channelId, text}  │                          │
    ├───────────────────────────>│                          │
    │                            │                          │
    │                            │  Save to MongoDB         │
    │                            │                          │
    │                            │  Broadcast to pod room   │
    │                            │  emit: message:new       │
    │<───────────────────────────┤─────────────────────────>│
    │                            │                          │
    │  Display message           │  Display message         │
    │  (instant update)          │  (instant update)        │
    │                            │                          │
```

### 5. Online Status Flow

```
User Browser              Backend Server              Database
    │                            │                          │
    │  WebSocket Connect        │                          │
    ├──────────────────────────>│                          │
    │                            │                          │
    │                            │  UPDATE User             │
    │                            │  SET isOnline = true     │
    │                            ├─────────────────────────>│
    │                            │                          │
    │                            │  Broadcast to pods       │
    │                            │  emit: user:online       │
    │                            │                          │
    │                  ┌─────────┴─────────┐               │
    │                  │  All members in   │               │
    │                  │  user's pods get  │               │
    │                  │  online event     │               │
    │                  └─────────┬─────────┘               │
    │                            │                          │
    │  WebSocket Disconnect     │                          │
    ├──────────────────────────>│                          │
    │                            │                          │
    │                            │  UPDATE User             │
    │                            │  SET isOnline = false    │
    │                            │  SET lastSeen = now      │
    │                            ├─────────────────────────>│
    │                            │                          │
    │                            │  Broadcast to pods       │
    │                            │  emit: user:offline      │
    │                            │                          │
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                        Request Flow                             │
└─────────────────────────────────────────────────────────────────┘

Request from Browser
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Network Security                                       │
│  - HTTPS/SSL encryption                                         │
│  - Firewall rules                                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: Nginx (Reverse Proxy)                                 │
│  - Rate limiting (10 req/sec)                                   │
│  - Request size limits                                          │
│  - DDoS protection                                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: Helmet.js Security Headers                            │
│  - X-Frame-Options: SAMEORIGIN                                  │
│  - X-Content-Type-Options: nosniff                              │
│  - X-XSS-Protection: 1; mode=block                              │
│  - HSTS (Strict-Transport-Security)                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: CORS Configuration                                     │
│  - Allowed origins check                                        │
│  - Credential validation                                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 5: Express Rate Limiting                                  │
│  - General: 100 requests per 15 min                             │
│  - Auth: 5 requests per 15 min                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 6: Input Validation & Sanitization                        │
│  - Email format validation                                      │
│  - Password strength check                                      │
│  - XSS prevention (escape HTML)                                 │
│  - SQL/NoSQL injection prevention                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 7: JWT Authentication                                     │
│  - Token verification                                           │
│  - Expiration check (7 days)                                    │
│  - User existence validation                                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 8: Authorization                                          │
│  - Check user permissions                                       │
│  - Verify pod membership                                        │
│  - Role-based access control                                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 9: Database Security                                      │
│  - MongoDB authentication                                       │
│  - Connection encryption                                        │
│  - Query sanitization                                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
                   Process Request
                   Send Response
```

## File Structure

```
walkie-app/
│
├── backend/                          # Backend server
│   ├── server.js                     # Main application file (900+ lines)
│   │   ├── Database Models
│   │   │   ├── User (email, password, username, avatar)
│   │   │   ├── Pod (name, code, members, channels)
│   │   │   └── Message (content, author, timestamp)
│   │   ├── API Routes
│   │   │   ├── Auth (register, login, logout)
│   │   │   ├── Users (profile, password)
│   │   │   ├── Pods (create, join, list, details)
│   │   │   └── Messages (get, send)
│   │   └── WebSocket Events
│   │       ├── Connection/Disconnect
│   │       ├── Message Send/Receive
│   │       ├── Typing Indicators
│   │       └── Presence Updates
│   │
│   ├── package.json                  # Dependencies
│   ├── .env                          # Environment configuration
│   ├── Dockerfile                    # Docker container config
│   ├── docker-compose.yml            # Multi-container setup
│   └── nginx.conf                    # Reverse proxy config
│
├── frontend/                         # Frontend application
│   ├── walkie.html                   # Main UI (2100+ lines)
│   │   ├── Authentication Screens
│   │   │   ├── Login
│   │   │   └── Signup (4-step)
│   │   ├── Pod Onboarding
│   │   │   ├── Create Pod
│   │   │   └── Join Pod
│   │   └── Main Dashboard
│   │       ├── Left Sidebar (Channels)
│   │       ├── Center (Chat Area)
│   │       └── Right Sidebar (Members)
│   │
│   └── api-client.js                 # Backend communication
│       ├── Authentication methods
│       ├── CRUD operations
│       └── WebSocket handling
│
└── docs/                             # Documentation
    ├── README.md                     # Full documentation
    ├── SETUP_GUIDE.md               # This file
    ├── SECURITY.md                  # Security best practices
    └── QUICKSTART.md                # 5-minute setup
```

## Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
├─────────────────────────────────────────────────────────────────┤
│  Framework:        React (via Babel browser transform)          │
│  State Management: React Hooks (useState, useEffect)            │
│  Styling:          CSS3 with CSS Variables                      │
│  Real-time:        Socket.io Client                             │
│  HTTP Client:      Fetch API                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                 │
├─────────────────────────────────────────────────────────────────┤
│  Runtime:          Node.js 18+                                  │
│  Framework:        Express.js                                   │
│  Real-time:        Socket.io                                    │
│  Database ODM:     Mongoose                                     │
│  Authentication:   JWT (jsonwebtoken)                           │
│  Password Hash:    Bcrypt.js (cost factor 12)                   │
│  Security:                                                      │
│   - helmet         (Security headers)                           │
│   - cors           (Cross-origin resource sharing)              │
│   - rate-limit     (API throttling)                             │
│   - mongo-sanitize (NoSQL injection prevention)                 │
│   - validator      (Input validation)                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE                                 │
├─────────────────────────────────────────────────────────────────┤
│  Database:         MongoDB 7.0+                                 │
│  Collections:      Users, Pods, Messages                        │
│  Indexing:         email (unique), podId + channelId            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      INFRASTRUCTURE                             │
├─────────────────────────────────────────────────────────────────┤
│  Containerization: Docker, Docker Compose                       │
│  Reverse Proxy:    Nginx                                        │
│  Process Manager:  PM2 (optional)                               │
│  SSL/TLS:          Let's Encrypt (Certbot)                      │
└─────────────────────────────────────────────────────────────────┘
```

## Port Map

```
Service                 Port        Protocol       Description
─────────────────────────────────────────────────────────────────
Frontend (Dev)          3000        HTTP           Development server
Backend API             5000        HTTP/WS        REST API + WebSocket
MongoDB                 27017       TCP            Database
Nginx (Production)      80          HTTP           Reverse proxy
Nginx (SSL)             443         HTTPS          Secure reverse proxy
```

## Environment Variables

```
Variable              Default                   Description
─────────────────────────────────────────────────────────────────
PORT                  5000                      Backend server port
NODE_ENV              development               Environment mode
MONGODB_URI           mongodb://localhost...    Database connection
JWT_SECRET            (random string)           Token signing key
CLIENT_URL            http://localhost:3000     Frontend URL (CORS)
```

---

This architecture provides:
✅ Scalability (horizontal and vertical)
✅ Security (multiple layers of protection)
✅ Real-time capabilities (WebSocket)
✅ Persistence (MongoDB)
✅ Production-ready deployment options
