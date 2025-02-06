const express = require('express');
const cors = require('cors');
const session = require('express-session');
const apiRoutes = require('./src/routes/api');
const authRoutes = require('./src/routes/auth');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Increase payload limit
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://ytsattu.netlify.app',
    'http://16.171.4.213:5000'  // Add your EC2 URL
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
}));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'YouTube Streamer API is running!' });
});

// Routes
app.use('/api', apiRoutes);
app.use('/auth', authRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({
    error: 'Server error',
    details: err.message
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 