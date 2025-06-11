// test-connection.js - Test your DynamoDB connection
require('dotenv').config();
const AWS = require('aws-sdk');

// Configure AWS with your credentials
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamoDb = new AWS.DynamoDB.DocumentClient();

async function testConnection() {
  console.log('🔍 Testing DynamoDB connection...');
  console.log('==========================================');
  
  try {
    // Step 1: Test AWS credentials
    console.log('\n1. 📋 Testing AWS credentials...');
    try {
      const tableList = await dynamoDb.scan({ TableName: 'non-existent-table-test' }).promise();
    } catch (credError) {
      if (credError.code === 'UnrecognizedClientException') {
        console.error('❌ AWS Credentials Error!');
        console.log('🔧 Fix: Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env file');
        return;
      } else if (credError.code === 'ResourceNotFoundException') {
        console.log('✅ AWS credentials are working!');
      }
    }

    // Step 2: Test table access
    const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;
    
    if (!TABLE_NAME || TABLE_NAME === 'YOUR_TABLE_NAME') {
      console.log('\n⚠️  Please update DYNAMODB_TABLE_NAME in .env file with your actual table name');
      console.log('\nTo find your table name, run:');
      console.log('aws dynamodb list-tables --region ' + (process.env.AWS_REGION || 'us-east-1'));
      console.log('\nOr check AWS Console → DynamoDB → Tables');
      return;
    }

    console.log(`\n2. 🔍 Testing access to table: ${TABLE_NAME}`);
    
    const result = await dynamoDb.scan({
      TableName: TABLE_NAME,
      Limit: 5
    }).promise();

    if (result.Items && result.Items.length > 0) {
      console.log(`✅ Success! Found ${result.Items.length} sample items`);
      console.log('\n📄 Sample data structure:');
      console.log(JSON.stringify(result.Items[0], null, 2));
      
      // Analyze data structure
      const fields = Object.keys(result.Items[0]);
      console.log(`\n🔍 Available fields: ${fields.join(', ')}`);
      
      // Look for common timestamp fields
      const timeFields = fields.filter(field => 
        field.toLowerCase().includes('time') || 
        field.toLowerCase().includes('date') ||
        field.toLowerCase().includes('created') ||
        field.toLowerCase().includes('updated') ||
        field.toLowerCase().includes('timestamp')
      );
      
      if (timeFields.length > 0) {
        console.log(`⏰ Potential timestamp fields: ${timeFields.join(', ')}`);
      }

      // Look for device ID fields
      const deviceFields = fields.filter(field =>
        field.toLowerCase().includes('device') ||
        field.toLowerCase().includes('id') ||
        field.toLowerCase().includes('sensor')
      );
      
      if (deviceFields.length > 0) {
        console.log(`📱 Potential device ID fields: ${deviceFields.join(', ')}`);
      }

      console.log('\n🎉 Connection test successful!');
      console.log('\n📝 Next steps:');
      console.log('1. Update TIMESTAMP_FIELD in .env if different from "timestamp"');
      console.log('2. Update DEVICE_ID_FIELD in .env if different from "deviceId"');
      console.log('3. Run: npm install');
      console.log('4. Run: npm run dev');
      
    } else {
      console.log('⚠️  Table exists but no data found');
      console.log('✅ Connection is working, but table is empty');
    }

  } catch (error) {
    console.error('\n❌ Error accessing table:', error.message);
    
    if (error.code === 'ResourceNotFoundException') {
      console.log('🔧 Fix: Check table name in .env file');
    } else if (error.code === 'AccessDeniedException') {
      console.log('🔧 Fix: Check IAM permissions for DynamoDB access');
    } else {
      console.log('🔧 Error details:', error.code);
    }
  }
}

// Run the test
testConnection();