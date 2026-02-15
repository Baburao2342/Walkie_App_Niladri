const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const validator = require('validator');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Environment variables
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/walkie';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRE = '7d';

// Security Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(mongoSanitize());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.'
});

// ============================================
// DATABASE MODELS
// ============================================

// User Schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 30
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  avatar: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isOnline: {
    type: Boolean,
    default: false
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

// Pod Schema
const podSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    length: 8
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member'
    }
  }],
  channels: [{
    name: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      default: '#'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Pod = mongoose.model('Pod', podSchema);

// Message Schema
const messageSchema = new mongoose.Schema({
  podId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pod',
    required: true
  },
  channelId: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: Date
});

const Message = mongoose.model('Message', messageSchema);

// ============================================
// MIDDLEWARE
// ============================================

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Generate unique pod code
function generatePodCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Sanitize input
function sanitizeInput(input) {
  if (typeof input === 'string') {
    return validator.escape(input.trim());
  }
  return input;
}

// ============================================
// API ROUTES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Register
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Validate input
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (username.length < 2 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be between 2 and 30 characters' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      username: sanitizeInput(username),
      password,
      avatar: username.substring(0, 2).toUpperCase()
    });

    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRE });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last seen
    user.lastSeen = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRE });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
app.get('/api/auth/me', authenticate, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      username: req.user.username,
      avatar: req.user.avatar,
      isOnline: req.user.isOnline
    }
  });
});

// Update user profile
app.put('/api/users/profile', authenticate, async (req, res) => {
  try {
    const { username, avatar } = req.body;

    if (username) {
      req.user.username = sanitizeInput(username);
      req.user.avatar = username.substring(0, 2).toUpperCase();
    }

    if (avatar) {
      req.user.avatar = sanitizeInput(avatar);
    }

    await req.user.save();

    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        username: req.user.username,
        avatar: req.user.avatar
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

// Change password
app.put('/api/users/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both passwords are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    // Verify current password
    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

// Create pod
app.post('/api/pods', authenticate, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Pod name is required' });
    }

    if (name.length > 50) {
      return res.status(400).json({ error: 'Pod name too long' });
    }

    // Generate unique code
    let code;
    let isUnique = false;
    while (!isUnique) {
      code = generatePodCode();
      const existing = await Pod.findOne({ code });
      if (!existing) isUnique = true;
    }

    // Create default channels
    const defaultChannels = [
      { name: 'general', icon: '#' },
      { name: 'announcements', icon: '📢' },
      { name: 'random', icon: '🎲' }
    ];

    const pod = new Pod({
      name: sanitizeInput(name),
      code,
      createdBy: req.user._id,
      members: [{
        userId: req.user._id,
        role: 'owner'
      }],
      channels: defaultChannels
    });

    await pod.save();

    res.status(201).json({
      pod: {
        id: pod._id,
        name: pod.name,
        code: pod.code,
        channels: pod.channels,
        memberCount: pod.members.length
      }
    });
  } catch (error) {
    console.error('Create pod error:', error);
    res.status(500).json({ error: 'Pod creation failed' });
  }
});

// Join pod by code
app.post('/api/pods/join', authenticate, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || code.length !== 8) {
      return res.status(400).json({ error: 'Invalid pod code' });
    }

    const pod = await Pod.findOne({ code: code.toUpperCase() });
    
    if (!pod) {
      return res.status(404).json({ error: 'Pod not found' });
    }

    // Check if already a member
    const isMember = pod.members.some(m => m.userId.toString() === req.user._id.toString());
    
    if (isMember) {
      return res.status(400).json({ error: 'Already a member of this pod' });
    }

    // Add user to pod
    pod.members.push({
      userId: req.user._id,
      role: 'member'
    });

    await pod.save();

    res.json({
      pod: {
        id: pod._id,
        name: pod.name,
        code: pod.code,
        channels: pod.channels,
        memberCount: pod.members.length
      }
    });
  } catch (error) {
    console.error('Join pod error:', error);
    res.status(500).json({ error: 'Failed to join pod' });
  }
});

// Get user's pods
app.get('/api/pods', authenticate, async (req, res) => {
  try {
    const pods = await Pod.find({
      'members.userId': req.user._id
    }).select('name code channels members createdAt');

    const podsWithDetails = pods.map(pod => ({
      id: pod._id,
      name: pod.name,
      code: pod.code,
      channels: pod.channels,
      memberCount: pod.members.length,
      createdAt: pod.createdAt
    }));

    res.json({ pods: podsWithDetails });
  } catch (error) {
    console.error('Get pods error:', error);
    res.status(500).json({ error: 'Failed to fetch pods' });
  }
});

// Get pod details
app.get('/api/pods/:podId', authenticate, async (req, res) => {
  try {
    const pod = await Pod.findById(req.params.podId)
      .populate('members.userId', 'username avatar isOnline lastSeen');

    if (!pod) {
      return res.status(404).json({ error: 'Pod not found' });
    }

    // Check if user is a member
    const isMember = pod.members.some(m => m.userId._id.toString() === req.user._id.toString());
    
    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this pod' });
    }

    res.json({
      pod: {
        id: pod._id,
        name: pod.name,
        code: pod.code,
        channels: pod.channels,
        members: pod.members.map(m => ({
          id: m.userId._id,
          username: m.userId.username,
          avatar: m.userId.avatar,
          isOnline: m.userId.isOnline,
          lastSeen: m.userId.lastSeen,
          role: m.role,
          joinedAt: m.joinedAt
        }))
      }
    });
  } catch (error) {
    console.error('Get pod error:', error);
    res.status(500).json({ error: 'Failed to fetch pod' });
  }
});

// Get messages for a channel
app.get('/api/pods/:podId/channels/:channelId/messages', authenticate, async (req, res) => {
  try {
    const { podId, channelId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before; // For pagination

    // Verify user is member of pod
    const pod = await Pod.findById(podId);
    if (!pod) {
      return res.status(404).json({ error: 'Pod not found' });
    }

    const isMember = pod.members.some(m => m.userId.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this pod' });
    }

    const query = { podId, channelId };
    if (before) {
      query._id = { $lt: before };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'username avatar');

    res.json({
      messages: messages.reverse().map(m => ({
        id: m._id,
        content: m.content,
        author: {
          id: m.userId._id,
          username: m.userId.username,
          avatar: m.userId.avatar
        },
        createdAt: m.createdAt,
        edited: m.edited,
        editedAt: m.editedAt
      }))
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Create channel
app.post('/api/pods/:podId/channels', authenticate, async (req, res) => {
  try {
    const { name, icon } = req.body;
    const pod = await Pod.findById(req.params.podId);

    if (!pod) {
      return res.status(404).json({ error: 'Pod not found' });
    }

    // Check if user is admin or owner
    const member = pod.members.find(m => m.userId.toString() === req.user._id.toString());
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ error: 'Only admins can create channels' });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Channel name is required' });
    }

    pod.channels.push({
      name: sanitizeInput(name),
      icon: icon || '#'
    });

    await pod.save();

    res.status(201).json({
      channel: pod.channels[pod.channels.length - 1]
    });
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

// ============================================
// WEBSOCKET (Socket.io)
// ============================================

// Store active connections
const activeUsers = new Map(); // userId -> socketId

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', async (socket) => {
  console.log(`User connected: ${socket.user.username} (${socket.userId})`);
  
  // Mark user as online
  activeUsers.set(socket.userId, socket.id);
  await User.findByIdAndUpdate(socket.userId, { isOnline: true, lastSeen: new Date() });

  // Join user's pods
  const userPods = await Pod.find({ 'members.userId': socket.userId });
  userPods.forEach(pod => {
    socket.join(`pod:${pod._id}`);
  });

  // Broadcast user online status to all their pods
  userPods.forEach(pod => {
    socket.to(`pod:${pod._id}`).emit('user:online', {
      userId: socket.userId,
      username: socket.user.username
    });
  });

  // Join pod room
  socket.on('pod:join', (podId) => {
    socket.join(`pod:${podId}`);
  });

  // Send message
  socket.on('message:send', async (data) => {
    try {
      const { podId, channelId, content } = data;

      if (!content || content.trim().length === 0) {
        return socket.emit('error', { message: 'Message cannot be empty' });
      }

      if (content.length > 2000) {
        return socket.emit('error', { message: 'Message too long' });
      }

      // Verify user is member of pod
      const pod = await Pod.findById(podId);
      if (!pod) {
        return socket.emit('error', { message: 'Pod not found' });
      }

      const isMember = pod.members.some(m => m.userId.toString() === socket.userId);
      if (!isMember) {
        return socket.emit('error', { message: 'Not a member of this pod' });
      }

      // Create message
      const message = new Message({
        podId,
        channelId,
        userId: socket.userId,
        content: sanitizeInput(content)
      });

      await message.save();
      await message.populate('userId', 'username avatar');

      const messageData = {
        id: message._id,
        content: message.content,
        author: {
          id: message.userId._id,
          username: message.userId.username,
          avatar: message.userId.avatar
        },
        createdAt: message.createdAt,
        channelId
      };

      // Broadcast to all users in the pod
      io.to(`pod:${podId}`).emit('message:new', messageData);
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Typing indicator
  socket.on('typing:start', (data) => {
    const { podId, channelId } = data;
    socket.to(`pod:${podId}`).emit('typing:start', {
      userId: socket.userId,
      username: socket.user.username,
      channelId
    });
  });

  socket.on('typing:stop', (data) => {
    const { podId, channelId } = data;
    socket.to(`pod:${podId}`).emit('typing:stop', {
      userId: socket.userId,
      channelId
    });
  });

  // Disconnect
  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.user.username}`);
    
    activeUsers.delete(socket.userId);
    
    // Mark user as offline
    await User.findByIdAndUpdate(socket.userId, { 
      isOnline: false, 
      lastSeen: new Date() 
    });

    // Broadcast user offline status
    userPods.forEach(pod => {
      socket.to(`pod:${pod._id}`).emit('user:offline', {
        userId: socket.userId,
        username: socket.user.username
      });
    });
  });
});

// ============================================
// DATABASE CONNECTION & SERVER START
// ============================================

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);
  });
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await mongoose.connection.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
