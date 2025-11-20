import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBordereauxGestionnaire() {
  console.log('\n=== CHECKING BORDEREAUX ASSIGNED TO GESTIONNAIRES ===\n');

  try {
    // Get all bordereaux with their assigned users
    const bordereaux = await prisma.bordereau.findMany({
      include: {
        currentHandler: true,
        team: true,
        chargeCompte: true,
        client: true,
        User: true // Many-to-many relation
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Total bordereaux in database: ${bordereaux.length}\n`);

    // Filter bordereaux assigned to gestionnaires
    const bordereauxWithGestionnaire = bordereaux.filter(bordereau => {
      const hasGestionnaireHandler = bordereau.currentHandler?.role?.toLowerCase().includes('gestionnaire');
      const hasGestionnaireTeam = bordereau.team?.role?.toLowerCase().includes('gestionnaire');
      const hasGestionnaireCharge = bordereau.chargeCompte?.role?.toLowerCase().includes('gestionnaire');
      const hasGestionnaireUsers = bordereau.User?.some(user => user.role?.toLowerCase().includes('gestionnaire'));
      
      return hasGestionnaireHandler || hasGestionnaireTeam || hasGestionnaireCharge || hasGestionnaireUsers;
    });

    console.log(`👥 Bordereaux assigned to gestionnaires: ${bordereauxWithGestionnaire.length}\n`);

    if (bordereauxWithGestionnaire.length > 0) {
      console.log('📋 DETAILED ASSIGNMENTS:\n');
      
      bordereauxWithGestionnaire.forEach((bordereau, index) => {
        console.log(`${index + 1}. Bordereau: ${bordereau.reference}`);
        console.log(`   Client: ${bordereau.client.name}`);
        console.log(`   Status: ${bordereau.statut}`);
        console.log(`   Type: ${bordereau.type}`);
        console.log(`   Created: ${bordereau.createdAt.toLocaleDateString()}`);
        
        if (bordereau.currentHandler?.role?.toLowerCase().includes('gestionnaire')) {
          console.log(`   ✅ Current Handler: ${bordereau.currentHandler.fullName} (${bordereau.currentHandler.role})`);
        }
        
        if (bordereau.team?.role?.toLowerCase().includes('gestionnaire')) {
          console.log(`   ✅ Team: ${bordereau.team.fullName} (${bordereau.team.role})`);
        }
        
        if (bordereau.chargeCompte?.role?.toLowerCase().includes('gestionnaire')) {
          console.log(`   ✅ Charge Compte: ${bordereau.chargeCompte.fullName} (${bordereau.chargeCompte.role})`);
        }
        
        if (bordereau.User?.some(user => user.role?.toLowerCase().includes('gestionnaire'))) {
          const gestionnaireUsers = bordereau.User.filter(user => user.role?.toLowerCase().includes('gestionnaire'));
          gestionnaireUsers.forEach(user => {
            console.log(`   ✅ Assigned User: ${user.fullName} (${user.role})`);
          });
        }
        
        console.log('');
      });
    }

    // Summary by gestionnaire
    console.log('\n📈 SUMMARY BY GESTIONNAIRE:\n');
    
    const gestionnaireStats = new Map();
    
    bordereauxWithGestionnaire.forEach(bordereau => {
      // Check current handler
      if (bordereau.currentHandler?.role?.toLowerCase().includes('gestionnaire')) {
        const key = `${bordereau.currentHandler.fullName} (${bordereau.currentHandler.email})`;
        gestionnaireStats.set(key, (gestionnaireStats.get(key) || 0) + 1);
      }
      
      // Check team
      if (bordereau.team?.role?.toLowerCase().includes('gestionnaire')) {
        const key = `${bordereau.team.fullName} (${bordereau.team.email})`;
        gestionnaireStats.set(key, (gestionnaireStats.get(key) || 0) + 1);
      }
      
      // Check charge compte
      if (bordereau.chargeCompte?.role?.toLowerCase().includes('gestionnaire')) {
        const key = `${bordereau.chargeCompte.fullName} (${bordereau.chargeCompte.email})`;
        gestionnaireStats.set(key, (gestionnaireStats.get(key) || 0) + 1);
      }
      
      // Check assigned users
      if (bordereau.User?.some(user => user.role?.toLowerCase().includes('gestionnaire'))) {
        const gestionnaireUsers = bordereau.User.filter(user => user.role?.toLowerCase().includes('gestionnaire'));
        gestionnaireUsers.forEach(user => {
          const key = `${user.fullName} (${user.email})`;
          gestionnaireStats.set(key, (gestionnaireStats.get(key) || 0) + 1);
        });
      }
    });

    if (gestionnaireStats.size > 0) {
      Array.from(gestionnaireStats.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([gestionnaire, count]) => {
          console.log(`👤 ${gestionnaire}: ${count} bordereau(x)`);
        });
    } else {
      console.log('❌ No bordereaux assigned to gestionnaires found');
    }

    // Status breakdown
    console.log('\n📊 STATUS BREAKDOWN:\n');
    const statusStats = new Map();
    bordereauxWithGestionnaire.forEach(bordereau => {
      statusStats.set(bordereau.statut, (statusStats.get(bordereau.statut) || 0) + 1);
    });

    Array.from(statusStats.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`📋 ${status}: ${count} bordereau(x)`);
      });

  } catch (error) {
    console.error('❌ Error checking bordereaux:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBordereauxGestionnaire()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });