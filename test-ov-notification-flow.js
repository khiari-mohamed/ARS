const https = require('https');
const http = require('http');

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function testNotificationFlow() {
  console.log('🔔 Testing OV Notification Flow\n');
  const API_URL = process.env.API_URL || 'http://localhost:5000/api';
  
  try {
    console.log('1️⃣ Logging in as RESPONSABLE_DEPARTEMENT...');
    const loginRes = await request(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'respo@mail.com', password: 'password123' }
    });
    
    if (loginRes.status !== 200) {
      console.error('❌ Login failed:', loginRes.status, loginRes.data);
      return;
    }
    
    const token = loginRes.data.token;
    const userId = loginRes.data.user.id;
    console.log('✅ Logged in - User:', userId, 'Role:', loginRes.data.user.role);
    
    console.log('\n2️⃣ Checking pending OVs...');
    const pendingRes = await request(`${API_URL}/finance/ordres-virement/pending-validation`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Found ${pendingRes.data.length} pending OVs`);
    
    console.log('\n3️⃣ Checking notifications...');
    const notifRes = await request(`${API_URL}/users/${userId}/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Found ${notifRes.data.length} notifications`);
    const ovNotifs = notifRes.data.filter(n => n.type === 'OV_PENDING_VALIDATION');
    console.log(`   OV_PENDING_VALIDATION: ${ovNotifs.length}`);
    
    console.log('\n✅ Tests complete!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testNotificationFlow();
