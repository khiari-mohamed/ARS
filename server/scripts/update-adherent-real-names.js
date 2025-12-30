const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const realNames = [
  { nom: 'CHAIEB', prenom: 'FATHIA', rib: '25096000000095904242' },
  { nom: 'AGREBI', prenom: 'IBRAHIM AGREBI', rib: '12022000000219568597' },
  { nom: 'KOLSI', prenom: 'MAHMOUD KOLSI', rib: '08102000732007927011' },
  { nom: 'BJEOUI', prenom: 'SARRA HABIBI', rib: '12022000000211591511' },
  { nom: 'DAKHLAOUI', prenom: 'MOHAMED DAKHLAOUI', rib: '12022000000204649027' },
  { nom: 'ADOULI', prenom: 'ZIED', rib: '14076076100701211125' },
  { nom: 'RAZGALLAH', prenom: 'YOUSSEF', rib: '07081013910551424371' },
  { nom: 'ZAMMAMI', prenom: 'AYMEN ZAMMAMI', rib: '07081013910550843438' },
  { nom: 'CHANDOUL', prenom: 'HAMZA CHANDOUL', rib: '17901000000160296226' },
  { nom: 'SALAH', prenom: 'ESSAIED MOHAMED', rib: '08019011022006473534' },
  { nom: 'OUNALLI', prenom: 'HAMDI', rib: '17001000000300042431' },
  { nom: 'BEN RABEH', prenom: 'SOUAD', rib: '14076076100701201231' }
];

async function updateAdherentNames() {
  console.log('🚀 Starting adherent name update...');
  
  const adherents = await prisma.adherent.findMany({
    orderBy: { createdAt: 'asc' },
    take: realNames.length
  });
  
  console.log(`📋 Found ${adherents.length} adherents in database`);
  
  let updated = 0;
  
  for (let i = 0; i < Math.min(adherents.length, realNames.length); i++) {
    try {
      await prisma.adherent.update({
        where: { id: adherents[i].id },
        data: {
          nom: realNames[i].nom,
          prenom: realNames[i].prenom,
          rib: realNames[i].rib
        }
      });
      console.log(`✅ Updated ${adherents[i].matricule}: ${realNames[i].nom} ${realNames[i].prenom}`);
      updated++;
    } catch (error) {
      console.error(`❌ Error updating ${adherents[i].matricule}:`, error.message);
    }
  }
  
  console.log(`\n📊 Summary: ${updated} adherents updated`);
  await prisma.$disconnect();
}

updateAdherentNames();
