# Setup for YOUR Existing AWS Resources

## ✅ What You Already Have
- **DynamoDB Table**: `IoTFireProcessedData` 
- **AWS Credentials**: Working
- **Device Data**: Real sensor readings

## 🚀 What You Need to Create

### 1. Get Your AWS Account ID
```bash
aws sts get-caller-identity --query Account --output text
```

### 2. Create SNS Topic
```bash
aws sns create-topic --name wildfire-emergency-alerts --region us-east-1
```

### 3. After Render Deployment - Subscribe SNS
```bash
# Replace YOUR-ACCOUNT-ID and YOUR-RENDER-URL
aws sns subscribe \
    --topic-arn "arn:aws:sns:us-east-1:YOUR-ACCOUNT-ID:wildfire-emergency-alerts" \
    --protocol https \
    --notification-endpoint "https://YOUR-RENDER-URL.onrender.com/sns/webhook"
```

## 🔧 Render Environment Variables

Use your **existing table** `IoTFireProcessedData`:
```env
DYNAMODB_TABLE_NAME=IoTFireProcessedData
AWS_ACCESS_KEY_ID=AKIAUQPN2QJT3OLSOTYV
AWS_SECRET_ACCESS_KEY=82w/39S66LFm6KrfHdLRfDTLMa1rEazaeyZKyHQq
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:YOUR-ACCOUNT:wildfire-emergency-alerts
```

## 🧪 Test with Your Real Data
```bash
# Test with your existing table structure
aws dynamodb put-item \
    --table-name IoTFireProcessedData \
    --item '{
        "deviceId": {"S": "device_001"},
        "timestamp": {"N": "'$(date +%s)'"},
        "temperature": {"N": "95.5"},
        "humidity": {"N": "15.2"},
        "smoke_level": {"N": "950"},
        "emergency_status": {"BOOL": true}
    }'
```

**Your backend WILL work** - we just need to:
1. Create SNS topic
2. Set correct environment variables in Render  
3. Subscribe SNS to your deployed backend

Ready to deploy? 🚀
