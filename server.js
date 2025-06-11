// server.js - Main server file for wildfire device data API
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import routes
const deviceRoutes = require('./routes/deviceRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const clientRoutes = require('./routes/clientRoutes');
const fireAlertRoutes = require('./routes/fireAlerts');
const snsRoutes = require('./routes/sns'); // Add SNS routes

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const clientDetection = require('./middleware/clientDetection');
const logger = require('./utils/logger');

// Import WebSocket handler
const setupWebSocket = require('./websocket/socketHandler');

const app = express();
const server = createServer(app);

// WebSocket setup with support for both Next.js and React Native
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:19006", // Expo dev server
      "exp://localhost:19000",  // Expo client
      "http://localhost:8081",  // Metro bundler
      "http://10.0.2.2:3001",   // Android emulator
      process.env.NEXTJS_URL,
      process.env.WEBSITE_URL,
      process.env.PRODUCTION_DOMAIN,
      ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
    ].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Setup WebSocket
if (process.env.ENABLE_WEBSOCKET === 'true') {
  setupWebSocket(io);
}

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Allow React Native embedding
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Disable for mobile app compatibility
}));

// Enhanced CORS for both platforms
const corsOptions = {
  origin: [
    // Next.js development
    'http://localhost:3000',
    'http://localhost:3001',
    
    // React Native development
    'http://localhost:19006',
    'exp://localhost:19000',
    'http://localhost:8081',
    'http://10.0.2.2:3001',
    
    // Environment variables
    process.env.NEXTJS_URL,
    process.env.WEBSITE_URL,
    process.env.PRODUCTION_DOMAIN,
    
    // Custom origins from env
    ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Client-Type',     // 'nextjs' or 'react-native'
    'X-Client-Version',  // Client version
    'X-Device-Info',     // Device information
    'X-Session-ID',      // Session tracking
    'Origin',
    'Accept'
  ],
  optionsSuccessStatus: 200 // For legacy browser support
};

app.use(cors(corsOptions));

// Client detection middleware
app.use(clientDetection);

// Rate limiting with platform awareness
const createPlatformRateLimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    switch (req.clientType) {
      case 'react-native':
        return 300; // Higher limit for mobile apps
      case 'nextjs':
        return 200; // Standard limit for web
      default:
        return 100; // Conservative limit for unknown clients
    }
  },
  message: (req) => ({
    error: `Too many requests from ${req.clientType || 'unknown'} client`,
    retryAfter: Math.ceil(15 * 60),
    clientType: req.clientType
  }),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}-${req.clientType}`,
  skip: (req) => req.path === '/health'
});

app.use('/api', createPlatformRateLimiter());

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Enhanced logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    client: {
      type: req.clientType,
      version: req.clientVersion
    },
    services: {
      websocket: process.env.ENABLE_WEBSOCKET === 'true'
    },
    supportedClients: ['nextjs', 'react-native'],
    apiVersion: '1.0.0'
  });
});

// Client configuration endpoint
app.get('/api/config', (req, res) => {
  const config = {
    client: req.clientType,
    features: {
      websocket: process.env.ENABLE_WEBSOCKET === 'true',
      realtime: true,
      analytics: true,
      pagination: true
    },
    endpoints: {
      latest: '/api/device/latest',
      data: '/api/device/data',
      analytics: '/api/analytics/summary',
      devices: '/api/device/list'
    }
  };

  res.json(config);
});

// API routes
app.use('/api/device', deviceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/client', clientRoutes);

// SNS webhook routes (mounted directly for AWS access)
app.use('/sns', snsRoutes); // SNS routes at /sns/webhook

// Webhook routes for fire alerts
app.use('/webhook', fireAlertRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Wildfire Device Data API Server',
    version: '1.0.0',
    client: {
      type: req.clientType,
      detected: req.clientType
    },
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      config: '/api/config',
      latest: '/api/device/latest',
      data: '/api/device/data',
      analytics: '/api/analytics/summary'
    }
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    client: req.clientType
  });
});

// Start server
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Listen on all interfaces

server.listen(PORT, HOST, () => {
  logger.info(`🚀 Wildfire Device Data API Server running on ${HOST}:${PORT}`);
  logger.info(`📱 React Native support: ENABLED`);
  logger.info(`💻 Next.js support: ENABLED`);
  logger.info(`🌐 WebSocket support: ${process.env.ENABLE_WEBSOCKET === 'true' ? 'ENABLED' : 'DISABLED'}`);
  logger.info(`🔧 Environment: ${process.env.NODE_ENV}`);
  
  // Test DynamoDB connection on startup
  const dynamodbService = require('./services/dynamodbService');
  dynamodbService.testConnection()
    .then(result => {
      logger.info(`📊 DynamoDB: ${result.success ? 'CONNECTED' : 'ERROR'} - ${result.message}`);
    })
    .catch(error => {
      logger.error(`📊 DynamoDB connection failed: ${error.message}`);
    });
  
  // Make io available globally
  global.io = io;
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

module.exports = app;