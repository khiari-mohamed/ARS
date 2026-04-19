import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseActiveAlerts() {
  console.log('================================================================================');
  console.log('DIAGNOSTIC: Active Alerts Analysis');
  console.log('================================================================================\n');

  try {
    // Get all bordereaux with their status and alert logs
    const bordereaux = await prisma.bordereau.findMany({
      where: { archived: false },
      include: {
        client: { select: { name: true } },
        AlertLog: {
          select: {
            id: true,
            resolved: true,
            alertType: true,
            alertLevel: true,
            createdAt: true,
            resolvedAt: true
          }
        },
        documents: {
          select: { type: true }
        }
      },
      orderBy: { dateReception: 'asc' }
    });

    console.log(`📊 Total Bordereaux (non-archived): ${bordereaux.length}\n`);

    // Categorize bordereaux
    const completed = bordereaux.filter(b => 
      ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE', 'PAYE', 'PRET_VIREMENT'].includes(b.statut)
    );
    
    const withResolvedAlerts = bordereaux.filter(b => 
      b.AlertLog.length > 0 && b.AlertLog.every(log => log.resolved)
    );
    
    const shouldShowInActiveAlerts = bordereaux.filter(b => {
      // Exclude completed/treated (SLA stops at TRAITE)
      if (['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE', 'PAYE', 'PRET_VIREMENT'].includes(b.statut)) return false;
      // Exclude if all alerts are resolved
      if (b.AlertLog.length > 0 && b.AlertLog.every(log => log.resolved)) return false;
      return true;
    });

    console.log('📋 Categorization:');
    console.log('--------------------------------------------------------------------------------');
    console.log(`✅ Completed/Treated (TRAITE/VIREMENT_EXECUTE/CLOTURE/PAYE): ${completed.length}`);
    console.log(`✅ With All Alerts Resolved: ${withResolvedAlerts.length}`);
    console.log(`⚠️  Should Show in Active Alerts: ${shouldShowInActiveAlerts.length}\n`);

    // Show completed/treated bordereaux that should NOT appear in active alerts
    console.log('🚫 Completed/Treated Bordereaux (Should NOT appear in active alerts):');
    console.log('--------------------------------------------------------------------------------');
    if (completed.length === 0) {
      console.log('  None found\n');
    } else {
      completed.slice(0, 10).forEach(b => {
        const daysSince = b.dateReception 
          ? Math.floor((Date.now() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        console.log(`  - ${b.reference}`);
        console.log(`    Client: ${b.client?.name || 'N/A'}`);
        console.log(`    Status: ${b.statut}`);
        console.log(`    Days since reception: ${daysSince}`);
        console.log(`    Alert logs: ${b.AlertLog.length} (${b.AlertLog.filter(l => !l.resolved).length} unresolved)`);
        console.log('');
      });
    }

    // Show bordereaux with all alerts resolved
    console.log('\n✅ Bordereaux with All Alerts Resolved (Should NOT appear in active alerts):');
    console.log('--------------------------------------------------------------------------------');
    if (withResolvedAlerts.length === 0) {
      console.log('  None found\n');
    } else {
      withResolvedAlerts.slice(0, 10).forEach(b => {
        console.log(`  - ${b.reference}`);
        console.log(`    Client: ${b.client?.name || 'N/A'}`);
        console.log(`    Status: ${b.statut}`);
        console.log(`    Alert logs: ${b.AlertLog.length} (all resolved)`);
        console.log('');
      });
    }

    // Show bordereaux that SHOULD appear in active alerts
    console.log('\n⚠️  Bordereaux That SHOULD Appear in Active Alerts:');
    console.log('--------------------------------------------------------------------------------');
    if (shouldShowInActiveAlerts.length === 0) {
      console.log('  None found (all alerts resolved or bordereaux completed)\n');
    } else {
      shouldShowInActiveAlerts.slice(0, 10).forEach(b => {
        const daysSince = b.dateReception 
          ? Math.floor((Date.now() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        const slaThreshold = b.delaiReglement || 30;
        const percentElapsed = (daysSince / slaThreshold) * 100;
        
        let alertLevel = 'green';
        if (percentElapsed > 100) alertLevel = 'red';
        else if (percentElapsed > 80) alertLevel = 'orange';
        
        console.log(`  - ${b.reference}`);
        console.log(`    Client: ${b.client?.name || 'N/A'}`);
        console.log(`    Status: ${b.statut}`);
        console.log(`    Days since reception: ${daysSince} / ${slaThreshold} (${Math.round(percentElapsed)}%)`);
        console.log(`    Alert level: ${alertLevel}`);
        console.log(`    Alert logs: ${b.AlertLog.length} (${b.AlertLog.filter(l => !l.resolved).length} unresolved)`);
        console.log(`    Documents: ${b.documents.length} (${b.documents.filter(d => d.type === 'BULLETIN_SOIN').length} BS)`);
        console.log('');
      });
    }

    // Summary
    console.log('\n================================================================================');
    console.log('SUMMARY');
    console.log('================================================================================');
    console.log(`Total Bordereaux: ${bordereaux.length}`);
    console.log(`  - Completed (excluded): ${completed.length}`);
    console.log(`  - All alerts resolved (excluded): ${withResolvedAlerts.length}`);
    console.log(`  - Should show in active alerts: ${shouldShowInActiveAlerts.length}`);
    
    console.log('\n✅ FIXES APPLIED:');
    console.log('  1. SLA calculation stops after TRAITE (treatment complete)');
    console.log('  2. Completed/treated bordereaux (TRAITE, VIREMENT_EXECUTE, CLOTURE, PAYE) excluded from active alerts');
    console.log('  3. Bordereaux with all alerts resolved excluded from active alerts');
    
    console.log('\n📌 VERIFICATION:');
    const problematicCompleted = completed.filter(b => 
      b.AlertLog.some(log => !log.resolved)
    );
    if (problematicCompleted.length > 0) {
      console.log(`  ⚠️  ${problematicCompleted.length} completed bordereaux still have unresolved alerts`);
      console.log('     These should be manually resolved or will be auto-resolved by the system');
    } else {
      console.log('  ✅ No completed bordereaux with unresolved alerts');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseActiveAlerts();
