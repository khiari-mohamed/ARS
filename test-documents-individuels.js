const https = require('https');
const http = require('http');

// UPDATE THESE TOKENS
const CHEF_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImNoZWZAbWFpbC5jb20iLCJzdWIiOiI5NjM4OGNjNi0yZWY2LTQ2YjMtOTc1Zi1mNGI0MmNlMGM2MWMiLCJyb2xlIjoiQ0hFRl9FUVVJUEUiLCJpYXQiOjE3NTkzMTU3MzQsImV4cCI6MTc1OTQwMjEzNH0.mPtdy0I2T61Bo4-KquHsMWl7g5a1ZbzblnQFB-BZfF4';
const GESTIONNAIRE_TOKEN = 'your-gestionnaire-token-here';

function makeRequest(url, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api${url}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function testDocumentsIndividuels() {
  console.log('🔍 TESTING DOCUMENTS INDIVIDUELS ENDPOINTS');
  console.log('==========================================\n');
  
  const endpoints = [
    '/bordereaux/chef-equipe/tableau-bord/documents-individuels',
    '/bordereaux/chef-equipe/tableau-bord/derniers-dossiers',
    '/bordereaux/chef-equipe/dashboard-dossiers'
  ];
  
  console.log('📊 TESTING WITH CHEF D\'ÉQUIPE TOKEN:');
  console.log('=====================================');
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(endpoint, CHEF_TOKEN);
      
      console.log(`✅ ${endpoint}`);
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 200) {
        const data = response.data;
        const items = Array.isArray(data) ? data : (data.dossiers || data.items || []);
        console.log(`   Items count: ${items.length}`);
        
        if (items.length > 0) {
          console.log(`   First item:`, {
            id: items[0].id,
            reference: items[0].reference,
            nom: items[0].nom,
            client: items[0].client,
            type: items[0].type,
            statut: items[0].statut,
            gestionnaire: items[0].gestionnaire
          });
          
          console.log(`   All references:`, items.map(item => item.reference || item.nom));
        }
      } else {
        console.log(`   Error: ${response.data}`);
      }
      
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
    console.log('');
  }
  
  console.log('\n🔍 ANALYSIS:');
  console.log('============');
  console.log('Look for the endpoint that returns individual documents like:');
  console.log('- BS-5766831.pdf');
  console.log('- BS-5766762.pdf');
  console.log('- BS-5861977.pdf');
  console.log('- etc.');
  console.log('\nThis should be used for the "Dossiers Individuels" table.');
}

testDocumentsIndividuels().catch(console.error);