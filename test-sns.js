// test-sns.js - Test SNS notification system
const fetch = require('node-fetch');

// Test SNS notification data (simulating what Lambda would send)
const testSNSMessage = {
  Type: 'Notification',
  MessageId: 'test-' + Date.now(),
  Subject: 'Fire Alert - High Risk Detected',
  Message: JSON.stringify({
    device: 'Node 1',
    payload: {
      temperature: 78.5,
      humidity: 25.2,
      smoke_level: 850,
      air_quality: 420,
      gps: {
        latitude: 36.006397,
        longitude: 10.1715
      }
    },
    fire_prediction_percentage: 92.5,
    is_emergency: true,
    timestamp: Math.floor(Date.now() / 1000),
    severity: 'CRITICAL'
  }),
  Timestamp: new Date().toISOString(),
  TopicArn: 'arn:aws:sns:us-east-1:123456789012:wildfire-alerts',
  UnsubscribeURL: 'https://sns.us-east-1.amazonaws.com/unsubscribe?SubscriptionArn=test'
};

async function testSNSWebhook() {
  try {
    console.log('🧪 Testing SNS webhook endpoint...');
    console.log('📤 Sending test notification to backend...\n');
    
    const response = await fetch('http://localhost:3001/sns/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-amz-sns-message-type': 'Notification',
        'x-amz-sns-topic-arn': 'arn:aws:sns:us-east-1:123456789012:wildfire-alerts'
      },
      body: JSON.stringify(testSNSMessage)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SNS webhook test SUCCESS!');
      console.log('📊 Response:', result);
    } else {
      console.log('❌ SNS webhook test FAILED!');
      console.log('📊 Error:', result);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Also test the test endpoint
async function testSNSTestEndpoint() {
  try {
    console.log('\n🧪 Testing SNS test endpoint...');
    
    const response = await fetch('http://localhost:3001/sns/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        device: 'Test Node Lambda v20',
        payload: {
          temperature: 85.5,
          humidity: 20.1,
          smoke_level: 950,
          air_quality: 480,
          gps: {
            latitude: 36.006397,
            longitude: 10.1715
          }
        },
        fire_prediction_percentage: 95.0,
        is_emergency: true,
        timestamp: Math.floor(Date.now() / 1000)
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SNS test endpoint SUCCESS!');
      console.log('📊 Response:', result);
    } else {
      console.log('❌ SNS test endpoint FAILED!');
      console.log('📊 Error:', result);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run both tests
async function runAllTests() {
  console.log('🚀 Starting SNS System Tests for Node.js v20 Lambda\n');
  
  await testSNSWebhook();
  await testSNSTestEndpoint();
  
  console.log('\n✅ All SNS tests completed!');
  console.log('📝 Check your backend console for processing logs');
  console.log('🔥 Check your frontend for fire alert popup if emergency detected');
}

runAllTests();