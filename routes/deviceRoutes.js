// routes/deviceRoutes.js - Device API endpoints
const express = require('express');
const router = express.Router();
const dynamodbService = require('../services/dynamodbService');
const logger = require('../utils/logger');

/**
 * GET /api/device/latest
 * Get the latest record for default device or specified device
 */
router.get('/latest', async (req, res, next) => {
  try {
    const { deviceId } = req.query;
    
    const latestRecord = await dynamodbService.getLatestRecord(deviceId);
    
    if (!latestRecord) {
      return res.status(404).json({
        success: false,
        message: 'No data found for the specified device',
        data: null
      });
    }

    // Broadcast to WebSocket clients if available
    if (global.io) {
      global.io.emit('latest-data', latestRecord);
    }

    res.json({
      success: true,
      data: latestRecord,
      timestamp: new Date().toISOString()
    });

    logger.info(`Latest data retrieved for device: ${deviceId || 'default'}`);
  } catch (error) {
    logger.error('Error in /latest endpoint:', error);
    next(error);
  }
});

/**
 * GET /api/device/data
 * Get all data for default device with pagination and filtering
 */
router.get('/data', async (req, res, next) => {
  try {
    const {
      deviceId,
      limit = 100,
      lastKey,
      startTime,
      endTime
    } = req.query;

    const options = {
      limit: parseInt(limit),
      lastEvaluatedKey: lastKey ? JSON.parse(decodeURIComponent(lastKey)) : null,
      startTime: startTime ? parseInt(startTime) : null,
      endTime: endTime ? parseInt(endTime) : null
    };

    const result = await dynamodbService.getDeviceData(deviceId, options);

    res.json({
      success: true,
      data: result.items,
      pagination: {
        count: result.count,
        hasMore: result.hasMore,
        lastEvaluatedKey: result.lastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.lastEvaluatedKey)) : null
      },
      timestamp: new Date().toISOString()
    });

    logger.info(`Device data retrieved: ${result.count} records for device: ${deviceId || 'default'}`);
  } catch (error) {
    logger.error('Error in /data endpoint:', error);
    next(error);
  }
});

/**
 * GET /api/device/list
 * Get list of all device IDs
 */
router.get('/list', async (req, res, next) => {
  try {
    const deviceIds = await dynamodbService.getDeviceList();

    res.json({
      success: true,
      devices: deviceIds,
      count: deviceIds.length,
      timestamp: new Date().toISOString()
    });

    logger.info(`Device list retrieved: ${deviceIds.length} devices`);
  } catch (error) {
    logger.error('Error in /list endpoint:', error);
    next(error);
  }
});

/**
 * GET /api/device/all/data
 * Get data from all devices (for analytics)
 */
router.get('/all/data', async (req, res, next) => {
  try {
    const {
      limit = 100,
      lastKey
    } = req.query;

    const options = {
      limit: parseInt(limit),
      lastEvaluatedKey: lastKey ? JSON.parse(decodeURIComponent(lastKey)) : null
    };

    const result = await dynamodbService.getAllData(options);

    res.json({
      success: true,
      data: result.items,
      pagination: {
        count: result.count,
        hasMore: result.hasMore,
        lastEvaluatedKey: result.lastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.lastEvaluatedKey)) : null
      },
      timestamp: new Date().toISOString()
    });

    logger.info(`All devices data retrieved: ${result.count} records`);
  } catch (error) {
    logger.error('Error in /all/data endpoint:', error);
    next(error);
  }
});

/**
 * GET /api/device/health/db
 * Test database connection
 */
router.get('/health/db', async (req, res, next) => {
  try {
    const result = await dynamodbService.testConnection();
    
    const statusCode = result.success ? 200 : 500;
    
    res.status(statusCode).json({
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error in /health/db endpoint:', error);
    next(error);
  }
});

/**
 * GET /api/device/:deviceId
 * Get data for a specific device
 */
router.get('/:deviceId', async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const {
      limit = 100,
      lastKey,
      startTime,
      endTime
    } = req.query;

    const options = {
      limit: parseInt(limit),
      lastEvaluatedKey: lastKey ? JSON.parse(decodeURIComponent(lastKey)) : null,
      startTime: startTime ? parseInt(startTime) : null,
      endTime: endTime ? parseInt(endTime) : null
    };

    const result = await dynamodbService.getDeviceData(deviceId, options);

    res.json({
      success: true,
      deviceId,
      data: result.items,
      pagination: {
        count: result.count,
        hasMore: result.hasMore,
        lastEvaluatedKey: result.lastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.lastEvaluatedKey)) : null
      },
      timestamp: new Date().toISOString()
    });

    logger.info(`Specific device data retrieved: ${result.count} records for device: ${deviceId}`);
  } catch (error) {
    logger.error(`Error in /${req.params.deviceId} endpoint:`, error);
    next(error);
  }
});

/**
 * GET /api/device/:deviceId/latest
 * Get latest record for a specific device
 */
router.get('/:deviceId/latest', async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    
    const latestRecord = await dynamodbService.getLatestRecord(deviceId);
    
    if (!latestRecord) {
      return res.status(404).json({
        success: false,
        message: `No data found for device: ${deviceId}`,
        data: null
      });
    }

    res.json({
      success: true,
      deviceId,
      data: latestRecord,
      timestamp: new Date().toISOString()
    });

    logger.info(`Latest data retrieved for specific device: ${deviceId}`);
  } catch (error) {
    logger.error(`Error in /${req.params.deviceId}/latest endpoint:`, error);
    next(error);
  }
});

module.exports = router;