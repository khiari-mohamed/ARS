const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetAndInsertAdherents() {
  console.log('🧹 Step 1: Deleting all old data...\n');

  // Delete in correct order (foreign key constraints)
  const deletedItems = await prisma.virementItem.deleteMany({});
  console.log(`✅ Deleted ${deletedItems.count} VirementItem records`);

  const deletedHistorique = await prisma.virementHistorique.deleteMany({});
  console.log(`✅ Deleted ${deletedHistorique.count} VirementHistorique records`);

  const deletedSuivi = await prisma.suiviVirement.deleteMany({});
  console.log(`✅ Deleted ${deletedSuivi.count} SuiviVirement records`);

  const deletedOVDocs = await prisma.oVDocument.deleteMany({});
  console.log(`✅ Deleted ${deletedOVDocs.count} OVDocument records`);

  const deletedOV = await prisma.ordreVirement.deleteMany({});
  console.log(`✅ Deleted ${deletedOV.count} OrdreVirement records`);

  const deletedAdherents = await prisma.adherent.deleteMany({});
  console.log(`✅ Deleted ${deletedAdherents.count} old Adherent records\n`);

  console.log('📥 Step 2: Inserting 20 new adherents from Excel...\n');

  // Get GAT Assurances client ID
  const client = await prisma.client.findFirst({
    where: { name: { contains: 'GAT' } }
  });

  if (!client) {
    throw new Error('Client GAT Assurances not found! Please create it first.');
  }

  const adherents = [
    { matricule: 'M001', nom: 'BENGAGI', prenom: 'ZIED', rib: '14043043100702168352', assurance: 'ARS TUNISIE' },
    { matricule: 'M002', nom: 'SAIDANI', prenom: 'Hichem', rib: '14015015100704939295', assurance: 'ARS TUNISIE' },
    { matricule: 'M003', nom: 'NEFZI', prenom: 'MOHEB', rib: '08081023082003208516', assurance: 'ARS TUNISIE' },
    { matricule: 'M004', nom: 'LTIFI', prenom: 'ADEL', rib: '14067067100701418590', assurance: 'ARS TUNISIE' },
    { matricule: 'M005', nom: 'RAJHI', prenom: 'HAMZA', rib: '14067067100700641135', assurance: 'ARS TUNISIE' },
    { matricule: 'M006', nom: 'ARIDHI', prenom: 'LATIFA', rib: '07016007810558352528', assurance: 'ARS TUNISIE' },
    { matricule: 'M007', nom: 'EZZIDINI', prenom: 'KHALED', rib: '07016007810582292128', assurance: 'ARS TUNISIE' },
    { matricule: 'M008', nom: 'OUHIBI', prenom: 'SAMEH', rib: '14008008100709748250', assurance: 'ARS TUNISIE' },
    { matricule: 'M009', nom: 'CHALLAKH', prenom: 'MOHAMED', rib: '07016007810581731953', assurance: 'ARS TUNISIE' },
    { matricule: 'M010', nom: 'MOHAMED', prenom: 'BEN MLOUKA', rib: '08019011022001723056', assurance: 'ARS TUNISIE' },
    { matricule: 'M011', nom: 'RAJHI', prenom: 'RAOUF', rib: '20032322220051647331', assurance: 'ARS TUNISIE' },
    { matricule: 'M012', nom: 'AYMEN', prenom: 'ARBOUJ', rib: '07077013510552050124', assurance: 'ARS TUNISIE' },
    { matricule: 'M013', nom: 'BEN SLIMENE', prenom: 'SOUFIENE', rib: '17001000000089830627', assurance: 'ARS TUNISIE' },
    { matricule: 'M014', nom: 'KOUKI', prenom: 'HABIB', rib: '08047020022002526737', assurance: 'ARS TUNISIE' },
    { matricule: 'M015', nom: 'MAROUENI', prenom: 'MOETAZ', rib: '17206000000178121860', assurance: 'ARS TUNISIE' },
    { matricule: 'M016', nom: 'TOUNEKTI', prenom: 'ANIS', rib: '07018008610554386262', assurance: 'ARS TUNISIE' },
    { matricule: 'M017', nom: 'OUESLATI', prenom: 'MAJED', rib: '14207207100714066409', assurance: 'ARS TUNISIE' },
    { matricule: 'M018', nom: 'REBII', prenom: 'ABDSATAR', rib: '17606000000210085633', assurance: 'ARS TUNISIE' },
    { matricule: 'M019', nom: 'BOUKHATMI', prenom: 'HAFEDH', rib: '20024242220001496968', assurance: 'ARS TUNISIE' },
    { matricule: 'M020', nom: 'KOBTANE', prenom: 'ANIS', rib: '25044000000121815088', assurance: 'ARS TUNISIE' }
  ];

  for (const adherent of adherents) {
    await prisma.adherent.create({
      data: {
        matricule: adherent.matricule,
        nom: adherent.nom,
        prenom: adherent.prenom,
        rib: adherent.rib,
        assurance: adherent.assurance,
        statut: 'ACTIF',
        clientId: client.id
      }
    });
    console.log(`✅ ${adherent.matricule} - ${adherent.nom} ${adherent.prenom}`);
  }

  console.log('\n🎉 SUCCESS! All 20 adherents inserted!');
  console.log('\n📋 Next steps:');
  console.log('1. Go to Finance module');
  console.log('2. Create new Ordre de Virement');
  console.log('3. Upload the Excel file');
  console.log('4. Generate TXT file');

  await prisma.$disconnect();
}

resetAndInsertAdherents().catch(console.error);
