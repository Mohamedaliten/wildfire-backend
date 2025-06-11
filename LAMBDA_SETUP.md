# Lambda Function for DynamoDB → SNS Integration

## 🎯 Purpose
This Lambda function monitors your DynamoDB table for new sensor data and automatically sends fire alerts via SNS when emergency conditions are detected.

## 📋 Prerequisites
- DynamoDB table with sensor data
- SNS topic created
- Lambda execution role with permissions

## 🔧 Lambda Function Code

```javascript
const AWS = require('aws-sdk');
const sns = new AWS.SNS({ region: process.env.AWS_REGION });

// Emergency thresholds
const EMERGENCY_THRESHOLDS = {
    TEMPERATURE: parseInt(process.env.EMERGENCY_THRESHOLD_TEMP) || 80,
    SMOKE_LEVEL: parseInt(process.env.EMERGENCY_THRESHOLD_SMOKE) || 800,
    FIRE_PREDICTION: parseInt(process.env.FIRE_PREDICTION_THRESHOLD) || 85,
    AIR_QUALITY: parseInt(process.env.EMERGENCY_THRESHOLD_AQI) || 200
};

exports.handler = async (event) => {
    console.log('🔍 Lambda triggered with', event.Records.length, 'records');
    
    for (const record of event.Records) {
        console.log('📊 Processing record:', record.eventName);
        
        // Only process INSERT and MODIFY events
        if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
            await processRecord(record);
        }
    }
    
    return { statusCode: 200, body: 'Processing completed' };
};

async function processRecord(record) {
    try {
        const newData = record.dynamodb.NewImage;
        console.log('📡 New sensor data:', JSON.stringify(newData, null, 2));
        
        // Extract sensor readings
        const sensorData = {
            deviceId: newData.deviceId?.S || newData.device?.S || 'Unknown',
            temperature: parseFloat(newData.temperature?.N || 0),
            humidity: parseFloat(newData.humidity?.N || 0),
            smoke_level: parseFloat(newData.smoke_level?.N || 0),
            air_quality: parseFloat(newData.air_quality?.N || 0),
            fire_prediction_percentage: parseFloat(newData.fire_prediction_percentage?.N || 0),
            timestamp: newData.timestamp?.N || Math.floor(Date.now() / 1000),
            latitude: parseFloat(newData.latitude?.N || 36.006397),
            longitude: parseFloat(newData.longitude?.N || 10.1715)
        };
        
        console.log('🔍 Extracted sensor data:', sensorData);
        
        // Check for emergency conditions
        const emergencyChecks = {
            temperature: sensorData.temperature > EMERGENCY_THRESHOLDS.TEMPERATURE,
            smoke: sensorData.smoke_level > EMERGENCY_THRESHOLDS.SMOKE_LEVEL,
            firePrediction: sensorData.fire_prediction_percentage > EMERGENCY_THRESHOLDS.FIRE_PREDICTION,
            airQuality: sensorData.air_quality > EMERGENCY_THRESHOLDS.AIR_QUALITY
        };
        
        const isEmergency = Object.values(emergencyChecks).some(check => check);
        
        console.log('⚠️ Emergency checks:', emergencyChecks);
        console.log('🚨 Emergency status:', isEmergency);
        
        if (isEmergency) {
            await sendFireAlert(sensorData, emergencyChecks);
        } else {
            console.log('✅ Normal conditions - no alert needed');
        }
        
    } catch (error) {
        console.error('❌ Error processing record:', error);
        throw error;
    }
}

async function sendFireAlert(sensorData, emergencyChecks) {
    try {
        console.log('🔥 FIRE EMERGENCY DETECTED! Sending SNS alert...');
        
        // Determine severity level
        const severity = determineSeverity(sensorData, emergencyChecks);
        
        // Create alert message
        const alertMessage = {
            device: sensorData.deviceId,
            payload: {
                temperature: sensorData.temperature,
                humidity: sensorData.humidity,
                smoke_level: sensorData.smoke_level,
                air_quality: sensorData.air_quality,
                is_emergency: true,
                emergency: true, // Add both fields for compatibility
                gps: {
                    latitude: sensorData.latitude,
                    longitude: sensorData.longitude
                }
            },
            fire_prediction_percentage: sensorData.fire_prediction_percentage,
            severity: severity,
            emergency_triggers: emergencyChecks,
            timestamp: sensorData.timestamp,
            alert_id: generateAlertId(),
            location_name: await getLocationName(sensorData.latitude, sensorData.longitude)
        };
        
        // Send to SNS
        const snsParams = {
            TopicArn: process.env.SNS_TOPIC_ARN,
            Subject: `🔥 FIRE EMERGENCY - ${severity} - ${sensorData.deviceId}`,
            Message: JSON.stringify(alertMessage),
            MessageAttributes: {
                'alert_type': {
                    DataType: 'String',
                    StringValue: 'FIRE_EMERGENCY'
                },
                'severity': {
                    DataType: 'String',
                    StringValue: severity
                },
                'device_id': {
                    DataType: 'String',
                    StringValue: sensorData.deviceId
                }
            }
        };
        
        console.log('📤 Sending SNS message:', JSON.stringify(snsParams, null, 2));
        
        const result = await sns.publish(snsParams).promise();
        
        console.log('✅ SNS message sent successfully:', result.MessageId);
        console.log('🎯 Alert sent to webhook:', process.env.WEBHOOK_URL || 'Not configured');
        
        return result;
        
    } catch (error) {
        console.error('❌ Error sending fire alert:', error);
        throw error;
    }
}

function determineSeverity(sensorData, emergencyChecks) {
    let severityScore = 0;
    
    // Temperature scoring
    if (sensorData.temperature > 100) severityScore += 3;
    else if (sensorData.temperature > 90) severityScore += 2;
    else if (emergencyChecks.temperature) severityScore += 1;
    
    // Smoke level scoring
    if (sensorData.smoke_level > 1000) severityScore += 3;
    else if (sensorData.smoke_level > 900) severityScore += 2;
    else if (emergencyChecks.smoke) severityScore += 1;
    
    // Fire prediction scoring
    if (sensorData.fire_prediction_percentage > 95) severityScore += 3;
    else if (sensorData.fire_prediction_percentage > 90) severityScore += 2;
    else if (emergencyChecks.firePrediction) severityScore += 1;
    
    // Air quality scoring
    if (emergencyChecks.airQuality) severityScore += 1;
    
    // Determine severity level
    if (severityScore >= 6) return 'CRITICAL';
    if (severityScore >= 4) return 'HIGH';
    if (severityScore >= 2) return 'MEDIUM';
    return 'LOW';
}

function generateAlertId() {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 6);
    return `FIRE_${timestamp}_${randomSuffix}`;
}

async function getLocationName(latitude, longitude) {
    // Simple location naming - you could enhance this with reverse geocoding
    const regions = [
        { name: 'Sfax Industrial Zone', lat: 34.74, lng: 10.76, radius: 0.1 },
        { name: 'Sfax City Center', lat: 34.74, lng: 10.76, radius: 0.05 },
        { name: 'Monastir Region', lat: 35.77, lng: 10.83, radius: 0.2 },
        { name: 'Sousse Coastal Area', lat: 35.83, lng: 10.64, radius: 0.2 }
    ];
    
    for (const region of regions) {
        const distance = Math.sqrt(
            Math.pow(latitude - region.lat, 2) + 
            Math.pow(longitude - region.lng, 2)
        );
        
        if (distance <= region.radius) {
            return region.name;
        }
    }
    
    return `Location ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}
```

## 🔧 Environment Variables for Lambda

Set these in your Lambda function configuration:

```env
# SNS Configuration
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:wildfire-emergency-alerts
AWS_REGION=us-east-1

# Emergency Thresholds
EMERGENCY_THRESHOLD_TEMP=80
EMERGENCY_THRESHOLD_SMOKE=800
FIRE_PREDICTION_THRESHOLD=85
EMERGENCY_THRESHOLD_AQI=200

# Optional
WEBHOOK_URL=https://your-backend-name.onrender.com/sns/webhook
LOG_LEVEL=INFO
```

## 🔑 IAM Role Permissions

Create an IAM role with these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:*:*:*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:DescribeStream",
                "dynamodb:GetRecords",
                "dynamodb:GetShardIterator",
                "dynamodb:ListStreams"
            ],
            "Resource": "arn:aws:dynamodb:us-east-1:*:table/your-table-name/stream/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "sns:Publish"
            ],
            "Resource": "arn:aws:sns:us-east-1:*:wildfire-emergency-alerts"
        }
    ]
}
```

## 🚀 Deployment Steps

### 1. Create Lambda Function:
```bash
# Create deployment package
zip lambda-function.zip index.js

# Create Lambda function
aws lambda create-function \
    --function-name wildfire-emergency-detector \
    --runtime nodejs18.x \
    --role arn:aws:iam::123456789012:role/lambda-execution-role \
    --handler index.handler \
    --zip-file fileb://lambda-function.zip \
    --timeout 30 \
    --memory-size 256
```

### 2. Configure DynamoDB Trigger:
```bash
# Add DynamoDB stream as event source
aws lambda create-event-source-mapping \
    --function-name wildfire-emergency-detector \
    --event-source-arn arn:aws:dynamodb:us-east-1:123456789012:table/your-table-name/stream/2023-01-01T00:00:00.000 \
    --starting-position LATEST \
    --batch-size 10
```

### 3. Set Environment Variables:
```bash
aws lambda update-function-configuration \
    --function-name wildfire-emergency-detector \
    --environment Variables='{
        "SNS_TOPIC_ARN":"arn:aws:sns:us-east-1:123456789012:wildfire-emergency-alerts",
        "EMERGENCY_THRESHOLD_TEMP":"80",
        "EMERGENCY_THRESHOLD_SMOKE":"800",
        "FIRE_PREDICTION_THRESHOLD":"85",
        "AWS_REGION":"us-east-1"
    }'
```

## 🧪 Testing the Lambda Function

### Test with Sample DynamoDB Event:
```javascript
// test-event.json
{
    "Records": [
        {
            "eventID": "test-event-1",
            "eventName": "INSERT",
            "eventVersion": "1.1",
            "eventSource": "aws:dynamodb",
            "dynamodb": {
                "NewImage": {
                    "deviceId": {"S": "Node-1"},
                    "temperature": {"N": "95.5"},
                    "humidity": {"N": "15.2"},
                    "smoke_level": {"N": "950"},
                    "air_quality": {"N": "180"},
                    "fire_prediction_percentage": {"N": "92.5"},
                    "timestamp": {"N": "1640995200"},
                    "latitude": {"N": "36.006397"},
                    "longitude": {"N": "10.1715"}
                }
            }
        }
    ]
}
```

```bash
# Test the function
aws lambda invoke \
    --function-name wildfire-emergency-detector \
    --payload file://test-event.json \
    --cli-binary-format raw-in-base64-out \
    response.json
```

## 📊 Monitoring & Logs

### CloudWatch Logs:
```bash
# View logs
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/wildfire-emergency-detector

# Stream logs
aws logs tail /aws/lambda/wildfire-emergency-detector --follow
```

### Expected Log Output:
```
🔍 Lambda triggered with 1 records
📊 Processing record: INSERT
📡 New sensor data: {...}
🔍 Extracted sensor data: {...}
⚠️ Emergency checks: {...}
🚨 Emergency status: true
🔥 FIRE EMERGENCY DETECTED! Sending SNS alert...
📤 Sending SNS message: {...}
✅ SNS message sent successfully: 12345678-1234-1234-1234-123456789012
```

## 🔄 Integration Flow

1. **Sensor** → DynamoDB table
2. **DynamoDB Stream** → Lambda trigger
3. **Lambda** → Analyzes data against thresholds
4. **Emergency Detected** → SNS publish
5. **SNS** → Webhook to Render backend
6. **Render Backend** → WebSocket broadcast
7. **Frontend Apps** → Fire alert popup

Your Lambda function is now ready to automatically detect fire emergencies and trigger real-time alerts! 🔥🚨
