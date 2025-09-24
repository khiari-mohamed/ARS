const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAssignments() {
  console.log('🔍 CHECKING BORDEREAU ASSIGNMENTS');
  console.log('=================================\n');

  try {
    const gestionnaire = await prisma.user.findFirst({
      where: { email: 'test.gestionnaire@ars.tn' }
    });

    if (!gestionnaire) {
      console.log('❌ Gestionnaire not found');
      return;
    }

    const assignedBordereaux = await prisma.bordereau.findMany({
      where: { 
        assignedToUserId: gestionnaire.id,
        archived: false
      },
      include: { client: true }
    });

    console.log(`👤 Gestionnaire: ${gestionnaire.fullName}`);
    console.log(`🆔 ID: ${gestionnaire.id}\n`);

    console.log('📋 ASSIGNED BORDEREAUX:');
    console.log('=======================');
    if (assignedBordereaux.length === 0) {
      console.log('❌ No bordereaux assigned to this gestionnaire');
    } else {
      assignedBordereaux.forEach((b, index) => {
        console.log(`${index + 1}. ${b.reference}`);
        console.log(`   Status: ${b.statut}`);
        console.log(`   Client: ${b.client?.name || 'N/A'}`);
        console.log(`   Assigned To: ${b.assignedToUserId}`);
        console.log('');
      });
    }

    // Check what should be in "En cours" tab
    const enCoursFilter = ['EN_COURS', 'ASSIGNE'];
    const enCoursBordereaux = await prisma.bordereau.findMany({
      where: {
        statut: { in: enCoursFilter },
        archived: false
      },
      include: { client: true }
    });

    console.log('⏳ BORDEREAUX THAT SHOULD BE IN "EN COURS" TAB:');
    console.log('===============================================');
    if (enCoursBordereaux.length === 0) {
      console.log('❌ No bordereaux with EN_COURS or ASSIGNE status');
    } else {
      enCoursBordereaux.forEach((b, index) => {
        console.log(`${index + 1}. ${b.reference} - ${b.statut}`);
        console.log(`   Assigned to: ${b.assignedToUserId || 'Unassigned'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAssignments();