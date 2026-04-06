const http = require('http');

const BASE_URL = 'http://localhost:5000';
let accessToken = null;

function apiCall(method, path, body, isLogin = false) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function login() {
  console.log('🔐 Logging in as superadmin...');
  const res = await apiCall('POST', '/api/auth/login', {
    email: 'amenallah.benelmekki@arstunisie.com',
    password: 'Azerty123@'
  }, true);

  if (res.status !== 201 && res.status !== 200) {
    console.error('❌ Login failed:', res.data);
    process.exit(1);
  }
  
  if (res.data.access_token) {
    accessToken = res.data.access_token;
    console.log('✅ Login successful');
  } else {
    console.error('❌ No access_token in response:', res.data);
    process.exit(1);
  }
}

async function run() {
  await login();

  console.log('\n🔄 Test Reassignment Workflow via API\n');
  console.log(`📡 Target: ${BASE_URL}\n`);

  // Step 1: Get team workload
  console.log('📋 Step 1: Fetching team workload...');
  const workloadRes = await apiCall('GET', '/api/super-admin/team-workload');
  if (workloadRes.status !== 200) {
    console.error('❌ Failed to fetch team workload:', workloadRes.data);
    process.exit(1);
  }

  const teams = workloadRes.data;
  console.log(`✅ Found ${teams.length} team(s):\n`);
  teams.forEach(t => {
    const icon = t.level === 'OVERLOADED' ? '🔴' : t.level === 'BUSY' ? '🟠' : '🟢';
    console.log(`  ${icon} ${t.name} (${t.role}) — ${t.workload} docs, ${t.utilizationRate}% utilization`);
  });

  // Step 2: Find CHEF_EQUIPE and GESTIONNAIRE targets
  console.log('\n📋 Step 2: Finding CHEF_EQUIPE and GESTIONNAIRE targets...');
  const usersRes = await apiCall('GET', '/api/users');
  if (usersRes.status !== 200) {
    console.error('❌ Failed to fetch users:', usersRes.data);
    process.exit(1);
  }

  const users = usersRes.data;
  const chefEquipes = users.filter(u => u.role === 'CHEF_EQUIPE' && u.active !== false);
  const gestionnaires = users.filter(u => u.role === 'GESTIONNAIRE' && u.active !== false);

  console.log(`✅ CHEF_EQUIPE: ${chefEquipes.length}`);
  chefEquipes.forEach(u => console.log(`   - ${u.fullName} (${u.id})`));
  console.log(`✅ GESTIONNAIRE: ${gestionnaires.length}`);
  gestionnaires.forEach(u => console.log(`   - ${u.fullName} (${u.id})`));

  if (chefEquipes.length === 0 && gestionnaires.length === 0) {
    console.error('\n❌ No CHEF_EQUIPE or GESTIONNAIRE found. Cannot test.');
    process.exit(1);
  }

  // Step 3: Pick source and target strategically
  // Source: busiest non-CHEF_EQUIPE team with docs (so we can reassign TO the chef)
  // Target for 5a: the CHEF_EQUIPE (Mohamed Frad)
  const nonChefSource =
    teams.filter(t => t.role !== 'CHEF_EQUIPE' && t.workload > 0)
         .sort((a, b) => b.workload - a.workload)[0];

  const chefEquipeTeam = teams.find(t => t.role === 'CHEF_EQUIPE');

  // Fallback to any overloaded team if no non-chef source found
  const sourceTeam = nonChefSource ||
    teams.find(t => t.level === 'OVERLOADED') ||
    teams.find(t => t.level === 'BUSY') ||
    teams.find(t => t.workload > 0);

  if (!sourceTeam) {
    console.error('\n❌ No team with documents found to use as source.');
    process.exit(1);
  }

  console.log(`\n📋 Step 3: Source team selected: ${sourceTeam.name} (${sourceTeam.utilizationRate}% utilization, ${sourceTeam.workload} docs)`);
  if (chefEquipeTeam) {
    console.log(`   🎯 CHEF_EQUIPE target: ${chefEquipeTeam.name} (${chefEquipeTeam.workload} docs)`);
  }

  // Step 4: Preview documents
  console.log('\n📋 Step 4: Previewing documents from source team...');
  const previewRes = await apiCall('POST', '/api/super-admin/get-documents-preview', {
    teamId: sourceTeam.id,
    count: 10
  });

  if ((previewRes.status !== 200 && previewRes.status !== 201) || !previewRes.data.documents?.length) {
    console.error('❌ No documents available for reassignment from source team.');
    console.log('   Response:', previewRes.data);
    process.exit(1);
  }

  console.log(`✅ ${previewRes.data.documents.length} document(s) available:`);
  previewRes.data.documents.slice(0, 5).forEach((doc, i) => {
    const status = doc.isOverdue ? '🔴 En retard' : doc.isUrgent ? '🟠 Urgent' : `🟢 ${doc.remainingDays}j restants`;
    console.log(`   ${i + 1}. ${doc.name} (${doc.type}) — ${status}`);
  });

  const results = [];

  // Step 5a: Reassign 2 docs TO the CHEF_EQUIPE (from the non-chef source)
  const chefTarget = chefEquipeTeam ? chefEquipes.find(u => u.id === chefEquipeTeam.id) : chefEquipes.find(u => u.id !== sourceTeam.id);
  if (chefTarget) {
    console.log(`\n📋 Step 5a: Reassigning 2 docs TO CHEF_EQUIPE: ${chefTarget.fullName} (from ${sourceTeam.name})...`);
    const res5a = await apiCall('POST', '/api/super-admin/execute-action', {
      action: 'REASSIGN',
      sourceTeamId: sourceTeam.id,
      splits: [{ teamId: chefTarget.id, count: 2 }]
    });
    if (res5a.status === 200 || res5a.status === 201) {
      if (res5a.data.success) {
        console.log(`✅ ${res5a.data.reassignedCount} doc(s) reassigned → ${res5a.data.targetTeam?.name || chefTarget.fullName}`);
        results.push({ role: 'CHEF_EQUIPE', user: chefTarget, count: res5a.data.reassignedCount });
      } else {
        console.log(`⚠️  ${res5a.data.message}`);
      }
    } else {
      console.log(`⚠️  Unexpected status ${res5a.status}:`, res5a.data);
    }
  } else {
    console.log(`\n📋 Step 5a: Skipping — no other CHEF_EQUIPE available (source is the only one).`);
  }

  // Step 5b: Reassign 2 docs to GESTIONNAIRE
  if (gestionnaires.length > 0) {
    const target = gestionnaires[0];
    console.log(`\n📋 Step 5b: Reassigning 2 docs to GESTIONNAIRE: ${target.fullName}...`);
    const res5b = await apiCall('POST', '/api/super-admin/execute-action', {
      action: 'REASSIGN',
      sourceTeamId: sourceTeam.id,
      splits: [{ teamId: target.id, count: 2 }]
    });
    if (res5b.status === 200 || res5b.status === 201) {
      if (res5b.data.success) {
        console.log(`✅ ${res5b.data.reassignedCount} doc(s) reassigned → ${res5b.data.targetTeam?.name || target.fullName}`);
        results.push({ role: 'GESTIONNAIRE', user: target, count: res5b.data.reassignedCount });
      } else {
        console.log(`⚠️  ${res5b.data.message}`);
      }
    } else {
      console.log(`⚠️  Unexpected status ${res5b.status}:`, res5b.data);
    }
  }

  // Step 6: Verify via reassigned-documents endpoints (skip if not implemented)
  console.log('\n📋 Step 6: Verifying via reassigned-documents endpoints...\n');

  for (const result of results) {
    const endpoint = result.role === 'CHEF_EQUIPE'
      ? `/api/super-admin/chef-equipe/reassigned-documents?userId=${result.user.id}`
      : `/api/super-admin/gestionnaire/reassigned-documents?userId=${result.user.id}`;

    const verifyRes = await apiCall('GET', endpoint);
    if (verifyRes.status === 200) {
      const total = verifyRes.data?.total ?? 0;
      const overdue = verifyRes.data?.documents?.filter(d => d.isOverdue).length ?? 0;
      const onTime = total - overdue;
      console.log(`✅ ${result.role}: ${result.user.fullName}`);
      console.log(`   Total: ${total} | 🔴 En retard: ${overdue} | 🟢 À jour: ${onTime}`);
    } else {
      console.log(`⚠️  Verification endpoint not found or failed for ${result.role}: ${verifyRes.status}`);
    }
    console.log(`   → Open their dashboard and check "Documents Réaffectés à Moi" section`);
    console.log('');
  }

  // Summary
  console.log('='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  results.forEach(r => {
    console.log(`${r.role}: ${r.user.fullName} (${r.user.email}) — ${r.count} doc(s) reassigned`);
  });
  console.log('\n✅ Done! Login as each user above and verify the "Documents Réaffectés à Moi" section.');
  console.log('='.repeat(70));
}

run().catch(err => {
  console.error('\n❌ Script failed:', err.message || err);
  process.exit(1);
});