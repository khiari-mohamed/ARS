const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestBordereaux() {
  try {
    console.log('🚀 Creating test bordereaux for Chef d\'Équipe module...');

    // Get existing clients
    const clients = await prisma.client.findMany({
      take: 3
    });

    if (clients.length === 0) {
      console.log('❌ No clients found. Please create clients first.');
      return;
    }

    // Get a manager for contracts
    const manager = await prisma.user.findFirst({
      where: { role: { in: ['CHEF_EQUIPE', 'SUPER_ADMIN'] } }
    });

    if (!manager) {
      console.log('❌ No manager found. Please create a chef d\'équipe or super admin first.');
      return;
    }

    // Create contracts if they don't exist
    for (const client of clients) {
      const existingContract = await prisma.contract.findFirst({
        where: { clientId: client.id }
      });

      if (!existingContract) {
        await prisma.contract.create({
          data: {
            clientId: client.id,
            clientName: client.name,
            assignedManagerId: manager.id,
            documentPath: `/contracts/${client.name.toLowerCase()}_contract.pdf`,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            delaiReglement: 30,
            delaiReclamation: 15
          }
        });
      }
    }

    // Create 15 non-assigned bordereaux (SCANNE status)
    const testBordereaux = [];
    
    for (let i = 1; i <= 15; i++) {
      const client = clients[Math.floor(Math.random() * clients.length)];
      const contract = await prisma.contract.findFirst({
        where: { clientId: client.id }
      });

      const bordereau = await prisma.bordereau.create({
        data: {
          reference: `TEST-${client.name.substring(0, 4).toUpperCase()}-${Date.now()}-${String(i).padStart(3, '0')}`,
          clientId: client.id,
          contractId: contract?.id,
          dateReception: new Date(),
          nombreBS: Math.floor(Math.random() * 50) + 10,
          statut: 'SCANNE',
          delaiReglement: 30,
          archived: false,
          assignedToUserId: null,
          currentHandlerId: null,
          teamId: null
        }
      });

      // Create document for each bordereau
      await prisma.document.create({
        data: {
          name: `Justificatifs_${bordereau.reference}.pdf`,
          type: 'JUSTIFICATIF',
          path: `/uploads/documents/${bordereau.reference}_justificatifs.pdf`,
          bordereauId: bordereau.id,
          uploadedById: manager.id
        }
      });

      testBordereaux.push(bordereau);
    }

    console.log(`✅ Created ${testBordereaux.length} non-assigned bordereaux (SCANNE status)`);
    console.log('\n🎉 Test data creation completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${testBordereaux.length} Non-assigned bordereaux ready for testing`);
    console.log('\n🧪 You can now test the Chef d\'Équipe module with:');
    console.log('   • Assignment functionality (Affecter)');
    console.log('   • Rejection functionality (Rejeter)');
    console.log('   • Personal handling (Traiter)');
    console.log('   • Bulk assignment');

  } catch (error) {
    console.error('❌ Error creating test bordereaux:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestBordereaux();