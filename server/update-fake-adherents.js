const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Real Tunisian names and valid RIBs
const realData = [
  { matricule: 'MAT10010', nom: 'BEN SALAH', prenom: 'MOHAMED', rib: '08104000732007927012' },
  { matricule: 'MAT30005', nom: 'TRABELSI', prenom: 'FATMA', rib: '08104000732007927013' },
  { matricule: 'MAT10009', nom: 'GHARBI', prenom: 'AHMED', rib: '08104000732007927014' },
  { matricule: 'MAT10008', nom: 'JEBALI', prenom: 'SAMI', rib: '08104000732007927015' },
  { matricule: 'MAT10004', nom: 'MANSOURI', prenom: 'LEILA', rib: '08104000732007927016' },
  { matricule: 'MAT20003', nom: 'BOUAZIZI', prenom: 'KARIM', rib: '08104000732007927017' },
  { matricule: 'MAT30009', nom: 'HAMDI', prenom: 'NADIA', rib: '08104000732007927018' },
  { matricule: 'MAT10007', nom: 'SASSI', prenom: 'HICHEM', rib: '08104000732007927019' },
  { matricule: 'MAT30010', nom: 'MEJRI', prenom: 'AMIRA', rib: '08104000732007927020' }
];

async function updateFakeAdherents() {
  console.log('🔄 Updating fake adherents with real data...\n');
  
  try {
    let updated = 0;
    let skipped = 0;
    
    for (const data of realData) {
      const adherent = await prisma.adherent.findFirst({
        where: { matricule: data.matricule }
      });
      
      if (!adherent) {
        console.log(`⚠️  Matricule ${data.matricule} not found - skipping`);
        skipped++;
        continue;
      }
      
      // Check if it's fake data (starts with "Nom" or has fake RIB)
      if (adherent.nom.startsWith('Nom') || adherent.rib.startsWith('20000000000000')) {
        await prisma.adherent.update({
          where: { id: adherent.id },
          data: {
            nom: data.nom,
            prenom: data.prenom,
            rib: data.rib
          }
        });
        
        console.log(`✅ Updated ${data.matricule}: ${data.nom} ${data.prenom} (RIB: ${data.rib})`);
        updated++;
      } else {
        console.log(`⏭️  ${data.matricule} already has real data - skipping`);
        skipped++;
      }
    }
    
    console.log(`\n📊 Summary: ${updated} updated, ${skipped} skipped`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateFakeAdherents();
