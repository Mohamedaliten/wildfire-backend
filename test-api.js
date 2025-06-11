// Test script to check backend API
const API_URL = 'http://localhost:3001';

async function testAPI() {
  console.log('Testing Backend API...\n');
  
  try {
    // Test 1: Check if backend is reachable with text response
    console.log('1. Testing backend connection...');
    const healthRes = await fetch(`${API_URL}/health`);
    const healthText = await healthRes.text();
    console.log('Response status:', healthRes.status);
    console.log('Response headers:', healthRes.headers.get('content-type'));
    
    try {
      const health = JSON.parse(healthText);
      console.log('✓ Backend health check:', health);
    } catch (e) {
      console.log('Response text:', healthText.substring(0, 200));
    }
    
    // Test 2: Try the root endpoint
    console.log('\n2. Testing root endpoint...');
    const rootRes = await fetch(`${API_URL}/`);
    const rootText = await rootRes.text();
    try {
      const root = JSON.parse(rootText);
      console.log('✓ Root endpoint:', root);
    } catch (e) {
      console.log('Root response:', rootText.substring(0, 200));
    }
    
    // Test 3: Test API endpoints
    console.log('\n3. Testing API device list...');
    const devicesRes = await fetch(`${API_URL}/api/device/list`);
    const devicesText = await devicesRes.text();
    try {
      const devices = JSON.parse(devicesText);
      console.log('✓ Device list:', devices);
    } catch (e) {
      console.log('Device list response:', devicesText.substring(0, 200));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
