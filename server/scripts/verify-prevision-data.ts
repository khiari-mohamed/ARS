import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 VERIFICATION: Prévision Tab Data\n');
  console.log('=' .repeat(80));
  
  // 1. Current System State
  console.log('\n📊 CURRENT SYSTEM STATE:');
  console.log('-'.repeat(80));
  
  const totalBordereaux = await prisma.bordereau.count();
  const activeBordereaux = await prisma.bordereau.count({
    where: { statut: { notIn: ['CLOTURE', 'PAYE'] } }
  });
  
  const totalDocuments = await prisma.document.count();
  const assignedDocuments = await prisma.document.count({
    where: { assignedToUserId: { not: null } }
  });
  
  const activeUsers = await prisma.user.count({
    where: {
      active: true,
      role: { in: ['GESTIONNAIRE', 'CHEF_EQUIPE'] }
    }
  });
  
  const gestionnaires = await prisma.user.count({
    where: { active: true, role: 'GESTIONNAIRE' }
  });
  
  const chefs = await prisma.user.count({
    where: { active: true, role: 'CHEF_EQUIPE' }
  });
  
  console.log(`Total Bordereaux: ${totalBordereaux}`);
  console.log(`Active Bordereaux (not closed): ${activeBordereaux}`);
  console.log(`Total Documents: ${totalDocuments}`);
  console.log(`Assigned Documents: ${assignedDocuments}`);
  console.log(`Active Users: ${activeUsers} (${chefs} Chef + ${gestionnaires} Gestionnaires)`);
  
  // 2. Historical Data Analysis (last 30 days)
  console.log('\n📈 HISTORICAL DATA (Last 30 Days):');
  console.log('-'.repeat(80));
  
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentBordereaux = await prisma.bordereau.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { createdAt: true }
  });
  
  console.log(`Bordereaux created in last 30 days: ${recentBordereaux.length}`);
  console.log(`Average per day: ${(recentBordereaux.length / 30).toFixed(2)}`);
  console.log(`Average per week: ${(recentBordereaux.length / 4.3).toFixed(2)}`);
  console.log(`Projected per month: ${Math.round(recentBordereaux.length)}`);
  
  // 3. Capacity Analysis
  console.log('\n💼 CAPACITY ANALYSIS:');
  console.log('-'.repeat(80));
  
  const users = await prisma.user.findMany({
    where: {
      active: true,
      role: { in: ['GESTIONNAIRE', 'CHEF_EQUIPE'] }
    },
    select: {
      fullName: true,
      role: true,
      capacity: true,
      assignedDocuments: {
        select: { id: true }
      }
    }
  });
  
  let totalCapacity = 0;
  let totalAssigned = 0;
  
  users.forEach(u => {
    const capacity = u.capacity || 20;
    const assigned = u.assignedDocuments.length;
    totalCapacity += capacity;
    totalAssigned += assigned;
    
    console.log(`${u.fullName} (${u.role}):`);
    console.log(`  Capacity: ${capacity}`);
    console.log(`  Assigned: ${assigned}`);
    console.log(`  Utilization: ${Math.round((assigned / capacity) * 100)}%`);
  });
  
  console.log(`\nTotal Capacity: ${totalCapacity}`);
  console.log(`Total Assigned: ${totalAssigned}`);
  console.log(`Overall Utilization: ${Math.round((totalAssigned / totalCapacity) * 100)}%`);
  
  // 4. Calculate Required Staff
  console.log('\n👥 STAFF REQUIREMENT CALCULATION:');
  console.log('-'.repeat(80));
  
  const avgPerWeek = recentBordereaux.length / 4.3;
  const avgDocumentsPerBordereau = totalDocuments / totalBordereaux;
  const expectedDocsPerWeek = avgPerWeek * avgDocumentsPerBordereau;
  
  console.log(`Expected bordereaux per week: ${avgPerWeek.toFixed(2)}`);
  console.log(`Average documents per bordereau: ${avgDocumentsPerBordereau.toFixed(2)}`);
  console.log(`Expected documents per week: ${expectedDocsPerWeek.toFixed(2)}`);
  
  const avgCapacityPerUser = totalCapacity / activeUsers;
  const requiredStaff = Math.ceil(expectedDocsPerWeek / avgCapacityPerUser);
  
  console.log(`Average capacity per user: ${avgCapacityPerUser.toFixed(2)}`);
  console.log(`Required staff (calculated): ${requiredStaff}`);
  console.log(`Current staff: ${activeUsers}`);
  console.log(`Difference: ${requiredStaff - activeUsers} (${requiredStaff > activeUsers ? 'need more' : 'can reduce'})`);
  
  // 5. Verify AI Predictions
  console.log('\n🤖 AI PREDICTION VERIFICATION:');
  console.log('-'.repeat(80));
  
  console.log('Frontend shows:');
  console.log('  - Prévision Semaine: 7 dossiers');
  console.log('  - Prévision Mois: 30 dossiers');
  console.log('  - Personnel Requis: 3 gestionnaires');
  console.log('  - Précision: 85%');
  
  console.log('\nCalculated from actual data:');
  console.log(`  - Actual avg per week: ${avgPerWeek.toFixed(2)} bordereaux`);
  console.log(`  - Actual per month: ${recentBordereaux.length} bordereaux`);
  console.log(`  - Required staff: ${requiredStaff} users`);
  
  console.log('\n✅ VERIFICATION RESULT:');
  console.log('-'.repeat(80));
  
  const weekMatch = Math.abs(avgPerWeek - 7) < 3;
  const monthMatch = Math.abs(recentBordereaux.length - 30) < 10;
  const staffMatch = Math.abs(requiredStaff - 3) <= 1;
  
  console.log(`Week forecast: ${weekMatch ? '✅ REASONABLE' : '⚠️ MISMATCH'} (AI: 7, Actual: ${avgPerWeek.toFixed(2)})`);
  console.log(`Month forecast: ${monthMatch ? '✅ REASONABLE' : '⚠️ MISMATCH'} (AI: 30, Actual: ${recentBordereaux.length})`);
  console.log(`Staff requirement: ${staffMatch ? '✅ REASONABLE' : '⚠️ MISMATCH'} (AI: 3, Calculated: ${requiredStaff})`);
  
  // 6. Business Logic Check
  console.log('\n🎯 BUSINESS LOGIC CHECK:');
  console.log('-'.repeat(80));
  
  if (totalAssigned > totalCapacity * 0.8) {
    console.log('⚠️ WARNING: System is at >80% capacity - consider adding staff');
  } else if (totalAssigned < totalCapacity * 0.5) {
    console.log('ℹ️ INFO: System is at <50% capacity - staff reduction may be possible');
  } else {
    console.log('✅ OK: System capacity utilization is healthy');
  }
  
  if (avgPerWeek < 10) {
    console.log('ℹ️ INFO: Low weekly volume - AI forecast of 7/week seems reasonable');
  }
  
  if (requiredStaff < activeUsers) {
    console.log(`💡 INSIGHT: Current staff (${activeUsers}) exceeds requirement (${requiredStaff}) - optimization possible`);
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
