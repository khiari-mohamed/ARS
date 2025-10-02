const https = require('https');
const http = require('http');

// Configuration - UPDATE THESE WITH YOUR ACTUAL TOKENS
const CHEF_TOKEN = 'your-chef-equipe-jwt-token-here';
const GESTIONNAIRE_TOKEN = 'your-gestionnaire-jwt-token-here';
const API_BASE_URL = 'http://localhost:5000/api';

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

async function testEndpoint(endpoint, token, role) {
  try {
    const response = await makeRequest(endpoint, token);
    
    console.log(`✅ [${role}] ${endpoint}`);
    console.log(`   Status: ${response.status}`);
    
    const data = response.data;
    console.log(`   Data keys:`, Object.keys(data || {}));
    
    if (endpoint.includes('dashboard-stats')) {
      console.log(`   Stats:`, {
        prestation: data.prestation?.total || 0,
        adhesion: data.adhesion?.total || 0,
        hasBreakdown: !!data.prestation?.breakdown,
        hasGestionnaireBreakdown: !!data.prestation?.gestionnaireBreakdown
      });
    }
    
    if (endpoint.includes('dossiers') || endpoint.includes('documents')) {
      const items = Array.isArray(data) ? data : (data.dossiers || data.items || []);
      console.log(`   Items count:`, items.length);
      if (items.length > 0) {
        console.log(`   Sample item:`, {
          id: items[0].id,
          reference: items[0].reference,
          nom: items[0].nom,
          client: items[0].client,
          type: items[0].type,
          statut: items[0].statut,
          gestionnaire: items[0].gestionnaire
        });
      }
    }
    
    return { success: true, data };
  } catch (error) {
    console.log(`❌ [${role}] ${endpoint} - Network Error: ${error.message}`);
    return { success: false, error: 'Network Error' };
  }
}

async function compareDashboards() {
  console.log('🔍 DASHBOARD API COMPARISON');
  console.log('============================\n');
  
  const endpoints = [
    '/bordereaux/chef-equipe/dashboard-stats',
    '/bordereaux/chef-equipe/dashboard-dossiers',
    '/bordereaux/chef-equipe/gestionnaire-assignments',
    '/bordereaux/chef-equipe/tableau-bord/stats',
    '/bordereaux/chef-equipe/tableau-bord/types-detail',
    '/bordereaux/chef-equipe/tableau-bord/derniers-dossiers',
    '/bordereaux/chef-equipe/tableau-bord/dossiers-en-cours',
    '/bordereaux/chef-equipe/tableau-bord/documents-individuels',
    '/workflow/chef-equipe/dashboard-stats',
    '/workflow/chef-equipe/corbeille',
    '/workflow/gestionnaire/dashboard-stats',
    '/workflow/gestionnaire/corbeille'
  ];
  
  console.log('📊 TESTING WITH CHEF D\'ÉQUIPE TOKEN:');
  console.log('=====================================');
  const chefResults = {};
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint, CHEF_TOKEN, 'CHEF');
    chefResults[endpoint] = result;
    console.log('');
  }
  
  console.log('\n📊 TESTING WITH GESTIONNAIRE TOKEN:');
  console.log('====================================');
  const gestionnaireResults = {};
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint, GESTIONNAIRE_TOKEN, 'GEST');
    gestionnaireResults[endpoint] = result;
    console.log('');
  }
  
  console.log('\n🔍 COMPARISON ANALYSIS:');
  console.log('=======================');
  
  const workingEndpoints = [];
  const permissionIssues = [];
  
  for (const endpoint of endpoints) {
    const chefResult = chefResults[endpoint];
    const gestResult = gestionnaireResults[endpoint];
    
    if (chefResult.success && gestResult.success) {
      workingEndpoints.push(endpoint);
      console.log(`✅ BOTH WORK: ${endpoint}`);
    } else if (chefResult.success && !gestResult.success) {
      permissionIssues.push(endpoint);
      console.log(`⚠️  CHEF ONLY: ${endpoint} (Gestionnaire: ${gestResult.error})`);
    } else if (!chefResult.success && gestResult.success) {
      console.log(`⚠️  GEST ONLY: ${endpoint} (Chef: ${chefResult.error})`);
    } else {
      console.log(`❌ BOTH FAIL: ${endpoint}`);
    }
  }
  
  console.log('\n📋 RECOMMENDATIONS:');
  console.log('===================');
  console.log('Working endpoints for both roles:', workingEndpoints);
  console.log('Permission issues for gestionnaire:', permissionIssues);
  
  if (workingEndpoints.length > 0) {
    console.log('\n✅ Use these endpoints in gestionnaire dashboard:');
    workingEndpoints.forEach(ep => console.log(`   ${ep}`));
  }
  
  if (permissionIssues.length > 0) {
    console.log('\n⚠️  Fix permissions for gestionnaire on these endpoints:');
    permissionIssues.forEach(ep => console.log(`   ${ep}`));
  }
}

// Instructions
console.log('🚀 DASHBOARD COMPARISON SCRIPT');
console.log('==============================');
console.log('1. Update CHEF_TOKEN and GESTIONNAIRE_TOKEN variables above');
console.log('2. Get tokens from browser localStorage or login API');
console.log('3. Run: node compare-dashboards.js\n');

// Uncomment to run (after updating tokens)
compareDashboards().catch(console.error);

module.exports = { compareDashboards };