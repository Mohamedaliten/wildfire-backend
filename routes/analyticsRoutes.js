// routes/analyticsRoutes.js - Analytics API endpoints
const express = require('express');
const router = express.Router();
const dynamodbService = require('../services/dynamodbService');
const logger = require('../utils/logger');

/**
 * GET /api/analytics/summary
 * Get analytics summary for a device or all devices
 */
router.get('/summary', async (req, res, next) => {
  try {
    const {
      deviceId,
      timeRange = '24h'
    } = req.query;

    const summary = await dynamodbService.getAnalyticsSummary(deviceId, timeRange);

    res.json({
      success: true,
      analytics: summary,
      deviceId: deviceId || 'default',
      timeRange,
      timestamp: new Date().toISOString()
    });

    logger.info(`Analytics summary retrieved for device: ${deviceId || 'default'}, range: ${timeRange}`);
  } catch (error) {
    logger.error('Error in /summary endpoint:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/devices/:deviceId/summary
 * Get analytics summary for a specific device
 */
router.get('/devices/:deviceId/summary', async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const { timeRange = '24h' } = req.query;

    const summary = await dynamodbService.getAnalyticsSummary(deviceId, timeRange);

    res.json({
      success: true,
      analytics: summary,
      deviceId,
      timeRange,
      timestamp: new Date().toISOString()
    });

    logger.info(`Analytics summary retrieved for specific device: ${deviceId}, range: ${timeRange}`);
  } catch (error) {
    logger.error(`Error in /devices/${req.params.deviceId}/summary endpoint:`, error);
    next(error);
  }
});

/**
 * GET /api/analytics/dashboard
 * Get dashboard data with multiple metrics
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const { deviceId } = req.query;

    // Get multiple time ranges for dashboard
    const timeRanges = ['1h', '24h', '7d'];
    const dashboardData = {};

    for (const range of timeRanges) {
      try {
        dashboardData[range] = await dynamodbService.getAnalyticsSummary(deviceId, range);
      } catch (error) {
        logger.warn(`Failed to get analytics for range ${range}:`, error.message);
        dashboardData[range] = {
          error: error.message,
          totalRecords: 0
        };
      }
    }

    // Get device list
    const deviceList = await dynamodbService.getDeviceList();

    // Get latest data
    const latestData = await dynamodbService.getLatestRecord(deviceId);

    res.json({
      success: true,
      dashboard: {
        analytics: dashboardData,
        devices: deviceList,
        latest: latestData,
        activeDevice: deviceId || process.env.DEFAULT_DEVICE_ID || 'device_001'
      },
      timestamp: new Date().toISOString()
    });

    logger.info(`Dashboard data retrieved for device: ${deviceId || 'default'}`);
  } catch (error) {
    logger.error('Error in /dashboard endpoint:', error);
    next(error);
  }
});

module.exports = router;