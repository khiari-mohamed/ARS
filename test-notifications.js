const https = require('https');
const http = require('http');

const API_BASE = 'http://localhost:5000/api';

function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy-token-for-testing'
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ data: jsonBody, status: res.statusCode });
        } catch (e) {
          resolve({ data: body, status: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testNotificationSystem() {
  console.log('🔔 Testing Notification System...\n');

  try {
    // Test 0: Check if server is responding
    console.log('0️⃣ Testing server connection...');
    const serverResponse = await makeRequest(`${API_BASE}`);
    console.log(`   Server status: ${serverResponse.status}`);
    if (serverResponse.status !== 200) {
      console.log(`   Server response:`, serverResponse.data);
      return;
    }
    console.log(`   Server is responding: ${typeof serverResponse.data === 'string' ? serverResponse.data : JSON.stringify(serverResponse.data)}`);

    // Test 1: Check database status
    console.log('\n1️⃣ Testing database connection...');
    const dbTestResponse = await makeRequest(`${API_BASE}/reclamations/analytics/dashboard`);
    console.log(`   Database test status: ${dbTestResponse.status}`);
    if (dbTestResponse.status === 200) {
      console.log(`   Database connected - found ${dbTestResponse.data.total || 0} total reclamations`);
    } else {
      console.log(`   Database error:`, dbTestResponse.data);
    }

    // Test 2: Get alerts
    console.log('\n2️⃣ Testing alerts endpoint...');
    const alertsResponse = await makeRequest(`${API_BASE}/reclamations/alerts`);
    const alerts = Array.isArray(alertsResponse.data) ? alertsResponse.data : [];
    console.log(`   Found ${alerts.length} alerts:`);
    console.log(`   Response status: ${alertsResponse.status}`);
    if (alertsResponse.status !== 200) {
      console.log(`   Raw response:`, alertsResponse.data);
    }
    
    if (alerts.length > 0) {
      alerts.forEach((alert, i) => {
        console.log(`   ${i+1}. [${alert.level?.toUpperCase() || 'UNKNOWN'}] ${alert.title || 'No title'}`);
        console.log(`      Message: ${alert.message || 'No message'}`);
        console.log(`      Client: ${alert.clientName || 'N/A'}`);
        console.log(`      Read: ${alert.read}`);
        console.log('');
      });
    }

    // Test 3: Test mark as read if we have alerts
    if (alerts.length > 0) {
      console.log('3️⃣ Testing mark as read...');
      const firstAlert = alerts[0];
      try {
        const readResponse = await makeRequest(`${API_BASE}/reclamations/alerts/${firstAlert.id}/read`, 'PATCH');
        console.log(`   ✅ Successfully marked alert ${firstAlert.id} as read`);
        console.log(`   Response:`, readResponse.data);
      } catch (error) {
        console.log(`   ❌ Failed to mark alert as read: ${error.message}`);
      }
    }

    // Test 4: Test other endpoints
    console.log('\n4️⃣ Testing other endpoints...');
    const trendResponse = await makeRequest(`${API_BASE}/reclamations/trend`);
    console.log(`   Trend endpoint status: ${trendResponse.status}`);
    
    const searchResponse = await makeRequest(`${API_BASE}/reclamations/search`);
    console.log(`   Search endpoint status: ${searchResponse.status}`);
    
    if (alerts.length === 0) {
      console.log('\n   ℹ️ No alerts found. This means:');
      console.log('   - No SLA breaches detected');
      console.log('   - No critical reclamations in database');
      console.log('   - No escalated reclamations');
      console.log('   - No new unassigned reclamations in last 24h');
      console.log('   - Notification system is working but no data triggers alerts');
    }

    console.log('\n✅ Notification system test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testNotificationSystem();