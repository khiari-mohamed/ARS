const fetch = require('node-fetch');

async function testGestionnaireAPI() {
  try {
    console.log('🧪 Testing Gestionnaire API endpoints...\n');

    // First, login as Test Gestionnaire to get token
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'gestionnaire@test.com',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginResponse.status);
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful, got token');

    // Test dashboard-stats endpoint
    console.log('\n📊 Testing /workflow/gestionnaire/dashboard-stats...');
    const statsResponse = await fetch('http://localhost:5000/api/workflow/gestionnaire/dashboard-stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('✅ Stats endpoint response:');
      console.log(JSON.stringify(statsData, null, 2));
    } else {
      console.error('❌ Stats endpoint failed:', statsResponse.status);
      const errorText = await statsResponse.text();
      console.error('Error:', errorText);
    }

    // Test corbeille endpoint
    console.log('\n📥 Testing /workflow/gestionnaire/corbeille...');
    const corbeilleResponse = await fetch('http://localhost:5000/api/workflow/gestionnaire/corbeille', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (corbeilleResponse.ok) {
      const corbeilleData = await corbeilleResponse.json();
      console.log('✅ Corbeille endpoint response:');
      console.log(`Assigned Items: ${corbeilleData.assignedItems?.length || 0}`);
      console.log(`Processed Items: ${corbeilleData.processedItems?.length || 0}`);
      console.log(`Returned Items: ${corbeilleData.returnedItems?.length || 0}`);
      
      if (corbeilleData.assignedItems?.length > 0) {
        console.log('\nFirst few assigned items:');
        corbeilleData.assignedItems.slice(0, 3).forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.reference} - ${item.clientName} (${item.etat})`);
        });
      }
    } else {
      console.error('❌ Corbeille endpoint failed:', corbeilleResponse.status);
      const errorText = await corbeilleResponse.text();
      console.error('Error:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testGestionnaireAPI();