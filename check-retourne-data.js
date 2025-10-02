const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRetourneData() {
  console.log('🔍 CHECKING RETOURNE DATA IN DATABASE');
  console.log('=====================================\n');

  try {
    // Check all bordereaux statuses
    console.log('📊 ALL BORDEREAU STATUSES:');
    const allStatuses = await prisma.bordereau.groupBy({
      by: ['statut'],
      _count: {
        statut: true
      }
    });
    
    allStatuses.forEach(status => {
      console.log(`  ${status.statut}: ${status._count.statut} bordereaux`);
    });
    
    console.log('\n🔍 SEARCHING FOR RETOURNE/RETURNED STATUSES:');
    
    // Check for RETOURNE status specifically
    const retourneCount = await prisma.bordereau.count({
      where: { statut: 'RETOURNE' }
    });
    console.log(`  RETOURNE: ${retourneCount} bordereaux`);
    
    // Check for similar statuses
    const similarStatuses = ['RETURNED', 'RETOURNÉ', 'RETOUR', 'REJETE', 'REJECTED'];
    for (const status of similarStatuses) {
      const count = await prisma.bordereau.count({
        where: { statut: status }
      });
      if (count > 0) {
        console.log(`  ${status}: ${count} bordereaux`);
      }
    }
    
    console.log('\n📋 SAMPLE BORDEREAUX WITH DIFFERENT STATUSES:');
    const sampleBordereaux = await prisma.bordereau.findMany({
      take: 10,
      select: {
        id: true,
        reference: true,
        statut: true,
        assignedToUserId: true,
        currentHandlerId: true
      }
    });
    
    sampleBordereaux.forEach(b => {
      console.log(`  ${b.reference}: ${b.statut} (assigned: ${b.assignedToUserId || 'none'}, handler: ${b.currentHandlerId || 'none'})`);
    });
    
    console.log('\n🎯 CHECKING USER ASSIGNMENTS:');
    const usersWithBordereaux = await prisma.user.findMany({
      where: {
        role: 'GESTIONNAIRE'
      },
      include: {
        assignedBordereaux: {
          select: {
            id: true,
            reference: true,
            statut: true
          }
        },
        handledBordereaux: {
          select: {
            id: true,
            reference: true,
            statut: true
          }
        }
      }
    });
    
    usersWithBordereaux.forEach(user => {
      console.log(`\n👤 ${user.fullName} (${user.email}):`);
      console.log(`  Assigned: ${user.assignedBordereaux.length} bordereaux`);
      console.log(`  Handling: ${user.handledBordereaux.length} bordereaux`);
      
      if (user.assignedBordereaux.length > 0) {
        const statusCounts = {};
        user.assignedBordereaux.forEach(b => {
          statusCounts[b.statut] = (statusCounts[b.statut] || 0) + 1;
        });
        console.log(`  Status breakdown:`, statusCounts);
      }
    });
    
    console.log('\n💡 RECOMMENDATIONS:');
    if (retourneCount === 0) {
      console.log('  ❌ No RETOURNE status found in database');
      console.log('  🔧 Need to create test data with RETOURNE status');
      console.log('  📝 Or check if the status name is different (RETOURNÉ, RETURNED, etc.)');
    } else {
      console.log('  ✅ RETOURNE status exists in database');
      console.log('  🔍 Check user assignments and filtering logic');
    }
    
  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRetourneData();