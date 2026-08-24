// Verify Finance Module Data
// This script checks the current data structure to understand the mapping

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking Finance Module Data Structure...\n');

  // Check OrdreVirement with all related data
  const ordresVirement = await prisma.ordreVirement.findMany({
    take: 3,
    include: {
      bordereau: {
        include: {
          client: true,
          contract: true
        }
      },
      donneurOrdre: true,
      contract: true,
      client: true,
      items: {
        take: 2,
        include: {
          adherent: true
        }
      }
    }
  });

  console.log('📊 Ordre de Virement Data:');
  console.log('='.repeat(80));
  
  for (const ov of ordresVirement) {
    console.log(`\n🔸 OV: ${ov.reference}`);
    console.log(`   Mode Récupération: ${ov.client?.modeRecuperation || ov.bordereau?.client?.modeRecuperation || 'N/A'}`);
    console.log(`   Nom Donneur: ${ov.donneurOrdre?.nom || 'N/A'}`);
    console.log(`   Contract.codeAssure (from bordereau): ${ov.bordereau?.contract?.codeAssure || 'N/A'}`);
    console.log(`   Contract.codeAssure (direct): ${ov.contract?.codeAssure || 'N/A'}`);
    
    if (ov.items.length > 0) {
      console.log(`\n   📝 Adherents in this OV:`);
      for (const item of ov.items) {
        console.log(`      - ${item.adherent.nom} ${item.adherent.prenom}`);
        console.log(`        Matricule: ${item.adherent.matricule}`);
        console.log(`        Code Assuré: ${item.adherent.codeAssure || 'N/A'}`);
        console.log(`        Numéro Contrat: ${item.adherent.numeroContrat || 'N/A'}`);
        console.log(`        RIB: ${item.adherent.rib}`);
        console.log(`        Montant: ${item.montant} TND`);
      }
    }
    console.log('');
  }

  // Check Donneurs d'Ordre
  console.log('\n📊 Donneurs d\'Ordre:');
  console.log('='.repeat(80));
  const donneurs = await prisma.donneurOrdre.findMany({
    take: 5
  });
  
  for (const donneur of donneurs) {
    console.log(`   ${donneur.nom} (${donneur.banque})`);
    console.log(`   RIB: ${donneur.rib}`);
    console.log(`   Code Journal: ${donneur.codeJournal || 'N/A'}`);
    console.log(`   Compte Trésorerie: ${donneur.compteTresorerie || 'N/A'}`);
    console.log('');
  }

  // Check Clients with modeRecuperation
  console.log('\n📊 Clients with Mode Récupération:');
  console.log('='.repeat(80));
  const clients = await prisma.client.findMany({
    where: {
      modeRecuperation: { not: null }
    },
    take: 5
  });
  
  for (const client of clients) {
    console.log(`   ${client.name}: ${client.modeRecuperation}`);
  }

  console.log('\n✅ Data verification complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
