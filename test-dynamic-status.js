const axios = require('axios');

const API_BASE = 'http://localhost:3001';

// Test the dynamic status workflow
async function testDynamicWorkflow() {
  console.log('🚀 Testing Dynamic Status Workflow...\n');

  try {
    // 1. Create a new bordereau (should start with A_SCANNER)
    console.log('1. Creating new bordereau...');
    const createResponse = await axios.post(`${API_BASE}/bordereaux`, {
      reference: `TEST-${Date.now()}`,
      dateReception: new Date().toISOString(),
      clientId: 'test-client-id', // You'll need to use a real client ID
      delaiReglement: 30,
      nombreBS: 5
    });
    
    const bordereauId = createResponse.data.id;
    console.log(`✅ Created bordereau ${bordereauId} with status: ${createResponse.data.statut}`);

    // 2. Start scan (A_SCANNER -> SCAN_EN_COURS)
    console.log('\n2. Starting scan...');
    const scanStartResponse = await axios.post(`${API_BASE}/bordereaux/${bordereauId}/start-scan`);
    console.log(`✅ Scan started, status: ${scanStartResponse.data.statut}`);

    // 3. Complete scan (SCAN_EN_COURS -> SCANNE -> A_AFFECTER)
    console.log('\n3. Completing scan...');
    const scanCompleteResponse = await axios.post(`${API_BASE}/bordereaux/${bordereauId}/complete-scan`);
    console.log(`✅ Scan completed, status: ${scanCompleteResponse.data.statut}`);

    // 4. Assign to gestionnaire (A_AFFECTER -> ASSIGNE -> EN_COURS)
    console.log('\n4. Assigning to gestionnaire...');
    const assignResponse = await axios.post(`${API_BASE}/bordereaux/${bordereauId}/assign`, {
      userId: 'test-user-id' // You'll need to use a real user ID
    });
    console.log(`✅ Assigned to gestionnaire, status: ${assignResponse.data.statut}`);

    // 5. Mark as processed (EN_COURS -> TRAITE -> PRET_VIREMENT)
    console.log('\n5. Marking as processed...');
    const processResponse = await axios.post(`${API_BASE}/bordereaux/${bordereauId}/process`);
    console.log(`✅ Marked as processed, status: ${processResponse.data.statut}`);

    // 6. Initiate payment (PRET_VIREMENT -> VIREMENT_EN_COURS)
    console.log('\n6. Initiating payment...');
    const paymentInitResponse = await axios.post(`${API_BASE}/bordereaux/${bordereauId}/initiate-payment`);
    console.log(`✅ Payment initiated, status: ${paymentInitResponse.data.bordereau.statut}`);

    // 7. Execute payment (VIREMENT_EN_COURS -> VIREMENT_EXECUTE)
    console.log('\n7. Executing payment...');
    const paymentExecResponse = await axios.post(`${API_BASE}/bordereaux/${bordereauId}/execute-payment`);
    console.log(`✅ Payment executed, status: ${paymentExecResponse.data.bordereau.statut}`);

    // 8. Close bordereau (VIREMENT_EXECUTE -> CLOTURE)
    console.log('\n8. Closing bordereau...');
    const closeResponse = await axios.post(`${API_BASE}/bordereaux/${bordereauId}/close`);
    console.log(`✅ Bordereau closed, status: ${closeResponse.data.statut}`);

    console.log('\n🎉 Dynamic workflow test completed successfully!');
    console.log('\nWorkflow progression:');
    console.log('A_SCANNER → SCAN_EN_COURS → SCANNE → A_AFFECTER → ASSIGNE → EN_COURS → TRAITE → PRET_VIREMENT → VIREMENT_EN_COURS → VIREMENT_EXECUTE → CLOTURE');

  } catch (error) {
    console.error('❌ Error testing workflow:', error.response?.data || error.message);
    console.log('\n📝 Note: Make sure to:');
    console.log('1. Start the backend server (npm run start:dev)');
    console.log('2. Have valid client and user IDs in the database');
    console.log('3. Update the clientId and userId in this script with real values');
  }
}

// Test status display
async function testStatusDisplay() {
  console.log('\n📊 Testing Status Display...\n');
  
  try {
    const response = await axios.get(`${API_BASE}/bordereaux?page=1&pageSize=10`);
    const bordereaux = response.data.items || response.data;
    
    console.log('Current bordereaux statuses:');
    bordereaux.forEach((b, index) => {
      const statusEmojis = {
        'EN_ATTENTE': '⏳',
        'A_SCANNER': '📄',
        'SCAN_EN_COURS': '🔄',
        'SCANNE': '✅',
        'A_AFFECTER': '👥',
        'ASSIGNE': '👤',
        'EN_COURS': '⚡',
        'TRAITE': '✅',
        'PRET_VIREMENT': '💰',
        'VIREMENT_EN_COURS': '🏦',
        'VIREMENT_EXECUTE': '✅',
        'VIREMENT_REJETE': '❌',
        'CLOTURE': '🔒',
        'EN_DIFFICULTE': '⚠️',
        'PARTIEL': '📊'
      };
      
      const emoji = statusEmojis[b.statut] || '❓';
      console.log(`${index + 1}. ${b.reference}: ${emoji} ${b.statut}`);
    });
    
  } catch (error) {
    console.error('❌ Error fetching bordereaux:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  await testStatusDisplay();
  // Uncomment to test workflow (need valid IDs)
  // await testDynamicWorkflow();
}

runTests();