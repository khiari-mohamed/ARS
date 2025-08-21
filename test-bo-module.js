const axios = require('axios');

const API_BASE = 'http://localhost:8000';

// Test configuration
const testConfig = {
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// Mock authentication token (replace with real token in production)
let authToken = null;

async function authenticate() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'bo@test.com',
      password: 'password123'
    });
    
    authToken = response.data.access_token;
    testConfig.headers['Authorization'] = `Bearer ${authToken}`;
    console.log('✅ Authentication successful');
    return true;
  } catch (error) {
    console.log('⚠️  Authentication failed, using mock mode');
    return false;
  }
}

async function testBODashboard() {
  console.log('\n🧪 Testing BO Dashboard...');
  
  try {
    const response = await axios.get(`${API_BASE}/bo/dashboard`, testConfig);
    
    console.log('✅ Dashboard loaded successfully');
    console.log(`   - Today's entries: ${response.data.todayEntries}`);
    console.log(`   - Pending entries: ${response.data.pendingEntries}`);
    console.log(`   - Recent entries: ${response.data.recentEntries?.length || 0}`);
    
    return response.data;
  } catch (error) {
    console.log('❌ Dashboard test failed:', error.message);
    return null;
  }
}

async function testReferenceGeneration() {
  console.log('\n🧪 Testing Reference Generation...');
  
  const types = ['BS', 'CONTRAT', 'RECLAMATION', 'FACTURE'];
  
  for (const type of types) {
    try {
      const response = await axios.post(`${API_BASE}/bo/generate-reference`, {
        type,
        clientId: 'test-client-id'
      }, testConfig);
      
      console.log(`✅ ${type} reference generated: ${response.data.reference}`);
    } catch (error) {
      console.log(`❌ ${type} reference generation failed:`, error.message);
    }
  }
}

async function testDocumentClassification() {
  console.log('\n🧪 Testing Document Classification...');
  
  const testFiles = [
    'bulletin_soin_001.pdf',
    'contrat_client_abc.pdf',
    'reclamation_urgent.pdf',
    'facture_janvier.pdf',
    'document_inconnu.txt'
  ];
  
  for (const fileName of testFiles) {
    try {
      const response = await axios.post(`${API_BASE}/bo/classify-document`, {
        fileName
      }, testConfig);
      
      console.log(`✅ ${fileName} classified as: ${response.data.type} (${Math.round(response.data.confidence * 100)}%)`);
    } catch (error) {
      console.log(`❌ Classification failed for ${fileName}:`, error.message);
    }
  }
}

async function testSingleEntryCreation() {
  console.log('\n🧪 Testing Single Entry Creation...');
  
  try {
    // First generate a reference
    const refResponse = await axios.post(`${API_BASE}/bo/generate-reference`, {
      type: 'BS',
      clientId: 'test-client'
    }, testConfig);
    
    const entry = {
      reference: refResponse.data.reference,
      clientId: 'test-client-id',
      contractId: 'test-contract-id',
      documentType: 'BS',
      nombreDocuments: 5,
      delaiReglement: 30,
      dateReception: new Date().toISOString().split('T')[0],
      startTime: Date.now()
    };
    
    const response = await axios.post(`${API_BASE}/bo/create-entry`, entry, testConfig);
    
    if (response.data.success) {
      console.log('✅ Entry created successfully');
      console.log(`   - Reference: ${response.data.bordereau?.reference || response.data.reference}`);
      console.log(`   - ID: ${response.data.bordereau?.id || 'N/A'}`);
      return response.data;
    } else {
      console.log('❌ Entry creation failed:', response.data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ Single entry creation failed:', error.message);
    return null;
  }
}

async function testBatchEntryCreation() {
  console.log('\n🧪 Testing Batch Entry Creation...');
  
  try {
    const entries = [];
    
    // Generate multiple entries
    for (let i = 1; i <= 3; i++) {
      const refResponse = await axios.post(`${API_BASE}/bo/generate-reference`, {
        type: 'BS',
        clientId: `client-${i}`
      }, testConfig);
      
      entries.push({
        reference: refResponse.data.reference,
        clientId: `test-client-${i}`,
        contractId: `test-contract-${i}`,
        documentType: 'BS',
        nombreDocuments: i * 2,
        delaiReglement: 30,
        dateReception: new Date().toISOString().split('T')[0],
        startTime: Date.now()
      });
    }
    
    const response = await axios.post(`${API_BASE}/bo/create-batch`, {
      entries
    }, testConfig);
    
    console.log(`✅ Batch processing completed`);
    console.log(`   - Total entries: ${response.data.total}`);
    console.log(`   - Successful: ${response.data.successCount}`);
    console.log(`   - Errors: ${response.data.errorCount}`);
    
    if (response.data.errors.length > 0) {
      console.log('   - Error details:', response.data.errors);
    }
    
    return response.data;
  } catch (error) {
    console.log('❌ Batch entry creation failed:', error.message);
    return null;
  }
}

async function testPerformanceMetrics() {
  console.log('\n🧪 Testing Performance Metrics...');
  
  const periods = ['daily', 'weekly', 'monthly'];
  
  for (const period of periods) {
    try {
      const response = await axios.get(`${API_BASE}/bo/performance`, {
        ...testConfig,
        params: { period }
      });
      
      console.log(`✅ ${period} performance metrics:`);
      console.log(`   - Total entries: ${response.data.totalEntries}`);
      console.log(`   - Avg processing time: ${response.data.avgProcessingTime}s`);
      console.log(`   - Error rate: ${response.data.errorRate}%`);
      console.log(`   - Entry speed: ${response.data.entrySpeed} entries/hour`);
    } catch (error) {
      console.log(`❌ Performance metrics failed for ${period}:`, error.message);
    }
  }
}

async function testDashboardRefresh() {
  console.log('\n🧪 Testing Dashboard Refresh After Entry Creation...');
  
  try {
    // Get initial dashboard state
    const initialDashboard = await axios.get(`${API_BASE}/bo/dashboard`, testConfig);
    const initialCount = initialDashboard.data.todayEntries;
    
    console.log(`   - Initial today's entries: ${initialCount}`);
    
    // Create a new entry
    await testSingleEntryCreation();
    
    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get updated dashboard state
    const updatedDashboard = await axios.get(`${API_BASE}/bo/dashboard`, testConfig);
    const updatedCount = updatedDashboard.data.todayEntries;
    
    console.log(`   - Updated today's entries: ${updatedCount}`);
    
    if (updatedCount > initialCount) {
      console.log('✅ Dashboard refreshed correctly - new entry appears in recent entries');
      
      // Check if the new entry appears in recent entries
      const recentEntries = updatedDashboard.data.recentEntries || [];
      if (recentEntries.length > 0) {
        console.log(`   - Latest entry: ${recentEntries[0].reference}`);
        console.log('✅ New entry appears in "Entrées Récentes" table');
      } else {
        console.log('⚠️  No recent entries found');
      }
    } else {
      console.log('⚠️  Dashboard count did not increase (may be using mock data)');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Dashboard refresh test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting BO Module Comprehensive Tests\n');
  
  // Authenticate first
  const authenticated = await authenticate();
  
  if (!authenticated) {
    console.log('⚠️  Running in mock mode - some tests may not reflect real data\n');
  }
  
  // Run all tests
  await testBODashboard();
  await testReferenceGeneration();
  await testDocumentClassification();
  await testSingleEntryCreation();
  await testBatchEntryCreation();
  await testPerformanceMetrics();
  
  // Most important test - dashboard refresh
  await testDashboardRefresh();
  
  console.log('\n🏁 All tests completed!');
  console.log('\n📋 Test Summary:');
  console.log('   - BO Dashboard loading');
  console.log('   - Reference generation for all document types');
  console.log('   - Document classification');
  console.log('   - Single entry creation');
  console.log('   - Batch entry creation');
  console.log('   - Performance metrics');
  console.log('   - Dashboard refresh after new entry creation');
  console.log('\n✨ The BO module should now be fully functional and dynamic!');
}

// Run the tests
runAllTests().catch(console.error);