const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addHPEAdherents() {
  try {
    const hpeClient = await prisma.client.findFirst({
      where: { name: 'HPE' }
    });
    
    if (!hpeClient) {
      console.error('❌ HPE client not found!');
      process.exit(1);
    }
    
    console.log(`✅ Found HPE client: ${hpeClient.id}\n`);
    
    const adherents = [
      { matricule: '13542', nom: 'IBTISSEM', prenom: 'LAKHNACH', rib: '11002003113801378869', codeAssure: '4103', numeroContrat: 'A70240017', assurance: 'HPE' },
      { matricule: '66759', nom: 'HANEN', prenom: 'HSSAINIA', rib: '17002000000362000000', codeAssure: '4103', numeroContrat: 'A70240017', assurance: 'HPE' },
      { matricule: '99901', nom: 'MOHAMED', prenom: 'FATNASSI', rib: '17002000000287400000', codeAssure: '4103', numeroContrat: 'A70240017', assurance: 'HPE' },
      { matricule: '105934', nom: 'MAISSA', prenom: 'LAAMIRI', rib: '08208000000000000000', codeAssure: '4103', numeroContrat: 'A70240017', assurance: 'HPE' }
    ];
    
    for (const adherent of adherents) {
      await prisma.adherent.create({
        data: { ...adherent, statut: 'ACTIF', clientId: hpeClient.id }
      });
      console.log(`✅ Created: ${adherent.nom} ${adherent.prenom} - RIB: ${adherent.rib}`);
    }
    
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addHPEAdherents();
