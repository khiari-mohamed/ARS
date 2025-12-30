import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding reference data...');

  // Create or get donneur d'ordre
  let donneurOrdre = await prisma.donneurOrdre.findFirst({
    where: { rib: '04001007404700411649' },
  });

  if (!donneurOrdre) {
    donneurOrdre = await prisma.donneurOrdre.create({
      data: {
        nom: 'ARS EX "AON TUNISIE S.A."',
        rib: '04001007404700411649',
        banque: 'ATTIJARI',
        structureTxt: 'ATTIJARI',
        formatTxtType: 'ATTIJARI',
      },
    });
  }

  console.log('✅ Donneur d\'ordre created:', donneurOrdre.nom);

  // Create client
  let client = await prisma.client.findFirst({
    where: { name: 'AON TUNISIE' },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        name: 'AON TUNISIE',
        email: 'contact@aon.tn',
        address: 'Tunis',
        reglementDelay: 30,
        reclamationDelay: 15,
      },
    });
  }

  console.log('✅ Client created:', client.name);

  // Reference adherents data
  const adherentsData = [
    { matricule: '7100636', nom: 'CHAIEB', prenom: 'FATHIA', rib: '25096000000095904242', montant: 67.900 },
    { matricule: '5133560', nom: 'AGREBI', prenom: 'IBRAHIM AGREBI', rib: '12022000000219568597', montant: 43.149 },
    { matricule: '7042216', nom: 'KOLSI', prenom: 'MAHMOUD KOLSI', rib: '08102000732007927011', montant: 275.027 },
    { matricule: '7073102', nom: 'BJEOUI', prenom: 'SARRA HABIBI', rib: '12022000000211591511', montant: 58.803 },
    { matricule: '7075852', nom: 'DAKHLAOUI', prenom: 'MOHAMED DAKHLAOUI', rib: '12022000000204649027', montant: 136.787 },
    { matricule: '7175893', nom: 'ADOULI', prenom: 'ZIED', rib: '14076076100701211125', montant: 42.638 },
    { matricule: '7201255', nom: 'RAZGALLAH', prenom: 'YOUSSEF', rib: '07081013910551424371', montant: 42.344 },
    { matricule: '7896047', nom: 'ZAMMAMI', prenom: 'AYMEN ZAMMAMI', rib: '07081013910550843438', montant: 85.000 },
    { matricule: '9134327', nom: 'CHANDOUL', prenom: 'HAMZA CHANDOUL', rib: '17901000000160296226', montant: 421.160 },
    { matricule: '9284847', nom: 'MOHAMED SALAH', prenom: 'ESSAIED', rib: '08019011022006473534', montant: 121.411 },
    { matricule: '9606404', nom: 'OUNALLI', prenom: 'HAMDI', rib: '17001000000300042431', montant: 213.433 },
    { matricule: '9608646', nom: 'BEN RABEH', prenom: 'SOUAD', rib: '14076076100701201231', montant: 1567.546 },
  ];

  // Create adherents
  const adherentIds: { [key: string]: string } = {};
  for (const data of adherentsData) {
    let adherent = await prisma.adherent.findFirst({
      where: {
        matricule: data.matricule,
        clientId: client.id,
      },
    });

    if (!adherent) {
      adherent = await prisma.adherent.create({
        data: {
          matricule: data.matricule,
          nom: data.nom,
          prenom: data.prenom,
          rib: data.rib,
          statut: 'ACTIF',
          clientId: client.id,
        },
      });
    }
    adherentIds[data.matricule] = adherent.id;
  }

  console.log(`✅ ${adherentsData.length} adherents created`);

  // Create ordre de virement
  const ordreVirement = await prisma.ordreVirement.create({
    data: {
      reference: 'REF-TEST-2024',
      dateCreation: new Date('2024-12-24'),
      donneurOrdreId: donneurOrdre.id,
      utilisateurSante: 'SYSTEM',
      montantTotal: adherentsData.reduce((sum, d) => sum + d.montant, 0),
      nombreAdherents: adherentsData.length,
    },
  });

  // Create items
  for (const data of adherentsData) {
    await prisma.virementItem.create({
      data: {
        montant: data.montant,
        statut: 'VALIDE',
        ordreVirementId: ordreVirement.id,
        adherentId: adherentIds[data.matricule],
      },
    });
  }

  const items = await prisma.virementItem.findMany({
    where: { ordreVirementId: ordreVirement.id },
  });

  console.log('✅ Ordre de virement created:', ordreVirement.reference);
  console.log(`   - ID: ${ordreVirement.id}`);
  console.log(`   - Items: ${items.length}`);
  console.log(`   - Total: ${adherentsData.reduce((sum, d) => sum + d.montant, 0).toFixed(3)} TND`);
  console.log('\n🎯 Use this ID to test TXT generation:', ordreVirement.id);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
