const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding reclamations for gestionnaire...');

  // Get existing gestionnaire
  const gestionnaire = await prisma.user.findFirst({
    where: { role: 'GESTIONNAIRE' }
  });

  if (!gestionnaire) {
    console.error('❌ No gestionnaire found');
    return;
  }

  console.log(`✅ Found gestionnaire: ${gestionnaire.fullName} (${gestionnaire.id})`);

  // Get existing client
  const client = await prisma.client.findFirst();
  if (!client) {
    console.error('❌ No client found');
    return;
  }

  console.log(`✅ Using client: ${client.name}`);

  // Create 10 simple reclamations
  const reclamations = [];
  for (let i = 1; i <= 10; i++) {
    const reclamation = await prisma.reclamation.create({
      data: {
        clientId: client.id,
        type: 'REMBOURSEMENT',
        severity: i <= 3 ? 'critical' : i <= 6 ? 'medium' : 'low',
        status: i <= 4 ? 'OPEN' : i <= 7 ? 'IN_PROGRESS' : 'RESOLVED',
        description: `Réclamation ${i} - Problème de remboursement`,
        assignedToId: i <= 8 ? gestionnaire.id : null,
        createdById: gestionnaire.id,
        department: 'RECLAMATIONS'
      }
    });

    // Add history
    await prisma.reclamationHistory.create({
      data: {
        reclamationId: reclamation.id,
        userId: gestionnaire.id,
        action: 'CREATE',
        toStatus: reclamation.status,
        description: 'Réclamation créée'
      }
    });

    reclamations.push(reclamation);
  }

  console.log(`✅ Created ${reclamations.length} reclamations`);
  console.log(`📊 Stats:`);
  console.log(`   - Assigned to gestionnaire: ${reclamations.filter(r => r.assignedToId === gestionnaire.id).length}`);
  console.log(`   - OPEN: ${reclamations.filter(r => r.status === 'OPEN').length}`);
  console.log(`   - IN_PROGRESS: ${reclamations.filter(r => r.status === 'IN_PROGRESS').length}`);
  console.log(`   - RESOLVED: ${reclamations.filter(r => r.status === 'RESOLVED').length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());