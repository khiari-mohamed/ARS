import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSLADistribution() {
  console.log('🔍 Checking SLA Distribution...\n');
  
  try {
    // This is how the backend calculates SLA status
    // critical: delaiReglement > 5
    // warning: delaiReglement > 3 AND <= 5
    // ok: delaiReglement <= 3
    
    const critical = await prisma.bordereau.findMany({
      where: { delaiReglement: { gt: 5 } },
      select: {
        id: true,
        reference: true,
        delaiReglement: true,
        dateReception: true,
        statut: true
      }
    });
    
    const warning = await prisma.bordereau.findMany({
      where: { 
        delaiReglement: { gt: 3, lte: 5 }
      },
      select: {
        id: true,
        reference: true,
        delaiReglement: true,
        dateReception: true,
        statut: true
      }
    });
    
    const ok = await prisma.bordereau.findMany({
      where: { delaiReglement: { lte: 3 } },
      select: {
        id: true,
        reference: true,
        delaiReglement: true,
        dateReception: true,
        statut: true
      }
    });
    
    console.log('📊 SLA Distribution Results:\n');
    console.log(`🔴 En retard (delaiReglement > 5): ${critical.length}`);
    console.log(`🟠 À risque (delaiReglement > 3 AND <= 5): ${warning.length}`);
    console.log(`🟢 À temps (delaiReglement <= 3): ${ok.length}`);
    console.log(`\n📈 Total: ${critical.length + warning.length + ok.length}`);
    
    // Show calculation logic
    console.log('\n\n📝 How "En retard" is calculated:');
    console.log('   The backend uses the "delaiReglement" field directly');
    console.log('   ❌ WRONG: delaiReglement is the SLA THRESHOLD (e.g., 30 days)');
    console.log('   ✅ CORRECT: Should calculate days since dateReception');
    
    // Show correct calculation
    console.log('\n\n✅ CORRECT Calculation (days since reception):');
    
    const allBordereaux = await prisma.bordereau.findMany({
      select: {
        id: true,
        reference: true,
        delaiReglement: true,
        dateReception: true,
        statut: true
      }
    });
    
    const now = new Date();
    let correctCritical = 0;
    let correctWarning = 0;
    let correctOk = 0;
    
    const criticalExamples: any[] = [];
    
    for (const b of allBordereaux) {
      if (!b.dateReception) continue;
      
      const daysSinceReception = Math.floor(
        (now.getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const slaThreshold = b.delaiReglement || 30;
      
      if (daysSinceReception > slaThreshold) {
        correctCritical++;
        if (criticalExamples.length < 5) {
          criticalExamples.push({
            reference: b.reference,
            daysSinceReception,
            slaThreshold,
            daysOverdue: daysSinceReception - slaThreshold
          });
        }
      } else if (daysSinceReception > slaThreshold - 2) {
        correctWarning++;
      } else {
        correctOk++;
      }
    }
    
    console.log(`🔴 En retard (days > SLA threshold): ${correctCritical}`);
    console.log(`🟠 À risque (days > SLA - 2): ${correctWarning}`);
    console.log(`🟢 À temps (days <= SLA - 2): ${correctOk}`);
    
    if (criticalExamples.length > 0) {
      console.log('\n\n📋 Examples of "En retard" bordereaux:');
      criticalExamples.forEach((ex, i) => {
        console.log(`   ${i + 1}. ${ex.reference}: ${ex.daysSinceReception} days (SLA: ${ex.slaThreshold} days) - ${ex.daysOverdue} days overdue`);
      });
    }
    
    console.log('\n\n🔧 Fix Required:');
    console.log('   Update analytics.service.ts getAlerts() method to:');
    console.log('   1. Calculate daysSinceReception = (now - dateReception) / (1000 * 60 * 60 * 24)');
    console.log('   2. Compare daysSinceReception with delaiReglement (SLA threshold)');
    console.log('   3. critical: daysSinceReception > delaiReglement');
    console.log('   4. warning: daysSinceReception > (delaiReglement - 2)');
    console.log('   5. ok: daysSinceReception <= (delaiReglement - 2)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSLADistribution();
