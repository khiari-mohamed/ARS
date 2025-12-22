import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAlerts() {
  console.log('🔍 Verifying alert system...\n');
  
  try {
    // Check current alerts
    const alerts = await prisma.alertLog.findMany({
      where: {
        resolved: false
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            fullName: true,
            capacity: true
          }
        }
      }
    });

    console.log(`📊 Active Alerts: ${alerts.length}\n`);

    // Group by type
    const byType = alerts.reduce((acc, alert) => {
      if (!acc[alert.alertType]) acc[alert.alertType] = [];
      acc[alert.alertType].push(alert);
      return acc;
    }, {} as Record<string, any[]>);

    for (const [type, typeAlerts] of Object.entries(byType)) {
      console.log(`\n${type}: ${typeAlerts.length} alert(s)`);
      
      for (const alert of typeAlerts) {
        console.log(`  - ${alert.message}`);
        console.log(`    Level: ${alert.alertLevel}`);
        console.log(`    User: ${alert.user?.fullName || 'N/A'}`);
        console.log(`    Created: ${alert.createdAt.toLocaleString()}`);
      }
    }

    // Check for duplicates
    console.log('\n\n🔍 Checking for duplicates...');
    const duplicateCheck = alerts.reduce((acc, alert) => {
      const key = `${alert.alertType}-${alert.userId || 'null'}-${alert.bordereauId || 'null'}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(alert);
      return acc;
    }, {} as Record<string, any[]>);

    let hasDuplicates = false;
    for (const [key, group] of Object.entries(duplicateCheck)) {
      if (group.length > 1) {
        console.log(`❌ Found ${group.length} duplicates for: ${key}`);
        hasDuplicates = true;
      }
    }

    if (!hasDuplicates) {
      console.log('✅ No duplicates found!');
    }

    // Check team capacities
    console.log('\n\n👥 Team Capacities:');
    const chefs = await prisma.user.findMany({
      where: { role: 'CHEF_EQUIPE' }
    });

    for (const chef of chefs) {
      const gestionnaires = await prisma.user.findMany({
        where: { 
          teamLeaderId: chef.id,
          role: 'GESTIONNAIRE'
        }
      });

      const totalCapacity = (chef.capacity || 0) + 
        gestionnaires.reduce((sum, g) => sum + (g.capacity || 0), 0);

      const workload = await prisma.bordereau.count({
        where: {
          statut: { notIn: ['CLOTURE', 'PAYE'] },
          OR: [
            { teamId: chef.id },
            { currentHandlerId: { in: [chef.id, ...gestionnaires.map(g => g.id)] } }
          ]
        }
      });

      const utilization = totalCapacity > 0 ? Math.round((workload / totalCapacity) * 100) : 0;

      console.log(`\n  ${chef.fullName}:`);
      console.log(`    Chef capacity: ${chef.capacity || 0}`);
      console.log(`    Gestionnaires: ${gestionnaires.length} (capacity: ${gestionnaires.reduce((sum, g) => sum + (g.capacity || 0), 0)})`);
      console.log(`    TOTAL CAPACITY: ${totalCapacity}`);
      console.log(`    Current workload: ${workload}`);
      console.log(`    Utilization: ${utilization}%`);
    }

    console.log('\n✅ Verification complete!');
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAlerts();
