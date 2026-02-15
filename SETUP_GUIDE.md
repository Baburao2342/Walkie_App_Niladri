# Walkie Complete Setup Guide - Step by Step

This guide will walk you through setting up Walkie from scratch, whether you're on Windows, macOS, or Linux.

## 📋 Table of Contents

1. [Prerequisites Installation](#prerequisites-installation)
2. [Project Setup](#project-setup)
3. [Backend Configuration](#backend-configuration)
4. [Frontend Setup](#frontend-setup)
5. [Testing the Application](#testing-the-application)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites Installation

### Step 1: Install Node.js

#### Windows:
1. Go to https://nodejs.org/
2. Download the LTS version (18.x or higher)
3. Run the installer
4. Click "Next" through all prompts (keep defaults)
5. Verify installation:
   ```cmd
   node --version
   npm --version
   ```
   You should see version numbers like `v18.17.0` and `9.6.7`

#### macOS:
```bash
# Using Homebrew (recommended)
brew install node

# Or download from https://nodejs.org/

# Verify
node --version
npm --version
```

#### Linux (Ubuntu/Debian):
```bash
# Update package list
sudo apt update

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

### Step 2: Install MongoDB

#### Windows:
1. Go to https://www.mongodb.com/try/download/community
2. Download MongoDB Community Server
3. Run the installer
4. Choose "Complete" installation
5. Check "Install MongoDB as a Service"
6. Check "Install MongoDB Compass" (GUI tool)
7. Click "Install"
8. After installation, MongoDB should start automatically
9. Verify:
   ```cmd
   mongosh
   ```
   You should see MongoDB shell prompt

#### macOS:
```bash
# Install using Homebrew
brew tap mongodb/brew
brew install mongodb-community@7.0

# Start MongoDB
brew services start mongodb-community@7.0

# Verify
mongosh
```

#### Linux (Ubuntu/Debian):
```bash
# Import MongoDB public key
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update and install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
mongosh
```

If you see the MongoDB shell prompt `test>`, you're ready! Type `exit` to leave.

---

## Project Setup

### Step 3: Create Project Directory

#### All Operating Systems:

```bash
# Create project folder
mkdir walkie-app
cd walkie-app

# Create subdirectories
mkdir backend
mkdir frontend
```

Your folder structure should look like:
```
walkie-app/
├── backend/
└── frontend/
```

### Step 4: Download/Copy Project Files

You have the backend files I created. Let's organize them:

**Copy these files to the `backend/` folder:**
- server.js
- package.json
- .env.example
- Dockerfile (optional)
- docker-compose.yml (optional)
- nginx.conf (optional)

**Copy to the `frontend/` folder:**
- walkie.html (your existing frontend)
- api-client.js (the API connector I created)

Your structure should now be:
```
walkie-app/
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   └── (other files)
└── frontend/
    ├── walkie.html
    └── api-client.js
```

---

## Backend Configuration

### Step 5: Install Backend Dependencies

Open terminal/command prompt in the `backend/` folder:

```bash
cd walkie-app/backend

# Install all dependencies
npm install
```

You should see a progress bar and then:
```
added 150 packages in 30s
```

**What this installs:**
- express (web framework)
- mongoose (MongoDB driver)
- bcryptjs (password hashing)
- jsonwebtoken (authentication)
- socket.io (real-time communication)
- and security packages

### Step 6: Configure Environment Variables

Still in `backend/` folder:

```bash
# Copy the example file
cp .env.example .env

# Edit the file
```

**Windows:** Use Notepad
```cmd
notepad .env
```

**macOS/Linux:** Use any text editor
```bash
nano .env
# or
code .env  # if you have VS Code
```

**Edit the .env file to look like this:**

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database (leave as-is for local development)
MONGODB_URI=mongodb://localhost:27017/walkie

# JWT Secret - IMPORTANT: Change this to something random!
JWT_SECRET=my-super-secret-key-please-change-this-to-random-text

# Client URL
CLIENT_URL=http://localhost:3000
```

**IMPORTANT:** For production, generate a secure JWT_SECRET:

```bash
# On Mac/Linux
openssl rand -base64 32

# On Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

Copy the output and paste it as your JWT_SECRET.

**Save and close the file.**

### Step 7: Start the Backend Server

In the `backend/` folder:

```bash
# Start the server
npm start
```

You should see:
```
✅ Connected to MongoDB
🚀 Server running on port 5000
📡 WebSocket server ready
```

**Success!** Your backend is running.

Leave this terminal window open. The server needs to keep running.

---

## Frontend Setup

### Step 8: Update Frontend to Connect to Backend

Open `frontend/walkie.html` in a text editor.

**Add the Socket.io Client Library:**

Find the `<head>` section (around line 10) and add this BEFORE the existing scripts:

```html
<!-- Add this line -->
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>

<!-- Existing scripts below -->
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
```

**Add the API Client:**

Find the `<script type="text/babel">` line (around line 1355) and add this RIGHT AFTER it:

```javascript
<script type="text/babel">
  // Add these constants at the very top
  const API_URL = 'http://localhost:5000/api';
  const SOCKET_URL = 'http://localhost:5000';
  
  // Rest of your existing code below...
  const { useState, useEffect, useRef } = React;
```

**Include the API Client File:**

Add this line BEFORE the closing `</body>` tag:

```html
  <script src="api-client.js"></script>
</body>
```

**Save the file.**

### Step 9: Serve the Frontend

Open a **NEW** terminal/command prompt window (keep the backend running in the other one).

Navigate to the `frontend/` folder:

```bash
cd walkie-app/frontend
```

**Choose ONE of these methods to serve the frontend:**

#### Option A: Python (easiest if you have Python)

```bash
# Python 3
python3 -m http.server 3000

# Or Python 2
python -m SimpleHTTPServer 3000
```

#### Option B: Node.js http-server

```bash
# Install http-server globally (one time only)
npm install -g http-server

# Start server
http-server -p 3000
```

#### Option C: Just open the HTML file directly

```bash
# On macOS
open walkie.html

# On Linux
xdg-open walkie.html

# On Windows
start walkie.html
```

**Note:** Option C might have CORS issues. Options A or B are recommended.

You should see:
```
Server running at http://localhost:3000/
```

---

## Testing the Application

### Step 10: Open Walkie in Your Browser

1. Open your browser (Chrome, Firefox, Safari, Edge)
2. Go to: `http://localhost:3000/walkie.html`
   - Or if you opened the file directly, it should already be open

### Step 11: Create Your First Account

**You should see the Walkie login screen with the neon design!**

1. Click "**Sign Up**"
2. Enter your email: `test@example.com`
3. Create a password: `password123` (8+ characters)
4. Confirm password: `password123`
5. Choose username: `testuser`
6. Click "**Create Account**"

**You should be taken to the Pod Onboarding screen!**

### Step 12: Create Your First Pod

1. Click "**Create a Pod**"
2. Enter pod name: `My First Pod`
3. Click "**Create Pod & Continue**"

**You'll see:**
- ✅ Pod name
- ✅ 8-character invite code (e.g., `A7X9K2M4`)
- ✅ Copy code button

4. Click "**Continue to Dashboard**"

**Success! You're now in the Walkie dashboard!**

### Step 13: Test Real-Time Messaging

**Open a second browser window** (or incognito/private window):

1. Go to `http://localhost:3000/walkie.html`
2. Click "**Sign Up**" again
3. Create a second account:
   - Email: `user2@example.com`
   - Password: `password123`
   - Username: `seconduser`
4. Click "**Join a Pod**"
5. Enter the 8-digit code from your first account
6. Click "**Join**"

**Now you have 2 users in the same pod!**

**Test messaging:**
1. In the first browser: Type a message in the chat box
2. Press Enter
3. **Watch it appear INSTANTLY in the second browser!**

**Test online status:**
- Close the second browser tab
- In the first browser, watch the member go offline (grey box)
- Reopen the tab and login
- Watch them come back online (green glow)

---

## Troubleshooting

### Problem: "Cannot connect to MongoDB"

**Solution:**

1. Check if MongoDB is running:

```bash
# Windows
# Open Services app, look for "MongoDB"

# macOS
brew services list | grep mongodb

# Linux
sudo systemctl status mongod
```

2. If not running, start it:

```bash
# Windows
# Start from Services app

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

3. Try connecting manually:
```bash
mongosh
```

If this works, MongoDB is running correctly.

### Problem: "Port 5000 already in use"

**Solution:**

1. Find what's using the port:

```bash
# macOS/Linux
lsof -i :5000

# Windows PowerShell
netstat -ano | findstr :5000
```

2. Kill the process:

```bash
# macOS/Linux
kill -9 <PID>

# Windows
taskkill /PID <PID> /F
```

3. Or change the port in `.env`:
```env
PORT=5001
```

Also update the frontend API_URL to match.

### Problem: "Failed to fetch" or CORS errors

**Solution:**

1. Make sure backend is running (check the terminal)
2. Verify the API_URL in walkie.html matches your backend:
   ```javascript
   const API_URL = 'http://localhost:5000/api';
   ```
3. Make sure CLIENT_URL in backend `.env` matches your frontend:
   ```env
   CLIENT_URL=http://localhost:3000
   ```
4. Restart the backend server after changing .env:
   - Press `Ctrl+C` in the terminal
   - Run `npm start` again

### Problem: "npm: command not found"

**Solution:**

Node.js wasn't installed correctly. Go back to Step 1 and reinstall Node.js.

### Problem: Messages not appearing in real-time

**Solution:**

1. Check browser console (F12) for WebSocket errors
2. Make sure Socket.io client library is loaded in HTML
3. Verify both users are in the same pod
4. Check backend terminal for connection messages

### Problem: "Invalid token" or authentication errors

**Solution:**

1. Clear browser localStorage:
   - Open browser console (F12)
   - Type: `localStorage.clear()`
   - Press Enter
   - Refresh the page
2. Create a new account

---

## Verification Checklist

✅ **Backend Running?**
- Terminal shows "Connected to MongoDB"
- Terminal shows "Server running on port 5000"
- You can visit http://localhost:5000/api/health (should see `{"status":"OK"}`)

✅ **Frontend Accessible?**
- You can open http://localhost:3000/walkie.html
- You see the Walkie login page
- No errors in browser console (F12)

✅ **Database Working?**
- Run `mongosh` in terminal - it connects
- You can create an account
- Login works

✅ **Real-time Working?**
- Two users can message each other
- Messages appear instantly
- Online status updates

✅ **Features Working?**
- Create pod generates 8-digit code
- Join pod with code works
- Channels can be selected
- User profile shows correct info

---

## Next Steps

**Your Walkie app is now running! 🎉**

**For Development:**
- Modify the frontend (walkie.html) to customize design
- Add new features to server.js
- Read the API documentation in README.md

**For Production:**
- Read SECURITY.md for hardening
- Change all default passwords and secrets
- Set up HTTPS/SSL
- Use a production database (MongoDB Atlas)
- Deploy to a server (see README.md)

**Additional Features to Add:**
- File uploads
- User avatars
- Message reactions
- Voice/video calls
- Search functionality
- Notifications

---

## Quick Reference Commands

```bash
# Start MongoDB
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
# Windows: (runs automatically as service)

# Start Backend
cd backend
npm start

# Start Frontend
cd frontend
python3 -m http.server 3000
# or
npx http-server -p 3000

# Check MongoDB
mongosh

# View Backend Logs
# (output is in the terminal where you ran npm start)

# Stop Everything
# Press Ctrl+C in each terminal
```

---

## Getting Help

1. Check the error message in terminal or browser console
2. Review the Troubleshooting section above
3. Check README.md for detailed documentation
4. Verify all prerequisites are installed correctly

---

**Congratulations! You now have a fully functional real-time messaging platform! 🚀**
