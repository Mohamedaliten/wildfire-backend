// websocket/socketHandler.js - WebSocket real-time updates
const logger = require('../utils/logger');
const dynamodbService = require('../services/dynamodbService');

const setupWebSocket = (io) => {
  logger.info('Setting up WebSocket connections');

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Join device-specific rooms
    socket.on('subscribe-device', (deviceId) => {
      const room = `device-${deviceId}`;
      socket.join(room);
      logger.info(`Client ${socket.id} subscribed to device: ${deviceId}`);
      
      socket.emit('subscription-confirmed', {
        deviceId,
        room,
        message: `Subscribed to updates for device: ${deviceId}`
      });
    });

    // Subscribe to fire emergency alerts
    socket.on('subscribe-fire-alerts', () => {
      socket.join('fire-alerts');
      logger.info(`Client ${socket.id} subscribed to fire emergency alerts`);
      
      socket.emit('fire-alerts-subscription-confirmed', {
        message: 'Subscribed to fire emergency alerts',
        timestamp: new Date().toISOString()
      });
    });

    // Unsubscribe from fire emergency alerts
    socket.on('unsubscribe-fire-alerts', () => {
      socket.leave('fire-alerts');
      logger.info(`Client ${socket.id} unsubscribed from fire emergency alerts`);
    });

    // Leave device-specific rooms
    socket.on('unsubscribe-device', (deviceId) => {
      const room = `device-${deviceId}`;
      socket.leave(room);
      logger.info(`Client ${socket.id} unsubscribed from device: ${deviceId}`);
      
      socket.emit('unsubscription-confirmed', {
        deviceId,
        room,
        message: `Unsubscribed from updates for device: ${deviceId}`
      });
    });

    // Request latest data immediately
    socket.on('request-latest', async (deviceId) => {
      try {
        const latestData = await dynamodbService.getLatestRecord(deviceId);
        socket.emit('latest-data', latestData);
      } catch (error) {
        logger.error('Error sending latest data:', error);
        socket.emit('error', {
          message: 'Failed to fetch latest data',
          error: error.message
        });
      }
    });

    // Request analytics data
    socket.on('request-analytics', async ({ deviceId, timeRange = '24h' }) => {
      try {
        const analytics = await dynamodbService.getAnalyticsSummary(deviceId, timeRange);
        socket.emit('analytics-data', analytics);
      } catch (error) {
        logger.error('Error sending analytics data:', error);
        socket.emit('error', {
          message: 'Failed to fetch analytics data',
          error: error.message
        });
      }
    });

    // Handle ping for connection health
    socket.on('ping', () => {
      socket.emit('pong', {
        timestamp: new Date().toISOString(),
        serverTime: Date.now()
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    // Handle connection errors
    socket.on('error', (error) => {
      logger.error(`Socket error for client ${socket.id}:`, error);
    });

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to wildfire device data server',
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });
  });

  // Broadcast functions for external use
  const broadcast = {
    // Broadcast new data to all clients
    newData: (data) => {
      io.emit('new-data', data);
      
      // Also broadcast to device-specific room
      if (data.deviceId) {
        io.to(`device-${data.deviceId}`).emit('device-data-update', data);
      }
      
      logger.info(`Broadcasted new data for device: ${data.deviceId || 'unknown'}`);
    },

    // Broadcast to specific device subscribers
    deviceUpdate: (deviceId, data) => {
      io.to(`device-${deviceId}`).emit('device-update', data);
      logger.info(`Broadcasted device update for: ${deviceId}`);
    },

    // Broadcast system alerts
    systemAlert: (alert) => {
      io.emit('system-alert', {
        ...alert,
        timestamp: new Date().toISOString()
      });
      logger.info(`Broadcasted system alert: ${alert.message}`);
    },

    // Broadcast fire emergency alerts
    fireEmergency: (alertData) => {
      const emergencyBroadcast = {
        type: 'FIRE_EMERGENCY',
        level: 'CRITICAL',
        title: '🚨 WILDFIRE EMERGENCY!',
        message: `Fire emergency detected by ${alertData.deviceId}`,
        data: alertData,
        ui: {
          showPopup: true,
          autoExpire: false,
          sound: true,
          vibrate: true,
          priority: 'HIGH'
        },
        timestamp: new Date().toISOString()
      };
      
      // Broadcast to all clients
      io.emit('fire-emergency', emergencyBroadcast);
      io.emit('emergency-popup', emergencyBroadcast);
      
      // Broadcast to device-specific room
      if (alertData.deviceId) {
        io.to(`device-${alertData.deviceId}`).emit('device-emergency', emergencyBroadcast);
      }
      
      logger.error(`🚨 FIRE EMERGENCY broadcasted for device: ${alertData.deviceId}`);
    },

    // Get connection stats
    getStats: () => {
      return {
        connectedClients: io.engine.clientsCount,
        rooms: Object.keys(io.sockets.adapter.rooms),
        timestamp: new Date().toISOString()
      };
    }
  };

  // Make broadcast functions available globally
  global.socketBroadcast = broadcast;

  // Periodic health check and stats logging
  setInterval(() => {
    const stats = broadcast.getStats();
    logger.info('WebSocket stats:', stats);
  }, 300000); // Every 5 minutes

  logger.info('WebSocket setup completed');
  return io;
};

module.exports = setupWebSocket;