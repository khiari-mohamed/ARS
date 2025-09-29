const fetch = require('node-fetch');

async function testGestionnaireAPI() {
  try {
    console.log('🧪 Testing Gestionnaire API response...\n');

    // Login as Test Gestionnaire
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'gestionnaire@test.com',
        password: 'password123'
      })
    });

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful');

    // Test corbeille endpoint
    const corbeilleResponse = await fetch('http://localhost:5000/api/workflow/gestionnaire/corbeille', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const corbeilleData = await corbeilleResponse.json();
    console.log('📥 Corbeille API Response:');
    console.log(`Assigned Items: ${corbeilleData.assignedItems?.length || 0}`);
    
    if (corbeilleData.assignedItems?.length > 0) {
      console.log('\n📄 First 5 Document IDs from API:');
      corbeilleData.assignedItems.slice(0, 5).forEach((item, index) => {
        console.log(`${index + 1}. ID: ${item.id}`);
        console.log(`   Reference: ${item.reference}`);
        console.log(`   Client: ${item.client}`);
        console.log(`   Type: ${item.type}`);
        console.log('');
      });

      // Test PDF endpoint with first document ID
      const firstDocId = corbeilleData.assignedItems[0].id;
      console.log(`🔍 Testing PDF endpoint with ID: ${firstDocId}`);
      
      const pdfResponse = await fetch(`http://localhost:5000/api/bordereaux/chef-equipe/tableau-bord/dossier-pdf/${firstDocId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const pdfData = await pdfResponse.json();
      console.log('📄 PDF Response:', pdfData);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGestionnaireAPI();