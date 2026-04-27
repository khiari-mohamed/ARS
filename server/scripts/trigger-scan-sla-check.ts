import { PrismaClient } from '@prisma/client';
import { calculateScanSLA } from '../src/utils/scan-sla-calculator';

const prisma = new PrismaClient();

async function triggerScanSLACheck() {
  console.log('🚀 Starting SCAN SLA Check...\n');

  try {
    // 1. Find all bordereaux that need scanning
    const bordereaux = await prisma.bordereau.findMany({
      where: {
        scanStatus: {
          in: ['NON_SCANNE', 'SCAN_EN_COURS']
        },
        archived: false
      },
      include: {
        client: true
      }
    });

    console.log(`📋 Found ${bordereaux.length} bordereaux to check\n`);

    if (bordereaux.length === 0) {
      console.log('✅ No bordereaux found that need scanning');
      console.log('💡 Tip: Create a bordereau with scanStatus="NON_SCANNE" to test');
      return;
    }

    // 2. Check SLA for each bordereau
    const issues: any[] = [];
    
    for (const bordereau of bordereaux) {
      const sla = calculateScanSLA(bordereau.dateReception);
      
      console.log(`📄 Bordereau: ${bordereau.reference}`);
      console.log(`   Client: ${bordereau.client.name}`);
      console.log(`   Date Reception: ${bordereau.dateReception}`);
      console.log(`   Status: ${sla.status}`);
      console.log(`   Days Elapsed: ${sla.daysElapsed}`);
      console.log(`   Message: ${sla.message}\n`);

      if (sla.status !== 'OK') {
        issues.push({ bordereau, sla });
      }
    }

    // 3. Create notifications for issues
    if (issues.length === 0) {
      console.log('✅ All bordereaux are within SLA thresholds');
      return;
    }

    console.log(`\n⚠️  Found ${issues.length} SLA issues\n`);

    // Get SCAN team members
    const scanTeam = await prisma.user.findMany({
      where: { role: 'SCAN_TEAM' }
    });

    // Get Gestionnaires
    const gestionnaires = await prisma.user.findMany({
      where: {
        role: {
          in: ['GESTIONNAIRE', 'GESTIONNAIRE_SENIOR']
        }
      }
    });

    const recipients = [...scanTeam, ...gestionnaires];

    if (recipients.length === 0) {
      console.log('❌ No recipients found (SCAN_TEAM or GESTIONNAIRE roles)');
      console.log('💡 Create users with these roles to receive notifications');
      return;
    }

    console.log(`👥 Recipients: ${recipients.length} users`);
    console.log(`   - SCAN Team: ${scanTeam.length}`);
    console.log(`   - Gestionnaires: ${gestionnaires.length}\n`);

    // Create notifications
    let notificationCount = 0;

    for (const issue of issues) {
      const { bordereau, sla } = issue;

      for (const recipient of recipients) {
        await prisma.notification.create({
          data: {
            userId: recipient.id,
            type: 'SCAN_SLA_ALERT',
            title: `Alerte SLA SCAN - ${sla.status}`,
            message: `Bordereau ${bordereau.reference}: ${sla.message}`,
            data: {
              bordereauId: bordereau.id,
              reference: bordereau.reference,
              clientName: bordereau.client.name,
              daysElapsed: sla.daysElapsed,
              status: sla.status,
              dateReception: bordereau.dateReception
            },
            read: false
          }
        });

        notificationCount++;
      }

      // Create alert log
      await prisma.alertLog.create({
        data: {
          bordereauId: bordereau.id,
          alertType: 'SCAN_SLA_ALERT',
          alertLevel: sla.status === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
          message: `SLA SCAN dépassé: ${sla.message}`,
          notifiedRoles: ['SCAN_TEAM', 'GESTIONNAIRE']
        }
      });
    }

    console.log(`✅ Created ${notificationCount} notifications`);
    console.log(`✅ Created ${issues.length} alert logs\n`);

    console.log('🎉 SCAN SLA Check Complete!\n');
    console.log('📱 Check your UI:');
    console.log('   1. Notification bell (top-right) - should show red badge');
    console.log('   2. SCAN Dashboard - should show alerts');
    console.log('   3. Contracts Module - should show alert icons\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
triggerScanSLACheck();
