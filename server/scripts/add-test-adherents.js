const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find or create default client
  let client = await prisma.client.findFirst({
    where: { name: 'ARS TUNISIE' }
  });

  if (!client) {
    console.log('Creating default client...');
    client = await prisma.client.create({
      data: {
        name: 'ARS TUNISIE',
        reglementDelay: 30,
        reclamationDelay: 15
      }
    });
  }

  const adherents = [
    { matricule: 'M001', nom: 'BENGAGI', prenom: 'ZIED', rib: '14043043100702168352' },
    { matricule: 'M002', nom: 'SAIDANI', prenom: 'Hichem', rib: '14015015100704939295' },
    { matricule: 'M003', nom: 'NEFZI', prenom: 'MOHEB', rib: '08081023082003208516' },
    { matricule: 'M004', nom: 'LTIFI', prenom: 'ADEL', rib: '14067067100701418590' },
    { matricule: 'M005', nom: 'RAJHI', prenom: 'HAMZA', rib: '14067067100700641135' }
  ];

  for (const adh of adherents) {
    const existing = await prisma.adherent.findFirst({
      where: { matricule: adh.matricule, clientId: client.id }
    });

    if (existing) {
      console.log(`✓ ${adh.matricule} already exists`);
    } else {
      await prisma.adherent.create({
        data: {
          ...adh,
          clientId: client.id,
          statut: 'ACTIF'
        }
      });
      console.log(`✓ Created ${adh.matricule} - ${adh.nom} ${adh.prenom}`);
    }
  }

  console.log('\n✅ Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
