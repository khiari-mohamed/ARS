import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseDepartmentStats() {
  console.log('='.repeat(80));
  console.log('DIAGNOSTIC: Department Statistics Analysis');
  console.log('='.repeat(80));
  console.log();

  // 1. Get all bordereaux with their status
  const bordereaux = await prisma.bordereau.findMany({
    where: { archived: false },
    select: {
      id: true,
      reference: true,
      statut: true,
      currentHandler: {
        select: {
          fullName: true,
          department: true,
          role: true
        }
      },
      assignedToUserId: true,
      client: {
        select: { name: true }
      }
    }
  });

  console.log(`📊 Total Bordereaux (non-archived): ${bordereaux.length}`);
  console.log();

  // 2. Group by status
  const statusGroups = bordereaux.reduce((acc, b) => {
    if (!acc[b.statut]) acc[b.statut] = [];
    acc[b.statut].push(b);
    return acc;
  }, {} as Record<string, typeof bordereaux>);

  console.log('📋 Bordereaux by Status:');
  console.log('-'.repeat(80));
  Object.entries(statusGroups).forEach(([status, items]) => {
    console.log(`  ${status}: ${items.length} bordereaux`);
  });
  console.log();

  // 3. Map status to department (using the same logic as backend)
  const mapStatusToDepartment = (status: string): string => {
    const mapping = {
      'EN_ATTENTE': "Bureau d'Ordre",
      'A_SCANNER': "Bureau d'Ordre",
      'SCAN_EN_COURS': 'Service SCAN',
      'SCANNE': 'Service SCAN',
      'A_AFFECTER': "Chef d'Équipe",
      'ASSIGNE': 'Gestionnaire',
      'EN_COURS': 'Gestionnaire',
      'TRAITE': 'Gestionnaire',
      'PRET_VIREMENT': 'Finance',
      'VIREMENT_EN_COURS': 'Finance',
      'VIREMENT_EXECUTE': 'Finance',
      'CLOTURE': 'Clôturé'
    };
    return mapping[status] || 'Inconnu';
  };

  // 4. Group by department (based on status)
  const deptStats: Record<string, Record<string, number>> = {};
  
  bordereaux.forEach(b => {
    const dept = mapStatusToDepartment(b.statut);
    const status = b.statut;
    
    if (!deptStats[dept]) deptStats[dept] = {};
    if (!deptStats[dept][status]) deptStats[dept][status] = 0;
    deptStats[dept][status]++;
  });

  console.log('🏢 Department Statistics (Status-Based Mapping):');
  console.log('-'.repeat(80));
  Object.entries(deptStats).forEach(([dept, statuses]) => {
    const total = Object.values(statuses).reduce((sum, count) => sum + count, 0);
    console.log(`\n  ${dept}: ${total} total`);
    Object.entries(statuses).forEach(([status, count]) => {
      console.log(`    - ${status}: ${count}`);
    });
  });
  console.log();

  // 5. Check currentHandler department vs status-based department
  console.log('🔍 Comparison: currentHandler.department vs Status-Based Department:');
  console.log('-'.repeat(80));
  
  const mismatches: any[] = [];
  bordereaux.forEach(b => {
    const statusBasedDept = mapStatusToDepartment(b.statut);
    const handlerDept = b.currentHandler?.department || 'Non Affecté';
    
    if (statusBasedDept !== handlerDept) {
      mismatches.push({
        reference: b.reference,
        status: b.statut,
        statusBasedDept,
        handlerDept,
        handler: b.currentHandler?.fullName || 'None'
      });
    }
  });

  if (mismatches.length > 0) {
    console.log(`⚠️  Found ${mismatches.length} mismatches between status-based and handler-based departments:`);
    console.log();
    mismatches.slice(0, 10).forEach(m => {
      console.log(`  Bordereau: ${m.reference}`);
      console.log(`    Status: ${m.status}`);
      console.log(`    Status-Based Dept: ${m.statusBasedDept}`);
      console.log(`    Handler Dept: ${m.handlerDept}`);
      console.log(`    Handler: ${m.handler}`);
      console.log();
    });
    if (mismatches.length > 10) {
      console.log(`  ... and ${mismatches.length - 10} more mismatches`);
    }
  } else {
    console.log('✅ All bordereaux have matching status-based and handler-based departments');
  }
  console.log();

  // 6. Check assignment status
  console.log('👤 Assignment Status:');
  console.log('-'.repeat(80));
  const assigned = bordereaux.filter(b => b.assignedToUserId !== null).length;
  const unassigned = bordereaux.filter(b => b.assignedToUserId === null).length;
  console.log(`  Assigned: ${assigned}`);
  console.log(`  Unassigned: ${unassigned}`);
  console.log();

  // 7. Sample data for each status
  console.log('📄 Sample Bordereaux by Status:');
  console.log('-'.repeat(80));
  Object.entries(statusGroups).forEach(([status, items]) => {
    const sample = items[0];
    console.log(`\n  ${status} (${items.length} total):`);
    console.log(`    Sample: ${sample.reference}`);
    console.log(`    Client: ${sample.client.name}`);
    console.log(`    Assigned To: ${sample.assignedToUserId ? 'Yes' : 'No'}`);
    console.log(`    Handler: ${sample.currentHandler?.fullName || 'None'}`);
    console.log(`    Handler Dept: ${sample.currentHandler?.department || 'None'}`);
    console.log(`    Status-Based Dept: ${mapStatusToDepartment(status)}`);
  });
  console.log();

  // 8. Check if the issue is with the frontend or backend
  console.log('='.repeat(80));
  console.log('ANALYSIS:');
  console.log('='.repeat(80));
  
  console.log('\n1. EXPECTED BEHAVIOR (Status-Based):');
  Object.entries(deptStats).forEach(([dept, statuses]) => {
    const total = Object.values(statuses).reduce((sum, count) => sum + count, 0);
    console.log(`   ${dept}: ${total} dossiers`);
    Object.entries(statuses).forEach(([status, count]) => {
      console.log(`     - ${status}: ${count}`);
    });
  });

  console.log('\n2. WHAT FRONTEND IS SHOWING:');
  console.log('   Based on your screenshot:');
  console.log('   - Gestionnaire: 1 (TRAITE)');
  console.log('   - Bureau d\'Ordre: 6 (A_SCANNER)');
  console.log('   - Finance: 6 (VIREMENT_EXECUTE)');
  console.log('   - Total: 13');

  console.log('\n3. COMPARISON:');
  const frontendTotal = 13;
  const backendTotal = bordereaux.length;
  
  if (frontendTotal !== backendTotal) {
    console.log(`   ⚠️  MISMATCH: Frontend shows ${frontendTotal} but database has ${backendTotal}`);
    console.log(`   This suggests the frontend is filtering or the API is returning filtered data`);
  } else {
    console.log(`   ✅ Total count matches (${frontendTotal})`);
  }

  // Check if the status distribution matches
  const frontendData = {
    'Gestionnaire': { 'TRAITE': 1 },
    "Bureau d'Ordre": { 'A_SCANNER': 6 },
    'Finance': { 'VIREMENT_EXECUTE': 6 }
  };

  console.log('\n4. STATUS DISTRIBUTION COMPARISON:');
  let distributionMatches = true;
  Object.entries(frontendData).forEach(([dept, statuses]) => {
    Object.entries(statuses).forEach(([status, count]) => {
      const backendCount = deptStats[dept]?.[status] || 0;
      const match = backendCount === count;
      console.log(`   ${dept} - ${status}: Frontend=${count}, Backend=${backendCount} ${match ? '✅' : '❌'}`);
      if (!match) distributionMatches = false;
    });
  });

  console.log('\n5. CONCLUSION:');
  if (distributionMatches && frontendTotal === backendTotal) {
    console.log('   ✅ Frontend is displaying correct data from backend');
    console.log('   ✅ The logic is working as expected');
  } else if (frontendTotal !== backendTotal) {
    console.log('   ❌ Frontend is showing filtered data or using a different query');
    console.log('   🔍 Check if there are filters applied in the frontend');
    console.log('   🔍 Check if the API endpoint has additional WHERE clauses');
  } else {
    console.log('   ❌ Status distribution mismatch');
    console.log('   🔍 The mapStatusToDepartment logic might be incorrect');
    console.log('   🔍 Or the frontend is using different status values');
  }

  console.log('\n6. RECOMMENDATION:');
  if (assigned === 0 && unassigned === backendTotal) {
    console.log('   ⚠️  ALL bordereaux are unassigned (assignedToUserId is NULL)');
    console.log('   ⚠️  This is consistent with the document assignment issue found earlier');
    console.log('   💡 The department statistics are based on STATUS, not assignment');
    console.log('   💡 This is CORRECT behavior - departments are determined by workflow stage');
  }

  console.log('='.repeat(80));

  await prisma.$disconnect();
}

diagnoseDepartmentStats().catch(console.error);
