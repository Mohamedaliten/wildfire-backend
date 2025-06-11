const express = require('express');
const fetch = require('node-fetch');
const logger = require('../utils/logger');
const router = express.Router();

// Test endpoint to verify webhook setup
router.get('/test', (req, res) => {
    res.json({
        message: 'Fire Alert Webhook endpoint is working',
        timestamp: new Date().toISOString(),
        websocketAvailable: !!global.io,
        connectedClients: global.io ? global.io.engine.clientsCount : 0
    });
});

// SNS webhook endpoint for fire alerts (main endpoint for AWS Lambda)
router.post('/fire-alert', express.raw({ type: 'text/plain' }), async (req, res) => {
    try {
        let body;
        
        // Handle different content types from SNS
        if (req.headers['content-type'] && req.headers['content-type'].includes('text/plain')) {
            body = req.body.toString();
        } else {
            body = req.body;
        }
        
        const message = JSON.parse(body);
        logger.info('📨 SNS message received:', message.Type);
        
        // Handle SNS subscription confirmation
        if (message.Type === 'SubscriptionConfirmation') {
            logger.info('🔔 SNS Subscription confirmation received');
            logger.info('Confirmation URL:', message.SubscribeURL);
            
            try {
                // Auto-confirm the subscription
                const response = await fetch(message.SubscribeURL);
                logger.info('✅ SNS Subscription confirmed automatically');
                console.log('🎉 SNS subscription is now active and ready to receive fire alerts!');
            } catch (error) {
                logger.error('❌ Failed to auto-confirm SNS subscription:', error.message);
                console.log('\n🔗 MANUALLY VISIT THIS URL TO CONFIRM SUBSCRIPTION:');
                console.log(message.SubscribeURL);
                console.log('\n');
            }
            
            return res.status(200).send('SNS Subscription processed');
        }
        
        // Handle actual fire alert notification from Lambda
        if (message.Type === 'Notification') {
            const alertData = JSON.parse(message.Message);
            
            logger.warn('🚨 FIRE EMERGENCY ALERT RECEIVED FROM AWS LAMBDA');
            console.log('🔥 Emergency Details:', {
                device: alertData.deviceId,
                temperature: alertData.temperature + '°C',
                humidity: alertData.humidity + '%',
                smoke: alertData.smoke_level,
                air_quality: alertData.air_quality,
                location: `${alertData.location.latitude}, ${alertData.location.longitude}`,
                alertTime: alertData.alertTime
            });
            
            // Create comprehensive emergency broadcast
            const emergencyBroadcast = {
                type: 'FIRE_EMERGENCY',
                level: 'CRITICAL',
                title: '🚨 WILDFIRE EMERGENCY DETECTED!',
                message: `Fire emergency detected by ${alertData.deviceId}`,
                data: {
                    deviceId: alertData.deviceId,
                    temperature: alertData.temperature,
                    humidity: alertData.humidity,
                    smoke_level: alertData.smoke_level,
                    air_quality: alertData.air_quality,
                    location: {
                        latitude: alertData.location.latitude,
                        longitude: alertData.location.longitude
                    },
                    timestamp: alertData.timestamp,
                    alertTime: alertData.alertTime,
                    emergency: true,
                    severity: alertData.severity || 'CRITICAL'
                },
                ui: {
                    showPopup: true,
                    autoExpire: false,
                    sound: true,
                    vibrate: true,
                    priority: 'HIGH'
                },
                timestamp: new Date().toISOString()
            };
            
            // Broadcast emergency to all connected clients
            if (global.io) {
                // Broadcast to all clients
                global.io.emit('fire-emergency', emergencyBroadcast);
                
                // Broadcast to device-specific subscribers
                global.io.to(`device-${alertData.deviceId}`).emit('device-emergency', emergencyBroadcast);
                
                // Broadcast to dashboard/analytics/map pages specifically
                global.io.emit('emergency-popup', emergencyBroadcast);
                
                const connectedClients = global.io.engine.clientsCount;
                logger.info(`✅ FIRE EMERGENCY broadcasted to ${connectedClients} connected clients`);
                console.log('📡 Emergency alert sent to all connected dashboards, analytics, and map views');
            } else {
                logger.error('❌ WebSocket not available! Cannot broadcast emergency alert!');
            }
            
            // Log emergency for monitoring
            logger.error('🚨 FIRE EMERGENCY PROCESSED:', {
                deviceId: alertData.deviceId,
                location: alertData.location,
                temperature: alertData.temperature,
                alertTime: alertData.alertTime,
                broadcastClients: global.io ? global.io.engine.clientsCount : 0
            });
        }
        
        res.status(200).send('OK');
    } catch (error) {
        logger.error('❌ Error processing fire alert webhook:', error);
        res.status(500).json({ error: 'Failed to process fire alert' });
    }
});

// Test endpoint to simulate fire emergency (for testing without AWS)
router.post('/test-emergency', express.json(), (req, res) => {
    try {
        logger.info('🧪 Testing fire emergency simulation');
        
        const testEmergencyData = req.body || {
            deviceId: 'Test-Node-Emergency',
            temperature: 65.8,
            humidity: 15.2,
            smoke_level: 350,
            air_quality: 280,
            location: {
                latitude: 36.006397,
                longitude: 10.1715
            },
            timestamp: Date.now().toString(),
            alertTime: new Date().toISOString(),
            severity: 'CRITICAL'
        };
        
        const emergencyBroadcast = {
            type: 'FIRE_EMERGENCY',
            level: 'CRITICAL',
            title: '🚨 TEST FIRE EMERGENCY!',
            message: `TEST: Fire emergency detected by ${testEmergencyData.deviceId}`,
            data: testEmergencyData,
            ui: {
                showPopup: true,
                autoExpire: false,
                sound: true,
                vibrate: true,
                priority: 'HIGH'
            },
            timestamp: new Date().toISOString(),
            isTest: true
        };
        
        if (global.io) {
            global.io.emit('fire-emergency', emergencyBroadcast);
            global.io.emit('emergency-popup', emergencyBroadcast);
            
            const connectedClients = global.io.engine.clientsCount;
            logger.info(`✅ TEST emergency broadcasted to ${connectedClients} clients`);
        }
        
        res.json({
            success: true,
            message: 'Test emergency sent',
            data: testEmergencyData,
            connectedClients: global.io ? global.io.engine.clientsCount : 0
        });
        
    } catch (error) {
        logger.error('❌ Error in test emergency:', error);
        res.status(500).json({ error: 'Failed to send test emergency' });
    }
});

module.exports = router;