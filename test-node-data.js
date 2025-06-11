// Test fetching data for Node 1
const fetch = require('node-fetch');

async function testNodeData() {
  const API_URL = 'http://localhost:3001/api';
  
  try {
    console.log('Testing Node 1 data...\n');
    
    // Get latest data
    console.log('1. Latest data:');
    const latestRes = await fetch(`${API_URL}/device/latest?deviceId=Node 1`);
    const latest = await latestRes.json();
    console.log(JSON.stringify(latest, null, 2));
    
    // Get all data
    console.log('\n2. All data for Node 1:');
    const dataRes = await fetch(`${API_URL}/device/data?deviceId=${encodeURIComponent('Node 1')}&limit=5`);
    const data = await dataRes.json();
    console.log(JSON.stringify(data, null, 2));
    
    // Get all data (no device filter)
    console.log('\n3. All data (no filter):');
    const allRes = await fetch(`${API_URL}/device/data?limit=5`);
    const all = await allRes.json();
    console.log(JSON.stringify(all, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testNodeData();
