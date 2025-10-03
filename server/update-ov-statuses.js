const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateOVStatuses() {
  console.log('\n🔄 Updating OV statuses for testing...\n');

  try {
    const allOVs = await prisma.ordreVirement.findMany({
      orderBy: { dateCreation: 'asc' }
    });

    if (allOVs.length < 3) {
      console.log('❌ Need at least 3 OVs to update statuses');
      return;
    }

    // Update first OV to EN_COURS_EXECUTION
    await prisma.ordreVirement.update({
      where: { id: allOVs[0].id },
      data: {
        etatVirement: 'EN_COURS_EXECUTION',
        dateTraitement: new Date(),
        utilisateurFinance: 'demo-user'
      }
    });
    console.log(`✅ ${allOVs[0].reference} → EN_COURS_EXECUTION`);

    // Update second OV to EXECUTE
    await prisma.ordreVirement.update({
      where: { id: allOVs[1].id },
      data: {
        etatVirement: 'EXECUTE',
        dateTraitement: new Date(),
        dateEtatFinal: new Date(),
        utilisateurFinance: 'demo-user'
      }
    });
    console.log(`✅ ${allOVs[1].reference} → EXECUTE`);

    // Update third OV to REJETE
    await prisma.ordreVirement.update({
      where: { id: allOVs[2].id },
      data: {
        etatVirement: 'REJETE',
        dateTraitement: new Date(),
        dateEtatFinal: new Date(),
        utilisateurFinance: 'demo-user',
        motifObservation: 'RIB invalide'
      }
    });
    console.log(`✅ ${allOVs[2].reference} → REJETE`);

    // Update fourth OV to EXECUTE_PARTIELLEMENT
    if (allOVs.length > 3) {
      await prisma.ordreVirement.update({
        where: { id: allOVs[3].id },
        data: {
          etatVirement: 'EXECUTE_PARTIELLEMENT',
          dateTraitement: new Date(),
          utilisateurFinance: 'demo-user',
          motifObservation: 'Certains RIB rejetés'
        }
      });
      console.log(`✅ ${allOVs[3].reference} → EXECUTE_PARTIELLEMENT`);
    }

    console.log('\n✅ OV statuses updated successfully!');
    console.log('\nNow refresh TAB 1 (Dashboard) and TAB 6 (Historique) to see charts! 📊\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateOVStatuses();
