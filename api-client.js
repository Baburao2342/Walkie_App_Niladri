/**
 * Walkie API Client
 * Handles all communication with the backend server
 */

// Configuration
const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

class WalkieAPI {
  constructor() {
    this.token = localStorage.getItem('walkie_token');
    this.socket = null;
  }

  // ===== Authentication =====

  async register(email, password, username) {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password, username })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    this.token = data.token;
    localStorage.setItem('walkie_token', data.token);
    
    return data.user;
  }

  async login(email, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    this.token = data.token;
    localStorage.setItem('walkie_token', data.token);
    
    return data.user;
  }

  async getCurrentUser() {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get user');
    }

    return data.user;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('walkie_token');
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // ===== User Profile =====

  async updateProfile(username, avatar) {
    const response = await fetch(`${API_URL}/users/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, avatar })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Update failed');
    }

    return data.user;
  }

  async changePassword(currentPassword, newPassword) {
    const response = await fetch(`${API_URL}/users/password`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Password change failed');
    }

    return data;
  }

  // ===== Pods =====

  async createPod(name) {
    const response = await fetch(`${API_URL}/pods`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Pod creation failed');
    }

    return data.pod;
  }

  async joinPod(code) {
    const response = await fetch(`${API_URL}/pods/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to join pod');
    }

    return data.pod;
  }

  async getUserPods() {
    const response = await fetch(`${API_URL}/pods`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch pods');
    }

    return data.pods;
  }

  async getPodDetails(podId) {
    const response = await fetch(`${API_URL}/pods/${podId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch pod');
    }

    return data.pod;
  }

  async createChannel(podId, name, icon) {
    const response = await fetch(`${API_URL}/pods/${podId}/channels`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, icon })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create channel');
    }

    return data.channel;
  }

  // ===== Messages =====

  async getMessages(podId, channelId, limit = 50, before = null) {
    let url = `${API_URL}/pods/${podId}/channels/${channelId}/messages?limit=${limit}`;
    if (before) {
      url += `&before=${before}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch messages');
    }

    return data.messages;
  }

  // ===== WebSocket =====

  connectSocket(callbacks = {}) {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token: this.token
      },
      transports: ['websocket', 'polling']
    });

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Connected to WebSocket');
      if (callbacks.onConnect) callbacks.onConnect();
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from WebSocket');
      if (callbacks.onDisconnect) callbacks.onDisconnect();
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      if (callbacks.onError) callbacks.onError(error);
    });

    // Message events
    this.socket.on('message:new', (data) => {
      if (callbacks.onMessage) callbacks.onMessage(data);
    });

    // User presence events
    this.socket.on('user:online', (data) => {
      if (callbacks.onUserOnline) callbacks.onUserOnline(data);
    });

    this.socket.on('user:offline', (data) => {
      if (callbacks.onUserOffline) callbacks.onUserOffline(data);
    });

    // Typing events
    this.socket.on('typing:start', (data) => {
      if (callbacks.onTypingStart) callbacks.onTypingStart(data);
    });

    this.socket.on('typing:stop', (data) => {
      if (callbacks.onTypingStop) callbacks.onTypingStop(data);
    });

    return this.socket;
  }

  joinPodRoom(podId) {
    if (this.socket) {
      this.socket.emit('pod:join', podId);
    }
  }

  sendMessage(podId, channelId, content) {
    if (this.socket) {
      this.socket.emit('message:send', {
        podId,
        channelId,
        content
      });
    }
  }

  startTyping(podId, channelId) {
    if (this.socket) {
      this.socket.emit('typing:start', { podId, channelId });
    }
  }

  stopTyping(podId, channelId) {
    if (this.socket) {
      this.socket.emit('typing:stop', { podId, channelId });
    }
  }

  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Export for use in HTML
if (typeof window !== 'undefined') {
  window.WalkieAPI = WalkieAPI;
}
