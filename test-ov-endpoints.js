const https = require('https');
const http = require('http');

function request(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    }).on('error', reject);
  });
}

async function testEndpoints() {
  console.log('🔍 Testing OV Endpoints\n');
  
  const BASE = 'http://localhost:5000/api';
  
  console.log('1️⃣ Testing pending OVs endpoint...');
  const pending = await request(`${BASE}/finance/ordres-virement/pending-validation`);
  console.log(`   Status: ${pending.status}`);
  console.log(`   Data:`, pending.data);
  
  console.log('\n2️⃣ Testing validation endpoint...');
  const validation = await request(`${BASE}/finance/validation/pending`);
  console.log(`   Status: ${validation.status}`);
  console.log(`   Data:`, validation.data);
  
  console.log('\n✅ Done!');
}

testEndpoints();
