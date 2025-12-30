const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SAMPLE_NAMES = [
  { nom: 'Ben Ali', prenom: 'Mohamed' },
  { nom: 'Khiari', prenom: 'Ahmed' },
  { nom: 'Trabelsi', prenom: 'Fatma' },
  { nom: 'Jebali', prenom: 'Sami' },
  { nom: 'Gharbi', prenom: 'Leila' },
  { nom: 'Mansour', prenom: 'Karim' },
  { nom: 'Bouazizi', prenom: 'Nadia' },
  { nom: 'Hamdi', prenom: 'Youssef' },
  { nom: 'Sassi', prenom: 'Amira' },
  { nom: 'Mejri', prenom: 'Hichem' },
  { nom: 'Dridi', prenom: 'Salma' },
  { nom: 'Chaabane', prenom: 'Rami' },
  { nom: 'Oueslati', prenom: 'Ines' },
  { nom: 'Belhadj', prenom: 'Tarek' },
  { nom: 'Maaloul', prenom: 'Sonia' }
];

async function fixAdherentNames() {
  try {
    console.log('🔍 Checking adherents with invalid names...\n');

    // Find all adherents where nom equals the client name (société)
    const adherentsWithIssues = await prisma.adherent.findMany({
      include: {
        client: true
      }
    });

    const toFix = adherentsWithIssues.filter(adherent => {
      const clientWords = adherent.client.name.split(' ');
      return clientWords.includes(adherent.nom) || 
             clientWords.includes(adherent.prenom) ||
             adherent.nom === 'PGH' ||
             adherent.prenom.includes('FILIALES') ||
             adherent.prenom.includes('&');
    });

    console.log(`Found ${toFix.length} adherents with invalid names\n`);

    if (toFix.length === 0) {
      console.log('✅ No adherents need fixing!');
      return;
    }

    let fixed = 0;
    for (const adherent of toFix) {
      const randomName = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
      
      await prisma.adherent.update({
        where: { id: adherent.id },
        data: {
          nom: randomName.nom,
          prenom: randomName.prenom
        }
      });

      console.log(`✅ Fixed: ${adherent.matricule} - ${adherent.client.name}`);
      console.log(`   Old: ${adherent.nom} ${adherent.prenom}`);
      console.log(`   New: ${randomName.nom} ${randomName.prenom}\n`);
      fixed++;
    }

    console.log(`\n✅ Successfully fixed ${fixed} adherents!`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdherentNames();
