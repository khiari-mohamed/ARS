const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying GESTIONNAIRE_SENIOR data...\n');

  try {
    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: 'gestionnaire.senior@ars.tn' }
    });

    if (!user) {
      console.log('❌ User not found!');
      return;
    }

    console.log('✅ User found:', user.fullName, '(', user.id, ')');
    console.log('');

    // Get contracts assigned to this user
    const contracts = await prisma.contract.findMany({
      where: { teamLeaderId: user.id },
      include: { client: true }
    });

    console.log('📄 Contracts assigned:', contracts.length);
    contracts.forEach(c => {
      console.log(`   - ${c.codeAssure}: ${c.client.name}`);
    });
    console.log('');

    // Get bordereaux
    const bordereaux = await prisma.bordereau.findMany({
      where: {
        contract: { teamLeaderId: user.id }
      },
      include: { client: true, contract: true }
    });

    console.log('📋 Bordereaux found:', bordereaux.length);
    bordereaux.forEach(b => {
      console.log(`   - ${b.reference}: ${b.client.name} (${b.statut})`);
    });
    console.log('');

    // Get documents
    const documents = await prisma.document.findMany({
      where: {
        bordereau: {
          contract: { teamLeaderId: user.id }
        }
      },
      include: {
        bordereau: { include: { client: true } }
      }
    });

    console.log('📄 Documents found:', documents.length);
    console.log('   Sample documents:');
    documents.slice(0, 5).forEach(d => {
      console.log(`   - ${d.name}: ${d.bordereau?.client?.name || 'NO CLIENT'} (${d.type})`);
    });
    console.log('');

    // Check stats
    const stats = {
      prestation: documents.filter(d => d.type === 'BULLETIN_SOIN').length,
      adhesion: documents.filter(d => d.type === 'ADHESION').length,
      complement: documents.filter(d => d.type === 'COMPLEMENT_INFORMATION').length,
      reclamation: documents.filter(d => d.type === 'RECLAMATION').length,
      avenant: documents.filter(d => d.type === 'CONTRAT_AVENANT').length,
      resiliation: documents.filter(d => d.type === 'DEMANDE_RESILIATION').length
    };

    console.log('📊 Document Stats:');
    console.log('   Prestation:', stats.prestation);
    console.log('   Adhésion:', stats.adhesion);
    console.log('   Complément:', stats.complement);
    console.log('   Réclamation:', stats.reclamation);
    console.log('   Avenant:', stats.avenant);
    console.log('   Résiliation:', stats.resiliation);
    console.log('');

    console.log('✅ Verification complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
