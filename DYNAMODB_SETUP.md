# DynamoDB Setup for Wildfire Monitoring System

## 🎯 Overview
Complete DynamoDB configuration for storing sensor data and triggering fire alerts via Lambda functions.

## 📋 Table Structure

### Primary Table: `wildfire-sensor-data`

```json
{
    "TableName": "wildfire-sensor-data",
    "KeySchema": [
        {
            "AttributeName": "deviceId",
            "KeyType": "HASH"
        },
        {
            "AttributeName": "timestamp",
            "KeyType": "RANGE"
        }
    ],
    "AttributeDefinitions": [
        {
            "AttributeName": "deviceId",
            "AttributeType": "S"
        },
        {
            "AttributeName": "timestamp",
            "AttributeType": "N"
        }
    ],
    "BillingMode": "PAY_PER_REQUEST",
    "StreamSpecification": {
        "StreamEnabled": true,
        "StreamViewType": "NEW_AND_OLD_IMAGES"
    }
}
```

## 🚀 Create Table with AWS CLI

```bash
# Create the main sensor data table
aws dynamodb create-table \
    --table-name wildfire-sensor-data \
    --attribute-definitions \
        AttributeName=deviceId,AttributeType=S \
        AttributeName=timestamp,AttributeType=N \
    --key-schema \
        AttributeName=deviceId,KeyType=HASH \
        AttributeName=timestamp,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
    --region us-east-1

# Wait for table to be created
aws dynamodb wait table-exists --table-name wildfire-sensor-data --region us-east-1

# Verify table creation
aws dynamodb describe-table --table-name wildfire-sensor-data --region us-east-1
```

## 📊 Sample Data Structure

```json
{
    "deviceId": "Node-1",
    "timestamp": 1640995200,
    "temperature": 85.5,
    "humidity": 22.3,
    "smoke_level": 850,
    "air_quality": 180,
    "fire_prediction_percentage": 88.5,
    "latitude": 36.006397,
    "longitude": 10.1715,
    "battery_level": 85,
    "signal_strength": -67,
    "data_quality": "GOOD",
    "last_calibration": 1640908800,
    "device_status": "ACTIVE",
    "emergency_status": false
}
```

## 🔧 Environment Variables for Backend

Update your `.env.render` file:

```env
# DynamoDB Configuration
DYNAMODB_TABLE_NAME=wildfire-sensor-data
DYNAMODB_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Table Settings
DYNAMODB_READ_CAPACITY=5
DYNAMODB_WRITE_CAPACITY=5
ENABLE_DYNAMODB_STREAMS=true
```

## 🧪 Test Data Insertion

### Method 1: AWS CLI
```bash
# Insert test data that should trigger emergency
aws dynamodb put-item \
    --table-name wildfire-sensor-data \
    --item '{
        "deviceId": {"S": "Node-1"},
        "timestamp": {"N": "1640995200"},
        "temperature": {"N": "95.5"},
        "humidity": {"N": "15.2"},
        "smoke_level": {"N": "950"},
        "air_quality": {"N": "220"},
        "fire_prediction_percentage": {"N": "92.5"},
        "latitude": {"N": "36.006397"},
        "longitude": {"N": "10.1715"},
        "emergency_status": {"BOOL": true},
        "device_status": {"S": "ACTIVE"},
        "data_quality": {"S": "EMERGENCY"}
    }' \
    --region us-east-1

# Insert normal data (should not trigger emergency)
aws dynamodb put-item \
    --table-name wildfire-sensor-data \
    --item '{
        "deviceId": {"S": "Node-2"},
        "timestamp": {"N": "1640995260"},
        "temperature": {"N": "25.5"},
        "humidity": {"N": "65.2"},
        "smoke_level": {"N": "50"},
        "air_quality": {"N": "85"},
        "fire_prediction_percentage": {"N": "12.5"},
        "latitude": {"N": "36.006397"},
        "longitude": {"N": "10.1715"},
        "emergency_status": {"BOOL": false},
        "device_status": {"S": "ACTIVE"},
        "data_quality": {"S": "GOOD"}
    }' \
    --region us-east-1
```

### Method 2: Node.js Script
```javascript
// test-dynamodb-insert.js
const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
    region: 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const tableName = 'wildfire-sensor-data';

// Emergency test data
const emergencyData = {
    deviceId: 'Node-1',
    timestamp: Math.floor(Date.now() / 1000),
    temperature: 95.5,
    humidity: 15.2,
    smoke_level: 950,
    air_quality: 220,
    fire_prediction_percentage: 92.5,
    latitude: 36.006397,
    longitude: 10.1715,
    battery_level: 78,
    signal_strength: -65,
    emergency_status: true,
    device_status: 'EMERGENCY',
    data_quality: 'CRITICAL',
    alert_triggered: true,
    last_calibration: Math.floor(Date.now() / 1000) - 86400
};

// Normal test data
const normalData = {
    deviceId: 'Node-2',
    timestamp: Math.floor(Date.now() / 1000) + 60,
    temperature: 28.5,
    humidity: 62.8,
    smoke_level: 45,
    air_quality: 78,
    fire_prediction_percentage: 8.2,
    latitude: 36.007234,
    longitude: 10.172456,
    battery_level: 92,
    signal_strength: -58,
    emergency_status: false,
    device_status: 'ACTIVE',
    data_quality: 'GOOD',
    alert_triggered: false,
    last_calibration: Math.floor(Date.now() / 1000) - 43200
};

async function insertTestData() {
    try {
        console.log('🔥 Inserting EMERGENCY data (should trigger alert)...');
        
        const emergencyParams = {
            TableName: tableName,
            Item: emergencyData
        };
        
        await dynamodb.put(emergencyParams).promise();
        console.log('✅ Emergency data inserted successfully');
        console.log('📊 Data:', JSON.stringify(emergencyData, null, 2));
        
        // Wait 5 seconds before inserting normal data
        setTimeout(async () => {
            console.log('\\n📊 Inserting NORMAL data (should not trigger alert)...');
            
            const normalParams = {
                TableName: tableName,
                Item: normalData
            };
            
            await dynamodb.put(normalParams).promise();
            console.log('✅ Normal data inserted successfully');
            console.log('📊 Data:', JSON.stringify(normalData, null, 2));
            
            console.log('\\n🎯 Check your Render logs and frontend for fire alerts!');
            console.log('🔍 Monitor Lambda logs in CloudWatch');
            console.log('📱 Fire alert should appear in your Next.js and React Native apps');
            
        }, 5000);
        
    } catch (error) {
        console.error('❌ Error inserting test data:', error);
    }
}

// Run the test
insertTestData();
```

### Method 3: Backend API Test Script
```javascript
// test-backend-insert.js
const fetch = require('node-fetch');

const BACKEND_URL = 'https://your-backend-name.onrender.com';

async function testBackendInsert() {
    const emergencyData = {
        deviceId: 'Node-Test-1',
        temperature: 98.5,
        humidity: 12.8,
        smoke_level: 1200,
        air_quality: 280,
        fire_prediction_percentage: 96.5,
        latitude: 36.006397,
        longitude: 10.1715,
        emergency_status: true
    };
    
    try {
        console.log('🔥 Testing backend data insertion...');
        
        const response = await fetch(`${BACKEND_URL}/api/device/data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Client-Type': 'test'
            },
            body: JSON.stringify(emergencyData)
        });
        
        const result = await response.json();
        console.log('✅ Backend response:', result);
        
    } catch (error) {
        console.error('❌ Error testing backend:', error);
    }
}

testBackendInsert();
```

## 📈 Global Secondary Indexes (Optional)

### 1. Device Status Index
```bash
aws dynamodb update-table \
    --table-name wildfire-sensor-data \
    --attribute-definitions \
        AttributeName=device_status,AttributeType=S \
        AttributeName=timestamp,AttributeType=N \
    --global-secondary-index-updates \
        '[{
            "Create": {
                "IndexName": "DeviceStatusIndex",
                "KeySchema": [
                    {"AttributeName": "device_status", "KeyType": "HASH"},
                    {"AttributeName": "timestamp", "KeyType": "RANGE"}
                ],
                "Projection": {"ProjectionType": "ALL"},
                "BillingMode": "PAY_PER_REQUEST"
            }
        }]'
```

### 2. Emergency Status Index
```bash
aws dynamodb update-table \
    --table-name wildfire-sensor-data \
    --attribute-definitions \
        AttributeName=emergency_status,AttributeType=S \
        AttributeName=timestamp,AttributeType=N \
    --global-secondary-index-updates \
        '[{
            "Create": {
                "IndexName": "EmergencyStatusIndex",
                "KeySchema": [
                    {"AttributeName": "emergency_status", "KeyType": "HASH"},
                    {"AttributeName": "timestamp", "KeyType": "RANGE"}
                ],
                "Projection": {"ProjectionType": "ALL"},
                "BillingMode": "PAY_PER_REQUEST"
            }
        }]'
```

## 🔍 Query Examples

### Get Latest Data for Device
```bash
aws dynamodb query \
    --table-name wildfire-sensor-data \
    --key-condition-expression "deviceId = :deviceId" \
    --expression-attribute-values '{":deviceId": {"S": "Node-1"}}' \
    --scan-index-forward false \
    --limit 10 \
    --region us-east-1
```

### Get Emergency Data
```bash
aws dynamodb scan \
    --table-name wildfire-sensor-data \
    --filter-expression "emergency_status = :emergency" \
    --expression-attribute-values '{":emergency": {"BOOL": true}}' \
    --region us-east-1
```

### Get Recent Data (Last Hour)
```bash
TIMESTAMP_HOUR_AGO=$(date -d '1 hour ago' +%s)

aws dynamodb scan \
    --table-name wildfire-sensor-data \
    --filter-expression "#ts > :timestamp" \
    --expression-attribute-names '{"#ts": "timestamp"}' \
    --expression-attribute-values "{\":timestamp\": {\"N\": \"$TIMESTAMP_HOUR_AGO\"}}" \
    --region us-east-1
```

## 📊 Monitoring & Metrics

### CloudWatch Metrics to Monitor:
- `ConsumedReadCapacityUnits`
- `ConsumedWriteCapacityUnits`
- `SuccessfulRequestLatency`
- `ThrottledRequests`
- `StreamRecords` (for Lambda triggers)

### Set Up CloudWatch Alarms:
```bash
# High write capacity alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "DynamoDB-HighWriteCapacity" \
    --alarm-description "High write capacity on wildfire table" \
    --metric-name ConsumedWriteCapacityUnits \
    --namespace AWS/DynamoDB \
    --statistic Sum \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=TableName,Value=wildfire-sensor-data \
    --evaluation-periods 2

# Emergency data alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "DynamoDB-EmergencyDataInserted" \
    --alarm-description "Emergency data inserted into wildfire table" \
    --metric-name ItemCount \
    --namespace AWS/DynamoDB \
    --statistic Maximum \
    --period 60 \
    --threshold 1 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=TableName,Value=wildfire-sensor-data
```

## 🔧 Backup Configuration

### Enable Point-in-Time Recovery:
```bash
aws dynamodb put-backup-policy \
    --table-name wildfire-sensor-data \
    --backup-policy PointInTimeRecoveryEnabled=true \
    --region us-east-1
```

### Create Manual Backup:
```bash
aws dynamodb create-backup \
    --table-name wildfire-sensor-data \
    --backup-name "wildfire-sensor-data-backup-$(date +%Y%m%d)" \
    --region us-east-1
```

## 🧪 Complete Testing Workflow

### 1. Create Test Script:
```bash
# Save as test-complete-flow.sh
#!/bin/bash

echo "🚀 Starting complete wildfire system test..."

# Insert emergency data
echo "🔥 Inserting emergency data..."
aws dynamodb put-item \
    --table-name wildfire-sensor-data \
    --item '{
        "deviceId": {"S": "Test-Emergency-Node"},
        "timestamp": {"N": "'$(date +%s)'"},
        "temperature": {"N": "105.5"},
        "humidity": {"N": "8.2"},
        "smoke_level": {"N": "1500"},
        "air_quality": {"N": "350"},
        "fire_prediction_percentage": {"N": "98.5"},
        "latitude": {"N": "36.006397"},
        "longitude": {"N": "10.1715"},
        "emergency_status": {"BOOL": true},
        "device_status": {"S": "EMERGENCY"}
    }' \
    --region us-east-1

echo "✅ Emergency data inserted"
echo "🔍 Check the following:"
echo "   1. Lambda logs in CloudWatch"
echo "   2. SNS message delivery"
echo "   3. Render backend logs"
echo "   4. WebSocket messages in frontend"
echo "   5. Fire alert popup in apps"

echo ""
echo "📱 Expected flow:"
echo "   DynamoDB → Lambda → SNS → Render → WebSocket → Frontend Alert"
```

### 2. Make executable and run:
```bash
chmod +x test-complete-flow.sh
./test-complete-flow.sh
```

## 📋 Troubleshooting Checklist

### DynamoDB Issues:
- [ ] Table exists and is ACTIVE
- [ ] Streams are enabled
- [ ] IAM permissions for Lambda
- [ ] Correct region configuration

### Lambda Integration:
- [ ] Event source mapping created
- [ ] Lambda function has DynamoDB permissions
- [ ] Environment variables set correctly
- [ ] CloudWatch logs showing triggers

### SNS Integration:
- [ ] Topic exists and is accessible
- [ ] Lambda has SNS publish permissions
- [ ] Webhook subscription confirmed
- [ ] Message format is correct

### Backend Integration:
- [ ] SNS webhook endpoint responding
- [ ] WebSocket broadcasting working
- [ ] Frontend clients connected
- [ ] Fire alert popup configured

Your DynamoDB setup is now complete and ready for production fire monitoring! 🔥📊
