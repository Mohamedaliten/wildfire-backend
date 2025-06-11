// middleware/clientDetection.js - Detect Next.js vs React Native clients
const logger = require('../utils/logger');

const clientDetection = (req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  const clientType = req.get('X-Client-Type') || '';
  const clientVersion = req.get('X-Client-Version') || '';

  // Detect client type
  let detectedClient = 'unknown';
  let detectedVersion = '';

  // Explicit client type header (most reliable)
  if (clientType) {
    detectedClient = clientType.toLowerCase();
    detectedVersion = clientVersion;
  }
  // React Native detection patterns
  else if (
    userAgent.includes('React Native') ||
    userAgent.includes('okhttp') ||
    userAgent.includes('CFNetwork') ||
    userAgent.includes('Expo')
  ) {
    detectedClient = 'react-native';
    
    const rnMatch = userAgent.match(/React Native\/([0-9.]+)/);
    if (rnMatch) {
      detectedVersion = rnMatch[1];
    }
  }
  // Next.js/Web detection patterns
  else if (
    userAgent.includes('Mozilla') ||
    userAgent.includes('Chrome') ||
    userAgent.includes('Safari') ||
    userAgent.includes('Firefox') ||
    userAgent.includes('Edge')
  ) {
    detectedClient = 'nextjs';
  }

  // Add client information to request
  req.clientType = detectedClient;
  req.clientVersion = detectedVersion || clientVersion;
  req.originalUserAgent = userAgent;

  // Add client info to response headers
  res.set('X-Detected-Client', detectedClient);
  if (detectedVersion) {
    res.set('X-Detected-Version', detectedVersion);
  }

  next();
};

module.exports = clientDetection;