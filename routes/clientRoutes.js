// routes/clientRoutes.js - Client-specific API endpoints
const express = require('express');
const router = express.Router();
const dynamodbService = require('../services/dynamodbService');
const logger = require('../utils/logger');

/**
 * GET /api/client/info
 * Get client-specific configuration and capabilities
 */
router.get('/info', (req, res) => {
  const clientInfo = {
    detectedClient: req.clientType,
    clientVersion: req.clientVersion,
    serverTime: new Date().toISOString(),
    capabilities: getClientCapabilities(req.clientType),
    recommendations: getClientRecommendations(req.clientType)
  };

  res.json({
    success: true,
    client: clientInfo,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/client/optimized-data
 * Get data optimized for the specific client type
 */
router.get('/optimized-data', async (req, res, next) => {
  try {
    const { deviceId, timeRange = '24h' } = req.query;
    
    // Get optimal limit based on client type
    const limit = getOptimalDataLimit(req.clientType);
    
    // Get data with client-specific optimizations
    const [latestData, historicalData, analytics] = await Promise.all([
      dynamodbService.getLatestRecord(deviceId),
      dynamodbService.getDeviceData(deviceId, { limit }),
      dynamodbService.getAnalyticsSummary(deviceId, timeRange)
    ]);

    // Format response based on client type
    const optimizedResponse = formatResponseForClient(
      req.clientType,
      {
        latest: latestData,
        historical: historicalData,
        analytics
      }
    );

    res.json({
      success: true,
      data: optimizedResponse,
      clientOptimizations: getAppliedOptimizations(req.clientType),
      timestamp: new Date().toISOString()
    });

    logger.info(`Optimized data served to ${req.clientType} client: ${historicalData.count} records`);
  } catch (error) {
    logger.error('Error in optimized-data endpoint:', error);
    next(error);
  }
});

// Helper functions
function getClientCapabilities(clientType) {
  const baseCapabilities = {
    websocket: true,
    realtime: true,
    analytics: true,
    pagination: true
  };

  switch (clientType) {
    case 'react-native':
      return {
        ...baseCapabilities,
        offlineSync: true,
        backgroundRefresh: true,
        localCaching: true
      };
    case 'nextjs':
      return {
        ...baseCapabilities,
        serverSideRendering: true,
        staticGeneration: true
      };
    default:
      return baseCapabilities;
  }
}

function getClientRecommendations(clientType) {
  switch (clientType) {
    case 'react-native':
      return {
        dataLimit: 50,
        refreshInterval: 30000,
        useWebSocket: true,
        enableCaching: true
      };
    case 'nextjs':
      return {
        dataLimit: 100,
        refreshInterval: 15000,
        useWebSocket: true,
        enableCaching: false
      };
    default:
      return {
        dataLimit: 25,
        refreshInterval: 60000,
        useWebSocket: false
      };
  }
}

function getOptimalDataLimit(clientType) {
  switch (clientType) {
    case 'react-native':
      return 50; // Smaller chunks for mobile
    case 'nextjs':
      return 100; // Larger chunks for web
    default:
      return 25;
  }
}

function formatResponseForClient(clientType, data) {
  if (clientType === 'react-native') {
    // Optimize for mobile: remove unnecessary fields, compress timestamps
    return {
      latest: data.latest ? {
        id: data.latest.deviceId,
        value: data.latest.value,
        time: data.latest.timestamp,
        status: data.latest.status
      } : null,
      history: data.historical.items.map(item => ({
        id: item.deviceId,
        value: item.value,
        time: item.timestamp,
        status: item.status
      })),
      stats: {
        total: data.analytics.totalRecords,
        avg: data.analytics.analytics?.averageValue,
        min: data.analytics.analytics?.minValue,
        max: data.analytics.analytics?.maxValue
      }
    };
  }
  
  // Return full data for web clients
  return data;
}

function getAppliedOptimizations(clientType) {
  switch (clientType) {
    case 'react-native':
      return [
        'Reduced data payload',
        'Compressed field names',
        'Optimized for mobile bandwidth'
      ];
    case 'nextjs':
      return [
        'Full data structure',
        'SEO-friendly format',
        'SSR compatible'
      ];
    default:
      return ['Basic optimization'];
  }
}

module.exports = router;