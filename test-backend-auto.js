const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:5000';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = protocol.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function loginAndTest() {
  console.log('🔍 Auto-Testing Backend API\n');

  try {
    // Step 1: Login
    console.log('🔐 Step 1: Logging in...');
    const loginRes = await makeRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'admin@example.com', password: 'admin123' }
    });
    
    if (loginRes.status !== 200 && loginRes.status !== 201) {
      console.log('❌ Login failed. Trying alternative credentials...');
      const loginRes2 = await makeRequest(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { email: 'chef@example.com', password: 'chef123' }
      });
      
      if (loginRes2.status !== 200 && loginRes2.status !== 201) {
        throw new Error('Login failed with both credentials');
      }
      var token = loginRes2.data.token || loginRes2.data.access_token;
    } else {
      var token = loginRes.data.token || loginRes.data.access_token;
    }
    
    console.log('✅ Login successful');
    console.log('🔑 Token:', token.substring(0, 30) + '...\n');

    // Step 2: Get bordereaux
    console.log('📋 Step 2: GET /bordereaux');
    console.log('─'.repeat(80));
    const response = await makeRequest(`${BASE_URL}/bordereaux`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const bordereaux = Array.isArray(response.data) ? response.data : response.data.items || [];
    console.log(`✅ Found ${bordereaux.length} bordereaux\n`);

    if (bordereaux.length === 0) {
      console.log('⚠️  No bordereaux found');
      return;
    }

    const sample = bordereaux[0];
    console.log('📊 SAMPLE BORDEREAU:');
    console.log('─'.repeat(80));
    console.log('ID:', sample.id);
    console.log('Reference:', sample.reference);
    console.log('\n📅 DATES:');
    console.log('dateReception:', sample.dateReception);
    console.log('dateReceptionBO:', sample.dateReceptionBO || '❌ NULL');
    console.log('dateCloture:', sample.dateCloture || '❌ NULL');
    console.log('dateExecutionVirement:', sample.dateExecutionVirement || '❌ NULL');
    console.log('delaiReglement:', sample.delaiReglement);
    
    console.log('\n⏱️  NEW FIELDS:');
    console.log('─'.repeat(80));
    console.log('dureeTraitement:', sample.dureeTraitement !== undefined ? sample.dureeTraitement : '❌ MISSING');
    console.log('dureeTraitementStatus:', sample.dureeTraitementStatus || '❌ MISSING');
    console.log('dureeReglement:', sample.dureeReglement !== undefined ? sample.dureeReglement : '❌ MISSING');
    console.log('dureeReglementStatus:', sample.dureeReglementStatus || '❌ MISSING');

    // Step 3: Get single bordereau
    console.log('\n📋 Step 3: GET /bordereaux/' + sample.id);
    console.log('─'.repeat(80));
    const singleRes = await makeRequest(`${BASE_URL}/bordereaux/${sample.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const bordereau = singleRes.data;
    console.log('✅ Retrieved:', bordereau.reference);
    console.log('\n📊 RESPONSE:');
    console.log(JSON.stringify({
      reference: bordereau.reference,
      dateReceptionBO: bordereau.dateReceptionBO,
      dateCloture: bordereau.dateCloture,
      dateExecutionVirement: bordereau.dateExecutionVirement,
      delaiReglement: bordereau.delaiReglement,
      dureeTraitement: bordereau.dureeTraitement,
      dureeTraitementStatus: bordereau.dureeTraitementStatus,
      dureeReglement: bordereau.dureeReglement,
      dureeReglementStatus: bordereau.dureeReglementStatus
    }, null, 2));

    // Diagnosis
    console.log('\n═'.repeat(80));
    console.log('🎯 DIAGNOSIS:');
    console.log('═'.repeat(80));
    
    if (!bordereau.dateReceptionBO) {
      console.log('❌ dateReceptionBO is NULL');
      console.log('   FIX: UPDATE "Bordereau" SET "dateReceptionBO" = "dateReception" WHERE "dateReceptionBO" IS NULL;');
    } else {
      console.log('✅ dateReceptionBO exists');
    }
    
    if (bordereau.dureeTraitement === undefined) {
      console.log('❌ dureeTraitement MISSING from response');
    } else if (bordereau.dureeTraitement === null) {
      console.log('⚠️  dureeTraitement is NULL', !bordereau.dateCloture ? '(no dateCloture)' : '(calculation issue)');
    } else {
      console.log('✅ dureeTraitement:', bordereau.dureeTraitement, 'days -', bordereau.dureeTraitementStatus);
    }
    
    if (bordereau.dureeReglement === undefined) {
      console.log('❌ dureeReglement MISSING from response');
    } else if (bordereau.dureeReglement === null) {
      console.log('⚠️  dureeReglement is NULL', !bordereau.dateExecutionVirement ? '(no dateExecutionVirement)' : '(calculation issue)');
    } else {
      console.log('✅ dureeReglement:', bordereau.dureeReglement, 'days -', bordereau.dureeReglementStatus);
    }

    console.log('\n✅ TEST COMPLETE\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Server not running on port 5000');
    }
  }
}

loginAndTest();
