const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAdherents() {
  console.log('🌱 Seeding adherents from Excel data...');

  try {
    // Get first client
    let client = await prisma.client.findFirst();
    
    if (!client) {
      console.log('Creating default client...');
      client = await prisma.client.create({
        data: {
          name: 'ARS TUNISIE',
          reglementDelay: 30,
          reclamationDelay: 15,
          email: 'contact@ars.tn',
          phone: '00000000',
          address: 'Tunis'
        }
      });
    }

    console.log('✅ Using client:', client.name, client.id);

    // Adherents from your Excel file
    const adherents = [
      { matricule: '202309', nom: 'ABASSI', prenom: 'ARBI', rib: '05009000028531626001' },
      { matricule: '100043', nom: 'ABDELLI', prenom: 'AKREM', rib: '05005000021501105466' },
      { matricule: '100099', nom: 'SASSI', prenom: 'WALID', rib: '05301000011531112337' },
      { matricule: '101510', nom: 'BEN SASSI', prenom: 'SAMEH', rib: '04034120004133661179' },
      { matricule: '101050', nom: 'BEN YOUNESS', prenom: 'FARAH', rib: '05602000073583001578' },
      { matricule: '100129', nom: 'BOUSSARSAR', prenom: 'MOHAMED', rib: '05203000072501857048' },
      { matricule: '100141', nom: 'EL OURIE', prenom: 'MOHAMED AMINE', rib: '05009000028502545110' },
      { matricule: '100111', nom: 'HABBOUBI', prenom: 'JED', rib: '05046000114500583061' },
      { matricule: '100147', nom: 'HOUAIDI', prenom: 'HASSEN', rib: '05203000072501249731' },
      { matricule: '100188', nom: 'JABRI', prenom: 'MEHREZ', rib: '14096096100700909592' },
      { matricule: '100070', nom: 'KALAI', prenom: 'TAREK', rib: '05019000090501439080' },
      { matricule: '104304', nom: 'KEFI', prenom: 'SELIM', rib: '05019000090500967272' },
      { matricule: '102383', nom: 'KHAIRI', prenom: 'MOHAMED', rib: '05005000021500026535' },
      { matricule: '100064', nom: 'SASSI', prenom: 'WALID', rib: '05301000011531112337' },
      { matricule: '100038', nom: 'SBAA', prenom: 'SEIFEDDINE', rib: '05501000014535770584' }
    ];

    let created = 0;
    let skipped = 0;

    for (const adherent of adherents) {
      try {
        // Check if already exists
        const existing = await prisma.adherent.findFirst({
          where: {
            matricule: adherent.matricule,
            clientId: client.id
          }
        });

        if (existing) {
          console.log(`⏭️  Skipping ${adherent.matricule} - already exists`);
          skipped++;
          continue;
        }

        // Create adherent
        await prisma.adherent.create({
          data: {
            matricule: adherent.matricule,
            nom: adherent.nom,
            prenom: adherent.prenom,
            rib: adherent.rib,
            clientId: client.id,
            statut: 'ACTIF',
            codeAssure: `ASS${adherent.matricule}`,
            numeroContrat: `CONT${adherent.matricule}`
          }
        });

        console.log(`✅ Created adherent: ${adherent.matricule} - ${adherent.nom} ${adherent.prenom}`);
        created++;
      } catch (error) {
        console.error(`❌ Failed to create ${adherent.matricule}:`, error.message);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${adherents.length}`);
    console.log('\n✅ Seeding complete!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdherents();
