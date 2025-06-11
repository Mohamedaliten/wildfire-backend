# Quick AWS Setup for Render Deployment

## 🚀 Simple 5-Step Setup

### Step 1: Create DynamoDB Table
```bash
aws dynamodb create-table \
    --table-name wildfire-sensor-data \
    --attribute-definitions AttributeName=deviceId,AttributeType=S AttributeName=timestamp,AttributeType=N \
    --key-schema AttributeName=deviceId,KeyType=HASH AttributeName=timestamp,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES
```

### Step 2: Create SNS Topic
```bash
aws sns create-topic --name wildfire-emergency-alerts
```

### Step 3: Subscribe Your Render Backend
```bash
# Replace YOUR-RENDER-URL with your actual URL
aws sns subscribe \
    --topic-arn "arn:aws:sns:us-east-1:YOUR-ACCOUNT:wildfire-emergency-alerts" \
    --protocol https \
    --notification-endpoint "https://YOUR-RENDER-URL.onrender.com/sns/webhook"
```

### Step 4: Set Environment Variables in Render
```env
DYNAMODB_TABLE_NAME=wildfire-sensor-data
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:YOUR-ACCOUNT:wildfire-emergency-alerts
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
```

### Step 5: Test the System
```bash
# Insert test emergency data
aws dynamodb put-item \
    --table-name wildfire-sensor-data \
    --item '{
        "deviceId": {"S": "Test-Node"},
        "timestamp": {"N": "'$(date +%s)'"},
        "temperature": {"N": "95"},
        "smoke_level": {"N": "900"},
        "fire_prediction_percentage": {"N": "90"},
        "emergency_status": {"BOOL": true}
    }'
```

## 🔥 Expected Flow
DynamoDB → SNS → Render Backend → WebSocket → Fire Alert Popup

## ✅ Check Results
1. Render logs show SNS message received
2. WebSocket broadcasts fire alert
3. Frontend shows fire alert popup
4. Both Next.js and React Native apps get alerts

That's it! Your system is ready for real-time fire alerts! 🚨
