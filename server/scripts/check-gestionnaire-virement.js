const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGestionnaireVirement() {
  try {
    console.log('🔍 Checking bordereaux for Mariem Abessi (Gestionnaire)...\n');

    // Find Mariem Abessi
    const gestionnaire = await prisma.user.findFirst({
      where: { email: 'mariem.abessi@arstunisie.com' }
    });

    if (!gestionnaire) {
      console.log('❌ Gestionnaire not found');
      return;
    }

    console.log(`✅ Found: ${gestionnaire.firstName || 'N/A'} ${gestionnaire.lastName || 'N/A'}`);
    console.log(`   Email: ${gestionnaire.email}`);
    console.log(`   Role: ${gestionnaire.role}\n`);

    // Get all bordereaux assigned to this gestionnaire
    const bordereaux = await prisma.bordereau.findMany({
      where: {
        assignedToUserId: gestionnaire.id
      },
      include: {
        client: true,
        ordresVirement: true
      },
      orderBy: { dateReception: 'desc' }
    });

    console.log(`📊 Total bordereaux assigned: ${bordereaux.length}\n`);

    // Filter VIREMENT_EXECUTE
    const virementExecute = bordereaux.filter(b => b.statut === 'VIREMENT_EXECUTE');
    const traite = bordereaux.filter(b => b.statut === 'TRAITE');

    console.log(`✅ VIREMENT_EXECUTE: ${virementExecute.length}`);
    console.log(`📋 TRAITE: ${traite.length}\n`);

    if (virementExecute.length > 0) {
      console.log('🎯 VIREMENT_EXECUTE Bordereaux:\n');
      virementExecute.forEach(b => {
        console.log(`📋 ${b.reference}`);
        console.log(`   Client: ${b.client?.name || 'N/A'}`);
        console.log(`   Statut: ${b.statut}`);
        console.log(`   delaiReglement: ${b.delaiReglement} jours`);
        console.log(`   dureeReglement: ${b.dureeReglement} jours`);
        console.log(`   OV count: ${b.ordresVirement?.length || 0}\n`);
      });
    } else {
      console.log('⚠️  NO VIREMENT_EXECUTE bordereaux found for this gestionnaire\n');
      console.log('📋 Sample TRAITE bordereaux (first 3):\n');
      traite.slice(0, 3).forEach(b => {
        console.log(`📋 ${b.reference}`);
        console.log(`   Client: ${b.client?.name || 'N/A'}`);
        console.log(`   Statut: ${b.statut}`);
        console.log(`   delaiReglement: ${b.delaiReglement} jours`);
        console.log(`   dureeReglement: ${b.dureeReglement || 'null'}\n`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkGestionnaireVirement();
