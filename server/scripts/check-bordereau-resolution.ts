import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBordereauResolution() {
  console.log('🔍 Checking Bordereau Resolution Logic...\n');
  
  const bordereauReference = 'CET-BULLETIN-2026-56426';
  
  try {
    // 1. Get the bordereau with all related data
    const bordereau = await prisma.bordereau.findFirst({
      where: { reference: bordereauReference },
      include: {
        client: true,
        contract: true,
        currentHandler: true,
        team: true,
        chargeCompte: true,
        documents: true,
        virement: true,
        AlertLog: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: true
          }
        }
      }
    });

    if (!bordereau) {
      console.log(`❌ Bordereau ${bordereauReference} not found!`);
      return;
    }

    console.log('📋 BORDEREAU DETAILS:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Reference: ${bordereau.reference}`);
    console.log(`Client: ${bordereau.client?.name || 'N/A'}`);
    console.log(`Status: ${bordereau.statut}`);
    console.log(`Created At: ${bordereau.createdAt.toLocaleString('fr-FR')}`);
    console.log(`Updated At: ${bordereau.updatedAt.toLocaleString('fr-FR')}`);
    console.log(`Date Reception: ${bordereau.dateReception?.toLocaleString('fr-FR') || 'N/A'}`);
    console.log(`Date Cloture: ${bordereau.dateCloture?.toLocaleString('fr-FR') || 'N/A'}`);
    console.log(`Date Reelle Cloture: ${bordereau.dateReelleCloture?.toLocaleString('fr-FR') || 'N/A'}`);
    console.log(`Current Handler: ${bordereau.currentHandler?.fullName || 'N/A'}`);
    console.log(`Team: ${bordereau.team?.fullName || 'N/A'}`);
    console.log(`Charge Compte: ${bordereau.chargeCompte?.fullName || 'N/A'}`);
    console.log(`Delai Reglement: ${bordereau.delaiReglement} days`);
    console.log(`Contract Delai: ${bordereau.contract?.delaiReglement || 'N/A'} days`);
    console.log(`Nombre BS: ${bordereau.nombreBS}`);
    console.log(`Priority: ${bordereau.priority}`);
    console.log(`Archived: ${bordereau.archived}`);
    console.log(`Virement: ${bordereau.virement ? 'YES' : 'NO'}`);
    
    if (bordereau.virement) {
      console.log(`  - Montant: ${bordereau.virement.montant}`);
      console.log(`  - Confirmed: ${bordereau.virement.confirmed}`);
      console.log(`  - Date Depot: ${bordereau.virement.dateDepot.toLocaleString('fr-FR')}`);
      console.log(`  - Date Execution: ${bordereau.virement.dateExecution.toLocaleString('fr-FR')}`);
    }

    console.log(`\n📄 DOCUMENTS (${bordereau.documents.length}):`);
    bordereau.documents.forEach((doc, idx) => {
      console.log(`  ${idx + 1}. ${doc.name} - Status: ${doc.status || 'N/A'} - Type: ${doc.type}`);
    });

    // 2. Calculate SLA status
    console.log('\n⏱️  SLA ANALYSIS:');
    console.log('═══════════════════════════════════════════════════════════');
    const now = new Date();
    const daysSinceReception = bordereau.dateReception 
      ? Math.round((now.getTime() - new Date(bordereau.dateReception).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const slaThreshold = bordereau.contract?.delaiReglement || bordereau.delaiReglement || 30;
    const percentElapsed = (daysSinceReception / slaThreshold) * 100;
    
    console.log(`Days Since Reception: ${daysSinceReception} days`);
    console.log(`SLA Threshold: ${slaThreshold} days`);
    console.log(`Percent Elapsed: ${percentElapsed.toFixed(2)}%`);
    console.log(`SLA Status: ${percentElapsed > 100 ? '🔴 BREACH' : percentElapsed > 80 ? '🟠 AT RISK' : '🟢 ON TIME'}`);

    // 3. Get all alerts for this bordereau
    console.log(`\n🚨 ALERT HISTORY (${bordereau.AlertLog.length} alerts):`);
    console.log('═══════════════════════════════════════════════════════════');
    
    if (bordereau.AlertLog.length === 0) {
      console.log('No alerts found for this bordereau.');
    } else {
      bordereau.AlertLog.forEach((alert, idx) => {
        console.log(`\n${idx + 1}. Alert ID: ${alert.id}`);
        console.log(`   Type: ${alert.alertType}`);
        console.log(`   Level: ${alert.alertLevel}`);
        console.log(`   Message: ${alert.message}`);
        console.log(`   Created: ${alert.createdAt.toLocaleString('fr-FR')}`);
        console.log(`   Resolved: ${alert.resolved ? '✅ YES' : '❌ NO'}`);
        if (alert.resolved) {
          console.log(`   Resolved At: ${alert.resolvedAt?.toLocaleString('fr-FR') || 'N/A'}`);
          console.log(`   Resolved By: ${alert.user?.fullName || 'System'} (${alert.user?.role || 'N/A'})`);
          
          // Calculate resolution time
          const createdTime = new Date(alert.createdAt).getTime();
          const resolvedTime = alert.resolvedAt ? new Date(alert.resolvedAt).getTime() : Date.now();
          const resolutionHours = Math.round((resolvedTime - createdTime) / (1000 * 60 * 60));
          console.log(`   Resolution Time: ${resolutionHours}h (${Math.floor(resolutionHours / 24)}d ${resolutionHours % 24}h)`);
        }
        console.log(`   Notified Roles: ${alert.notifiedRoles.join(', ')}`);
      });
    }

    // 4. Check resolution logic
    console.log('\n🔍 RESOLUTION LOGIC CHECK:');
    console.log('═══════════════════════════════════════════════════════════');
    
    const resolvedAlerts = bordereau.AlertLog.filter(a => a.resolved);
    const unresolvedAlerts = bordereau.AlertLog.filter(a => !a.resolved);
    
    console.log(`Total Alerts: ${bordereau.AlertLog.length}`);
    console.log(`Resolved Alerts: ${resolvedAlerts.length}`);
    console.log(`Unresolved Alerts: ${unresolvedAlerts.length}`);
    
    console.log('\n📊 EXPECTED BEHAVIOR:');
    console.log('─────────────────────────────────────────────────────────');
    console.log('An alert should be marked as RESOLVED when:');
    console.log('  1. ✅ Bordereau status changes to CLOTURE');
    console.log('  2. ✅ User manually calls resolveAlert() endpoint');
    console.log('  3. ✅ The underlying issue (SLA breach, overload) is fixed');
    
    console.log('\n🎯 CURRENT STATE ANALYSIS:');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`Bordereau Status: ${bordereau.statut}`);
    console.log(`Is CLOTURE: ${bordereau.statut === 'CLOTURE' ? '✅ YES' : '❌ NO'}`);
    console.log(`Should alerts be resolved: ${bordereau.statut === 'CLOTURE' ? '✅ YES' : '❌ NO (status not CLOTURE)'}`);
    
    if (bordereau.statut === 'CLOTURE' && unresolvedAlerts.length > 0) {
      console.log('\n⚠️  WARNING: Bordereau is CLOTURE but has unresolved alerts!');
      console.log('This might indicate:');
      console.log('  - Alerts were created AFTER closure');
      console.log('  - Resolution logic did not trigger properly');
      console.log('  - Manual intervention needed');
    }
    
    if (bordereau.statut !== 'CLOTURE' && resolvedAlerts.length > 0) {
      console.log('\n⚠️  WARNING: Bordereau is NOT CLOTURE but has resolved alerts!');
      console.log('This might indicate:');
      console.log('  - Alerts were manually resolved');
      console.log('  - Status was changed back from CLOTURE');
      console.log('  - Data inconsistency');
    }

    // 5. Check traitement history
    console.log('\n📜 TRAITEMENT HISTORY:');
    console.log('═══════════════════════════════════════════════════════════');
    const history = await prisma.traitementHistory.findMany({
      where: { bordereauId: bordereau.id },
      orderBy: { createdAt: 'desc' },
      include: { user: true, assignedTo: true }
    });
    
    if (history.length === 0) {
      console.log('No traitement history found.');
    } else {
      history.forEach((h, idx) => {
        console.log(`${idx + 1}. ${h.action} - ${h.fromStatus || 'N/A'} → ${h.toStatus || 'N/A'}`);
        console.log(`   By: ${h.user?.fullName || 'N/A'} at ${h.createdAt.toLocaleString('fr-FR')}`);
        if (h.assignedTo) {
          console.log(`   Assigned To: ${h.assignedTo.fullName}`);
        }
      });
    }

    // 6. Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('═══════════════════════════════════════════════════════════');
    
    if (bordereau.statut === 'CLOTURE' && unresolvedAlerts.length > 0) {
      console.log('🔧 ACTION NEEDED: Run this SQL to fix unresolved alerts:');
      console.log(`\nUPDATE "AlertLog" SET resolved = true, "resolvedAt" = NOW(), "userId" = (SELECT id FROM "User" WHERE role = 'SUPER_ADMIN' LIMIT 1) WHERE "bordereauId" = '${bordereau.id}' AND resolved = false;\n`);
    }
    
    if (bordereau.statut !== 'CLOTURE' && percentElapsed > 100) {
      console.log('⚠️  ALERT: Bordereau has SLA breach but is not closed!');
      console.log('Consider:');
      console.log('  - Escalating to team leader');
      console.log('  - Reassigning to available gestionnaire');
      console.log('  - Investigating blockers');
    }
    
    if (bordereau.statut === 'CLOTURE' && !bordereau.dateCloture) {
      console.log('⚠️  DATA ISSUE: Status is CLOTURE but dateCloture is NULL!');
      console.log('This should be set when status changes to CLOTURE.');
    }

    console.log('\n✅ Analysis Complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBordereauResolution();
