const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Get token from localStorage (you need to copy this from browser)
// Open browser console and run: localStorage.getItem('token')
const TOKEN = process.argv[2] || 'YOUR_TOKEN_HERE';

async function testBackendAPI() {
  console.log('🔍 Testing Backend API for Durée de traitement & Durée de règlement\n');
  console.log('📡 Base URL:', BASE_URL);
  console.log('🔑 Token:', TOKEN.substring(0, 20) + '...\n');

  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    // Test 1: Get all bordereaux
    console.log('📋 TEST 1: GET /bordereaux');
    console.log('─'.repeat(80));
    const response1 = await axios.get(`${BASE_URL}/bordereaux`, { headers });
    const bordereaux = Array.isArray(response1.data) ? response1.data : response1.data.items || [];
    
    console.log(`✅ Found ${bordereaux.length} bordereaux\n`);

    if (bordereaux.length > 0) {
      const sample = bordereaux[0];
      console.log('📊 SAMPLE BORDEREAU DATA:');
      console.log('─'.repeat(80));
      console.log('Reference:', sample.reference);
      console.log('Date Reception:', sample.dateReception);
      console.log('Date Reception BO:', sample.dateReceptionBO || '❌ NULL');
      console.log('Date Cloture:', sample.dateCloture || '❌ NULL');
      console.log('Date Execution Virement:', sample.dateExecutionVirement || '❌ NULL');
      console.log('Delai Reglement:', sample.delaiReglement, 'jours');
      console.log('\n⏱️  CALCULATED FIELDS:');
      console.log('─'.repeat(80));
      console.log('dureeTraitement:', sample.dureeTraitement !== undefined ? sample.dureeTraitement : '❌ MISSING');
      console.log('dureeTraitementStatus:', sample.dureeTraitementStatus || '❌ MISSING');
      console.log('dureeReglement:', sample.dureeReglement !== undefined ? sample.dureeReglement : '❌ MISSING');
      console.log('dureeReglementStatus:', sample.dureeReglementStatus || '❌ MISSING');
      console.log('\n');

      // Test 2: Get specific bordereau
      console.log('📋 TEST 2: GET /bordereaux/:id');
      console.log('─'.repeat(80));
      const response2 = await axios.get(`${BASE_URL}/bordereaux/${sample.id}`, { headers });
      const bordereau = response2.data;
      
      console.log('✅ Retrieved bordereau:', bordereau.reference);
      console.log('\n📊 DETAILED DATA:');
      console.log('─'.repeat(80));
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
      console.log('\n');
    }

    // Test 3: Chef Équipe Corbeille
    console.log('📋 TEST 3: GET /bordereaux/chef-equipe/corbeille');
    console.log('─'.repeat(80));
    try {
      const response3 = await axios.get(`${BASE_URL}/bordereaux/chef-equipe/corbeille`, { headers });
      const corbeille = response3.data;
      
      console.log('✅ Corbeille data retrieved');
      console.log('Non affectés:', corbeille.nonAffectes?.length || 0);
      console.log('En cours:', corbeille.enCours?.length || 0);
      console.log('Traités:', corbeille.traites?.length || 0);
      
      if (corbeille.nonAffectes && corbeille.nonAffectes.length > 0) {
        const sample = corbeille.nonAffectes[0];
        console.log('\n📊 SAMPLE FROM CORBEILLE:');
        console.log('─'.repeat(80));
        console.log(JSON.stringify({
          reference: sample.reference,
          dateReceptionBO: sample.dateReceptionBO,
          dureeTraitement: sample.dureeTraitement,
          dureeTraitementStatus: sample.dureeTraitementStatus,
          dureeReglement: sample.dureeReglement,
          dureeReglementStatus: sample.dureeReglementStatus
        }, null, 2));
      }
    } catch (error) {
      console.log('⚠️  Chef équipe endpoint not accessible (might need CHEF_EQUIPE role)');
    }

    console.log('\n');
    console.log('═'.repeat(80));
    console.log('🎯 DIAGNOSIS:');
    console.log('═'.repeat(80));
    
    if (bordereaux.length > 0) {
      const sample = bordereaux[0];
      
      if (!sample.dateReceptionBO) {
        console.log('❌ ISSUE: dateReceptionBO is NULL in database');
        console.log('   FIX: Run SQL: UPDATE "Bordereau" SET "dateReceptionBO" = "dateReception" WHERE "dateReceptionBO" IS NULL;');
      }
      
      if (sample.dureeTraitement === undefined) {
        console.log('❌ ISSUE: dureeTraitement field is missing from backend response');
        console.log('   FIX: Check BordereauResponseDto.fromEntity() includes the field');
      } else if (sample.dureeTraitement === null && sample.dateReceptionBO && sample.dateCloture) {
        console.log('❌ ISSUE: dureeTraitement is NULL but dates exist');
        console.log('   FIX: Backend calculation logic not running');
      } else if (sample.dureeTraitement !== null) {
        console.log('✅ dureeTraitement is calculated correctly:', sample.dureeTraitement, 'days');
      }
      
      if (sample.dureeReglement === undefined) {
        console.log('❌ ISSUE: dureeReglement field is missing from backend response');
        console.log('   FIX: Check BordereauResponseDto.fromEntity() includes the field');
      } else if (sample.dureeReglement === null && sample.dateReceptionBO && sample.dateExecutionVirement) {
        console.log('❌ ISSUE: dureeReglement is NULL but dates exist');
        console.log('   FIX: Backend calculation logic not running');
      } else if (sample.dureeReglement !== null) {
        console.log('✅ dureeReglement is calculated correctly:', sample.dureeReglement, 'days');
      }
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    console.log('\n💡 TIP: Make sure you provide a valid token as argument:');
    console.log('   node test-backend-api.js YOUR_TOKEN_HERE');
    console.log('\n   To get your token:');
    console.log('   1. Open browser DevTools (F12)');
    console.log('   2. Go to Console tab');
    console.log('   3. Run: localStorage.getItem("token")');
    console.log('   4. Copy the token and run: node test-backend-api.js <paste_token>');
  }
}

testBackendAPI();
