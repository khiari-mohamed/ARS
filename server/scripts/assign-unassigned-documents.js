const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignUnassignedDocuments() {
  console.log('================================================================================');
  console.log('📝 ASSIGNING UNASSIGNED DOCUMENTS TO GESTIONNAIRE');
  console.log('================================================================================\n');

  try {
    const chef = await prisma.user.findFirst({
      where: { email: 'chef@mail.com', role: 'CHEF_EQUIPE' }
    });

    if (!chef) {
      console.log('❌ Chef not found');
      return;
    }

    console.log('👤 CHEF D\'ÉQUIPE: chef1\n');

    const gestionnaire = await prisma.user.findFirst({
      where: { 
        fullName: 'gestion',
        role: 'GESTIONNAIRE',
        teamLeaderId: chef.id
      }
    });

    if (!gestionnaire) {
      console.log('❌ Gestionnaire not found');
      return;
    }

    console.log('👤 GESTIONNAIRE: gestion\n');

    // Find unassigned documents that have a bordereau
    const unassignedDocuments = await prisma.document.findMany({
      where: {
        assignedToUserId: null,
        bordereauId: { not: null }
      }
    });

    console.log(`📄 FOUND ${unassignedDocuments.length} UNASSIGNED DOCUMENTS\n`);

    if (unassignedDocuments.length === 0) {
      console.log('✅ No unassigned documents\n');
      return;
    }

    console.log('🔄 ASSIGNING...\n');

    const result = await prisma.document.updateMany({
      where: {
        id: { in: unassignedDocuments.map(d => d.id) }
      },
      data: {
        assignedToUserId: gestionnaire.id,
        assignedAt: new Date()
      }
    });

    console.log(`✅ ASSIGNED ${result.count} DOCUMENTS TO gestion\n`);
    console.log('================================================================================');
    console.log('✅ COMPLETE');
    console.log('================================================================================');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

assignUnassignedDocuments();
