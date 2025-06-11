// check-dynamodb.js - Check what's in the DynamoDB table
require('dotenv').config();
const AWS = require('aws-sdk');

AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.DYNAMODB_TABLE_NAME || 'IoTFireProcessedData';

async function checkTable() {
  console.log(`\nChecking DynamoDB table: ${tableName}\n`);
  
  try {
    // 1. Scan to get sample items
    console.log('1. Scanning for items...');
    const scanResult = await dynamoDb.scan({
      TableName: tableName,
      Limit: 5
    }).promise();
    
    console.log(`Found ${scanResult.Count} items (showing up to 5):`);
    
    if (scanResult.Items && scanResult.Items.length > 0) {
      console.log('\nSample item structure:');
      console.log(JSON.stringify(scanResult.Items[0], null, 2));
      
      console.log('\nAll items:');
      scanResult.Items.forEach((item, index) => {
        console.log(`Item ${index + 1}:`);
        console.log(`- Device: ${item.device || 'N/A'}`);
        
        // Access nested payload data
        if (item.payload) {
          console.log(`- Temperature: ${item.payload.temperature}°C`);
          console.log(`- Humidity: ${item.payload.humidity}%`);
          console.log(`- Smoke Level: ${item.payload.smoke_level}`);
          console.log(`- Air Quality: ${item.payload.air_quality}`);
          console.log(`- GPS: ${item.payload.gps ? `${item.payload.gps.latitude}, ${item.payload.gps.longitude}` : 'N/A'}`);
          console.log(`- Emergency: ${item.payload.is_emergency ? 'YES' : 'NO'}`);
        } else {
          console.log(`- Temperature: ${item.temperature || 'N/A'}`);
          console.log(`- Humidity: ${item.humidity || 'N/A'}`);
          console.log(`- Smoke Level: ${item.smoke_level || 'N/A'}`);
        }
        
        console.log(`- Fire Prediction: ${item.fire_prediction_percentage}%`);
        
        // Better timestamp formatting
        const timestamp = parseInt(item.timestamp);
        const date = new Date(timestamp);
        console.log(`- Timestamp: ${item.timestamp} (${date.toLocaleString()})`);
        console.log(`- Processed: ${item.predictionProcessedTimestamp}`);
        console.log('');
      });
      
      // 2. Check field names
      console.log('2. Field names found:');
      const allFields = new Set();
      scanResult.Items.forEach(item => {
        Object.keys(item).forEach(key => allFields.add(key));
        // Also check payload fields
        if (item.payload) {
          Object.keys(item.payload).forEach(key => allFields.add(`payload.${key}`));
        }
      });
      console.log(Array.from(allFields).join(', '));
      
      // 3. Get unique device IDs
      console.log('\n3. Unique devices:');
      const devices = new Set();
      for (const item of scanResult.Items) {
        if (item.device) devices.add(item.device);
        if (item.deviceId) devices.add(item.deviceId);
      }
      console.log([...devices].join(', '));
      
    } else {
      console.log('\n❌ No items found in the table!');
      console.log('\nPossible reasons:');
      console.log('1. The table is empty - no data has been inserted yet');
      console.log('2. Wrong table name - check DYNAMODB_TABLE_NAME in .env');
      console.log('3. Permission issues - check your AWS credentials');
    }
    
    // 4. Get total count
    console.log('\n4. Getting total count...');
    let totalCount = 0;
    let lastEvaluatedKey = null;
    
    do {
      const params = {
        TableName: tableName,
        Select: 'COUNT'
      };
      
      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }
      
      const result = await dynamoDb.scan(params).promise();
      totalCount += result.Count;
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);
    
    console.log(`Total items in table: ${totalCount}`);
    
    // 5. Data Analytics
    if (scanResult.Items && scanResult.Items.length > 0) {
      console.log('\n5. Data Analytics:');
      const validItems = scanResult.Items.filter(item => item.payload);
      
      if (validItems.length > 0) {
        const temperatures = validItems.map(item => item.payload.temperature).filter(t => t !== undefined);
        const humidities = validItems.map(item => item.payload.humidity).filter(h => h !== undefined);
        const smokeLevels = validItems.map(item => item.payload.smoke_level).filter(s => s !== undefined);
        const firePredictions = scanResult.Items.map(item => item.fire_prediction_percentage).filter(f => f !== undefined);
        
        if (temperatures.length > 0) {
          console.log(`- Temperature range: ${Math.min(...temperatures)}°C - ${Math.max(...temperatures)}°C`);
          console.log(`- Average temperature: ${(temperatures.reduce((a, b) => a + b, 0) / temperatures.length).toFixed(1)}°C`);
        }
        
        if (humidities.length > 0) {
          console.log(`- Humidity range: ${Math.min(...humidities)}% - ${Math.max(...humidities)}%`);
          console.log(`- Average humidity: ${(humidities.reduce((a, b) => a + b, 0) / humidities.length).toFixed(1)}%`);
        }
        
        if (smokeLevels.length > 0) {
          console.log(`- Smoke level range: ${Math.min(...smokeLevels)} - ${Math.max(...smokeLevels)}`);
          console.log(`- Average smoke level: ${(smokeLevels.reduce((a, b) => a + b, 0) / smokeLevels.length).toFixed(1)}`);
        }
        
        if (firePredictions.length > 0) {
          console.log(`- Fire prediction range: ${Math.min(...firePredictions)}% - ${Math.max(...firePredictions)}%`);
          console.log(`- Average fire prediction: ${(firePredictions.reduce((a, b) => a + b, 0) / firePredictions.length).toFixed(1)}%`);
        }
        
        const emergencyItems = validItems.filter(item => item.payload.is_emergency);
        console.log(`- Emergency alerts: ${emergencyItems.length}/${validItems.length} (${((emergencyItems.length / validItems.length) * 100).toFixed(1)}%)`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 'ResourceNotFoundException') {
      console.log('\nThe table does not exist. Please check:');
      console.log(`- Table name in .env: ${tableName}`);
      console.log('- AWS region:', process.env.AWS_REGION || 'us-east-1');
    }
  }
}

checkTable();
