const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addFieldcoreAdherents() {
  try {
    console.log('🔍 Finding FIELDCORE client...');
    
    const fieldcoreClient = await prisma.client.findFirst({
      where: { name: 'FIELDCORE' }
    });
    
    if (!fieldcoreClient) {
      console.error('❌ FIELDCORE client not found in database!');
      console.log('Available clients:');
      const clients = await prisma.client.findMany();
      clients.forEach(c => console.log(`  - ${c.name} (${c.id})`));
      process.exit(1);
    }
    
    console.log(`✅ Found FIELDCORE client: ${fieldcoreClient.id}`);
    
    const adherents = [
      {
        matricule: '13542',
        nom: 'IBTISSEM',
        prenom: 'LAKHNACH',
        rib: '11002003113801378869',
        codeAssure: '4103',
        numeroContrat: 'A70240017',
        assurance: 'FIELDCORE'
      },
      {
        matricule: '66759',
        nom: 'HANEN',
        prenom: 'HSSAINIA',
        rib: '17002000000362000000',
        codeAssure: '4103',
        numeroContrat: 'A70240017',
        assurance: 'FIELDCORE'
      },
      {
        matricule: '99901',
        nom: 'MOHAMED',
        prenom: 'FATNASSI',
        rib: '17002000000287400000',
        codeAssure: '4103',
        numeroContrat: 'A70240017',
        assurance: 'FIELDCORE'
      },
      {
        matricule: '105934',
        nom: 'MAISSA',
        prenom: 'LAAMIRI',
        rib: '08208000000000000000',
        codeAssure: '4103',
        numeroContrat: 'A70240017',
        assurance: 'FIELDCORE'
      }
    ];
    
    console.log(`\n📝 Adding ${adherents.length} adherents to FIELDCORE...\n`);
    
    for (const adherent of adherents) {
      try {
        const existing = await prisma.adherent.findFirst({
          where: {
            matricule: adherent.matricule,
            clientId: fieldcoreClient.id
          }
        });
        
        if (existing) {
          console.log(`⚠️  Matricule ${adherent.matricule} already exists - updating...`);
          await prisma.adherent.update({
            where: { id: existing.id },
            data: {
              nom: adherent.nom,
              prenom: adherent.prenom,
              rib: adherent.rib,
              codeAssure: adherent.codeAssure,
              numeroContrat: adherent.numeroContrat,
              assurance: adherent.assurance,
              statut: 'ACTIF'
            }
          });
          console.log(`   ✅ Updated: ${adherent.nom} ${adherent.prenom} - RIB: ${adherent.rib}`);
        } else {
          await prisma.adherent.create({
            data: {
              matricule: adherent.matricule,
              nom: adherent.nom,
              prenom: adherent.prenom,
              rib: adherent.rib,
              codeAssure: adherent.codeAssure,
              numeroContrat: adherent.numeroContrat,
              assurance: adherent.assurance,
              statut: 'ACTIF',
              clientId: fieldcoreClient.id
            }
          });
          console.log(`   ✅ Created: ${adherent.nom} ${adherent.prenom} - RIB: ${adherent.rib}`);
        }
      } catch (error) {
        console.error(`   ❌ Failed for matricule ${adherent.matricule}:`, error.message);
      }
    }
    
    console.log('\n✅ Done! All adherents added to FIELDCORE.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addFieldcoreAdherents();
