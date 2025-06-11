# AWS SNS Configuration for Render Deployment

## 🎯 Overview
This guide covers setting up AWS SNS webhooks with your Render-deployed backend for real-time fire alerts in both Next.js and React Native apps.

## 📋 Prerequisites
- AWS Account with SNS access
- AWS CLI configured
- Your backend deployed on Render
- DynamoDB table with Lambda triggers (optional)

## 🔧 Step 1: Environment Variables for Render

Add these to your Render Dashboard → Environment:

```env
# SNS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:wildfire-alerts

# Webhook Configuration
WEBHOOK_SECRET=your_webhook_secret_key
ENABLE_SNS_AUTO_CONFIRM=true
SNS_SUBSCRIPTION_CONFIRMED=false
```

## 🚀 Step 2: Create SNS Topic

```bash
# Create the SNS topic
aws sns create-topic \
    --region us-east-1 \
    --name wildfire-emergency-alerts

# Example response:
# {
#     "TopicArn": "arn:aws:sns:us-east-1:123456789012:wildfire-emergency-alerts"
# }
```

## 📡 Step 3: Subscribe Your Render Backend

**Important:** Replace `your-backend-name.onrender.com` with your actual Render URL.

```bash
# Subscribe to SNS topic
aws sns subscribe \
    --region us-east-1 \
    --topic-arn "arn:aws:sns:us-east-1:123456789012:wildfire-emergency-alerts" \
    --protocol https \
    --notification-endpoint "https://your-backend-name.onrender.com/sns/webhook"

# Verify subscription
aws sns list-subscriptions-by-topic \
    --region us-east-1 \
    --topic-arn "arn:aws:sns:us-east-1:123456789012:wildfire-emergency-alerts"
```

## ✅ Step 4: Confirm Subscription

Your backend will automatically confirm the subscription. Check your Render logs for:

```
📋 SNS Subscription Confirmation received
🔗 SUBSCRIPTION CONFIRMATION URL: https://sns.us-east-1.amazonaws.com/...
✅ Auto-confirmed SNS subscription: 200
🎉 SNS subscription confirmed successfully!
```

## 🧪 Step 5: Test SNS Integration

### Test 1: Direct API Test
```bash
# Test your webhook endpoint directly
curl -X POST https://your-backend-name.onrender.com/sns/test \
  -H "Content-Type: application/json" \
  -d '{
    "device": "Test Node",
    "payload": {
      "temperature": 85.5,
      "humidity": 20.2,
      "smoke_level": 850,
      "is_emergency": true,
      "gps": {
        "latitude": 36.006397,
        "longitude": 10.1715
      }
    },
    "fire_prediction_percentage": 92.0,
    "timestamp": 1640995200
  }'
```

### Test 2: SNS Publish Test
```bash
# Test via AWS SNS
aws sns publish \
    --region us-east-1 \
    --topic-arn "arn:aws:sns:us-east-1:123456789012:wildfire-emergency-alerts" \
    --subject "Fire Emergency Alert" \
    --message '{
        "device": "Node 1",
        "payload": {
            "temperature": 88.5,
            "humidity": 18.2,
            "smoke_level": 920,
            "is_emergency": true,
            "gps": {
                "latitude": 36.006397,
                "longitude": 10.1715
            }
        },
        "fire_prediction_percentage": 95.0,
        "severity": "CRITICAL",
        "timestamp": 1640995200
    }'
```

## 🔥 Step 6: Lambda Integration (Optional)

If you have Lambda functions monitoring DynamoDB:

### Lambda Function Environment Variables:
```env
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:wildfire-emergency-alerts
EMERGENCY_THRESHOLD_TEMP=80
EMERGENCY_THRESHOLD_SMOKE=800
FIRE_PREDICTION_THRESHOLD=85
```

### Sample Lambda Code for Fire Detection:
```javascript
const AWS = require('aws-sdk');
const sns = new AWS.SNS();

exports.handler = async (event) => {
    for (const record of event.Records) {
        if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
            const newData = record.dynamodb.NewImage;
            
            // Extract sensor data
            const temperature = parseFloat(newData.temperature?.N || 0);
            const smokeLevel = parseFloat(newData.smoke_level?.N || 0);
            const firePrediction = parseFloat(newData.fire_prediction_percentage?.N || 0);
            
            // Check for emergency conditions
            const isEmergency = temperature > 80 || smokeLevel > 800 || firePrediction > 85;
            
            if (isEmergency) {
                const message = {
                    device: newData.deviceId?.S || 'Unknown',
                    payload: {
                        temperature: temperature,
                        humidity: parseFloat(newData.humidity?.N || 0),
                        smoke_level: smokeLevel,
                        air_quality: parseFloat(newData.air_quality?.N || 0),
                        is_emergency: true,
                        gps: {
                            latitude: parseFloat(newData.latitude?.N || 36.006397),
                            longitude: parseFloat(newData.longitude?.N || 10.1715)
                        }
                    },
                    fire_prediction_percentage: firePrediction,
                    severity: firePrediction > 90 ? 'CRITICAL' : 'HIGH',
                    timestamp: Math.floor(Date.now() / 1000)
                };
                
                await sns.publish({
                    TopicArn: process.env.SNS_TOPIC_ARN,
                    Subject: 'Fire Emergency Alert',
                    Message: JSON.stringify(message)
                }).promise();
                
                console.log('🔥 Emergency alert sent via SNS');
            }
        }
    }
};
```

## 📱 Step 7: Frontend Integration

### Next.js WebSocket Client:
```javascript
// lib/fireAlertSocket.js
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const useFireAlerts = () => {
  const [socket, setSocket] = useState(null);
  const [fireAlert, setFireAlert] = useState(null);

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL, {
      transports: ['websocket'],
      headers: {
        'X-Client-Type': 'nextjs'
      }
    });

    newSocket.on('fire-emergency', (alertData) => {
      console.log('🔥 Fire emergency received:', alertData);
      setFireAlert(alertData);
      
      // Auto-dismiss after 30 seconds
      setTimeout(() => setFireAlert(null), 30000);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  const dismissAlert = () => setFireAlert(null);

  return { fireAlert, dismissAlert };
};
```

### React Native WebSocket Client:
```javascript
// hooks/useFireAlerts.js
import { useState, useEffect } from 'react';
import io from 'socket.io-client';

export const useFireAlerts = () => {
  const [socket, setSocket] = useState(null);
  const [fireAlert, setFireAlert] = useState(null);

  useEffect(() => {
    const newSocket = io('https://your-backend-name.onrender.com', {
      transports: ['websocket'],
      headers: {
        'X-Client-Type': 'react-native'
      }
    });

    newSocket.on('fire-emergency', (alertData) => {
      console.log('🔥 Fire emergency received:', alertData);
      setFireAlert(alertData);
      
      // Play alert sound or vibration
      // Vibration.vibrate([500, 500, 500]);
      
      // Auto-dismiss after 30 seconds
      setTimeout(() => setFireAlert(null), 30000);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  const dismissAlert = () => setFireAlert(null);

  return { fireAlert, dismissAlert };
};
```

## 🔍 Step 8: Monitoring & Debugging

### Check SNS Subscription Status:
```bash
aws sns list-subscriptions --region us-east-1 | grep your-backend-name
```

### Monitor Render Logs:
```bash
# In Render Dashboard → Logs, look for:
📨 Received SNS notification
🔔 SNS Notification received
🔥 FIRE-RELATED NOTIFICATION DETECTED!
🚨 EMERGENCY STATUS CONFIRMED IN MESSAGE DATA!
📡 Fire alert sent to frontend popup system!
```

### Test WebSocket Connection:
```javascript
// Browser console test
const ws = new WebSocket('wss://your-backend-name.onrender.com');
ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => console.log('Message:', JSON.parse(event.data));
```

## 🚨 Emergency Response Flow

1. **Sensor Data** → DynamoDB
2. **Lambda Trigger** → Analyzes data
3. **Emergency Detected** → Publishes to SNS
4. **SNS Webhook** → Render backend
5. **WebSocket Broadcast** → All connected clients
6. **Fire Alert Popup** → Next.js & React Native apps

## ⚠️ Important Security Notes

1. **Never commit AWS credentials** to your repository
2. **Use IAM roles** with minimal required permissions
3. **Validate SNS signatures** in production (already implemented)
4. **Monitor SNS costs** - webhook calls count towards usage
5. **Set up CloudWatch alarms** for failed deliveries

## 📊 Troubleshooting

### Common Issues:

1. **Subscription not confirmed:**
   - Check Render logs for confirmation URL
   - Manually visit the URL if auto-confirmation fails

2. **No alerts received:**
   - Verify SNS topic ARN in environment variables
   - Check Lambda function is publishing to correct topic
   - Test with direct SNS publish command

3. **WebSocket not connecting:**
   - Verify WSS (not WS) in production
   - Check CORS configuration
   - Monitor connection in browser dev tools

4. **Alerts not showing in frontend:**
   - Check browser console for WebSocket messages
   - Verify fire alert popup component is properly integrated
   - Test with manual WebSocket message

Your SNS integration is now ready for production fire alerts! 🚨🔥
