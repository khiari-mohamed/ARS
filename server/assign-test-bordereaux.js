const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function assignTestBordereaux() {
  console.log('🔧 ASSIGNING TEST BORDEREAUX FOR TESTING');
  console.log('========================================\n');

  try {
    // Get a Gestionnaire (Leila Khediri)
    const gestionnaire = await prisma.user.findFirst({
      where: { 
        email: 'gestionnaire3@ars.tn',
        role: 'GESTIONNAIRE'
      }
    });

    if (!gestionnaire) {
      console.log('❌ Gestionnaire not found');
      return;
    }

    // Get some unassigned bordereaux
    const unassignedBordereaux = await prisma.bordereau.findMany({
      where: {
        assignedToUserId: null,
        archived: false,
        statut: { in: ['SCANNE', 'A_AFFECTER', 'EN_COURS'] }
      },
      take: 3
    });

    if (unassignedBordereaux.length === 0) {
      console.log('❌ No unassigned bordereaux found');
      return;
    }

    // Assign bordereaux to the gestionnaire
    const assignments = [];
    for (const bordereau of unassignedBordereaux) {
      const updated = await prisma.bordereau.update({
        where: { id: bordereau.id },
        data: { 
          assignedToUserId: gestionnaire.id,
          statut: 'ASSIGNE'
        }
      });
      assignments.push(updated);
    }

    console.log('✅ ASSIGNMENTS COMPLETED:');
    console.log('=========================');
    console.log(`👤 Gestionnaire: ${gestionnaire.fullName} (${gestionnaire.email})`);
    console.log(`📋 Assigned ${assignments.length} bordereaux:\n`);

    assignments.forEach((b, index) => {
      console.log(`${index + 1}. ${b.reference} - Status: ${b.statut}`);
    });

    console.log('\n🧪 NOW YOU CAN TEST:');
    console.log('===================');
    console.log('1. Login as: gestionnaire3@ars.tn / password123');
    console.log('2. Navigate to: http://localhost:3000/bordereaux');
    console.log('3. You should see:');
    console.log('   - All bordereaux visible (read-only)');
    console.log('   - 3 bordereaux marked as "📼 ASSIGNÉ" (modifiable)');
    console.log('   - Other bordereaux marked as "🔒 LECTURE" (read-only)');
    console.log('   - "✏️ Modifier" button only on assigned bordereaux');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignTestBordereaux();