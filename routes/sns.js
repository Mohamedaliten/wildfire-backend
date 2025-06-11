// routes/sns.js - SNS webhook endpoint for receiving notifications
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Middleware to parse raw body for SNS signature verification
const rawBodyParser = express.raw({ type: 'text/plain' });

// Also accept raw text body for SNS messages
router.post('/webhook', express.raw({ type: 'text/plain' }), express.json(), async (req, res) => {
  try {
    let snsMessage;
    
    // Handle different body formats
    if (Buffer.isBuffer(req.body)) {
      // Convert buffer to string and parse JSON
      const bodyString = req.body.toString('utf8');
      snsMessage = JSON.parse(bodyString);
      console.log('🔍 SNS Message received as Buffer, converted to:', JSON.stringify(snsMessage, null, 2));
    } else if (typeof req.body === 'string') {
      // Parse JSON string
      snsMessage = JSON.parse(req.body);
      console.log('🔍 SNS Message received as string, parsed to:', JSON.stringify(snsMessage, null, 2));
    } else {
      // Already an object
      snsMessage = req.body;
      console.log('🔍 SNS Message received as object:', JSON.stringify(snsMessage, null, 2));
    }
    
    logger.info('📨 Received SNS notification:', {
      type: req.headers['x-amz-sns-message-type'],
      topicArn: req.headers['x-amz-sns-topic-arn'],
      messageId: snsMessage.MessageId,
      timestamp: snsMessage.Timestamp
    });

    // Handle different SNS message types
    switch (req.headers['x-amz-sns-message-type']) {
      
      case 'SubscriptionConfirmation':
        logger.info('📋 SNS Subscription Confirmation received');
        
        // Check all possible fields for the subscribe URL
        const subscribeUrl = snsMessage.SubscribeURL || snsMessage.subscribeURL || snsMessage.SubscribeUrl;
        
        logger.info('Subscription URL:', subscribeUrl);
        console.log('\n🔗 SUBSCRIPTION CONFIRMATION URL:');
        console.log(subscribeUrl || 'URL NOT FOUND');
        console.log('\n');
        
        // Auto-confirm subscription if URL exists
        if (subscribeUrl) {
          try {
            const fetch = require('node-fetch');
            const response = await fetch(subscribeUrl);
            if (response.ok) {
              logger.info('✅ Auto-confirmed SNS subscription:', response.status);
              console.log('🎉 SNS subscription confirmed successfully!');
            } else {
              logger.error('❌ Confirmation request failed:', response.status);
            }
          } catch (error) {
            logger.error('❌ Failed to auto-confirm subscription:', error.message);
            console.log('⚠️ Please manually visit the URL above to confirm subscription');
          }
        } else {
          logger.warn('⚠️ No SubscribeURL found in confirmation message');
          console.log('📝 Available fields in message:');
          console.log(Object.keys(snsMessage));
        }
        break;
        
      case 'Notification':
        logger.info('🔔 SNS Notification received');
        
        // Parse the actual message content
        let messageData;
        try {
          messageData = JSON.parse(snsMessage.Message);
        } catch (error) {
          messageData = snsMessage.Message; // If it's not JSON, use as-is
        }
        
        console.log('\n📊 SNS MESSAGE DATA:');
        console.log('Subject:', snsMessage.Subject);
        console.log('Message:', messageData);
        console.log('Timestamp:', snsMessage.Timestamp);
        console.log('Topic ARN:', snsMessage.TopicArn);
        console.log('\n');
        
        // Process the notification based on subject/content
        await processNotification(snsMessage.Subject, messageData);
        break;
        
      case 'UnsubscribeConfirmation':
        logger.info('📤 SNS Unsubscribe Confirmation received');
        break;
        
      default:
        logger.warn('❓ Unknown SNS message type:', req.headers['x-amz-sns-message-type']);
    }
    
    // Always return 200 OK to acknowledge receipt
    res.status(200).json({
      success: true,
      message: 'SNS notification processed',
      messageId: snsMessage.MessageId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('❌ Error processing SNS notification:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Function to process different types of notifications
async function processNotification(subject, messageData) {
  try {
    logger.info(`🔄 Processing notification: ${subject}`);
    
    // Check if this is a fire emergency notification
    if (subject && subject.toLowerCase().includes('fire')) {
      logger.warn('🔥 FIRE-RELATED NOTIFICATION DETECTED!');
      
      // If messageData contains sensor data, check for emergency
      if (messageData && typeof messageData === 'object') {
        console.log('🔍 Checking emergency status in messageData:', messageData);
        
        const isEmergency = messageData.is_emergency || 
                           messageData.emergency ||  // Add this field
                           messageData.payload?.is_emergency || 
                           messageData.payload?.emergency ||  // And this one
                           false;
                           
        console.log('🔍 Emergency status check result:', isEmergency);
        console.log('🔍 messageData.is_emergency:', messageData.is_emergency);
        console.log('🔍 messageData.emergency:', messageData.emergency);
        console.log('🔍 messageData.payload?.is_emergency:', messageData.payload?.is_emergency);
        console.log('🔍 messageData.payload?.emergency:', messageData.payload?.emergency);
                           
        // Add fire alert processing to WebSocket broadcast
        if (isEmergency) {
          logger.error('🚨 EMERGENCY STATUS CONFIRMED IN MESSAGE DATA!');
          
          // Create fire alert data for frontend
          const fireAlertData = {
            type: 'FIRE_EMERGENCY',
            level: 'CRITICAL',
            title: '🚨 WILDFIRE EMERGENCY!',
            message: `Emergency detected by ${messageData.deviceId || messageData.device || 'Unknown Device'}!`,
            data: {
              deviceId: messageData.deviceId || messageData.device || 'Unknown Device',
              temperature: messageData.payload?.temperature || messageData.temperature || 0,
              humidity: messageData.payload?.humidity || messageData.humidity || 0,
              smoke_level: messageData.payload?.smoke_level || messageData.smoke_level || 0,
              air_quality: messageData.payload?.air_quality || messageData.air_quality || 0,
              location: {
                latitude: messageData.payload?.gps?.latitude || messageData.location?.latitude || messageData.gps?.latitude || 36.006397,
                longitude: messageData.payload?.gps?.longitude || messageData.location?.longitude || messageData.gps?.longitude || 10.1715
              },
              timestamp: messageData.timestamp || Date.now().toString(),
              alertTime: new Date().toISOString(),
              emergency: true,
              severity: messageData.severity || 'CRITICAL'
            },
            timestamp: new Date().toISOString(),
            urgent: true
          };
          
          // Broadcast to all connected clients via WebSocket
          if (global.io) {
            global.io.emit('fire-emergency', fireAlertData);
            logger.info('🔥 FIRE EMERGENCY BROADCASTED TO ALL CLIENTS');
            console.log('📡 Fire alert sent to frontend popup system!');
          } else {
            logger.warn('⚠️ WebSocket not available for broadcasting');
          }
          
          console.log('🔥 FIRE EMERGENCY DATA:');
          console.log(JSON.stringify(fireAlertData, null, 2));
        }
      }
    }
    
    // Log all received data for analysis
    logger.info('📝 Notification processed successfully');
    
  } catch (error) {
    logger.error('❌ Error in processNotification:', error);
  }
}

// Test endpoint to simulate SNS notification (for development)
router.post('/test', express.json(), async (req, res) => {
  try {
    logger.info('🧪 Test SNS notification received');
    
    const testMessage = req.body || {
      device: 'Node 1',
      payload: {
        temperature: 45.5,
        humidity: 30.2,
        smoke_level: 150,
        is_emergency: true,
        gps: {
          latitude: 36.006397,
          longitude: 10.1715
        }
      },
      fire_prediction_percentage: 85.5,
      timestamp: Math.floor(Date.now() / 1000)
    };
    
    await processNotification('Fire Alert Test', testMessage);
    
    res.json({
      success: true,
      message: 'Test notification processed',
      testData: testMessage
    });
    
  } catch (error) {
    logger.error('❌ Error in test endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get recent notifications (for debugging)
router.get('/recent', (req, res) => {
  // In a real implementation, this would fetch from database
  res.json({
    success: true,
    message: 'Recent notifications endpoint',
    notifications: [],
    timestamp: new Date().toISOString()
  });
});

// GET endpoint for testing webhook (for browser access)
router.get('/webhook', (req, res) => {
  res.json({
    success: true,
    message: 'SNS Webhook endpoint is active',
    endpoint: '/sns/webhook',
    method: 'POST',
    timestamp: new Date().toISOString(),
    note: 'This endpoint receives POST requests from AWS SNS'
  });
});

// GET endpoint for testing
router.get('/test', async (req, res) => {
  try {
    logger.info('🧪 GET Test SNS endpoint accessed');
    
    const testMessage = {
      device: 'Node 1',
      payload: {
        temperature: 45.5,
        humidity: 30.2,
        smoke_level: 150,
        is_emergency: true,
        gps: {
          latitude: 36.006397,
          longitude: 10.1715
        }
      },
      fire_prediction_percentage: 85.5,
      timestamp: Math.floor(Date.now() / 1000)
    };
    
    await processNotification('Fire Alert Test', testMessage);
    
    res.json({
      success: true,
      message: 'Test notification processed via GET',
      testData: testMessage,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('❌ Error in GET test endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
