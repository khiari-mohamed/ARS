const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const adherents = [
  { matricule: 'M001', prenom: 'ZIED' },
  { matricule: 'M002', prenom: 'Hichem' },
  { matricule: 'M003', prenom: 'MOHEB' },
  { matricule: 'M004', prenom: 'ADEL' },
  { matricule: 'M005', prenom: 'HAMZA' },
  { matricule: 'M006', prenom: 'LATIFA' },
  { matricule: 'M007', prenom: 'KHALED' },
  { matricule: 'M008', prenom: 'SAMEH' },
  { matricule: 'M009', prenom: 'MOHAMED' },
  { matricule: 'M010', prenom: 'BEN MLOUKA' },
  { matricule: 'M011', prenom: 'RAOUF' },
  { matricule: 'M012', prenom: 'ARBOUJ' },
  { matricule: 'M013', prenom: 'SOUFIENE' },
  { matricule: 'M014', prenom: 'HABIB' },
  { matricule: 'M015', prenom: 'MOETAZ' },
  { matricule: 'M016', prenom: 'ANIS' },
  { matricule: 'M017', prenom: 'MAJED' },
  { matricule: 'M018', prenom: 'ABDSATAR' },
  { matricule: 'M019', prenom: 'HAFEDH' },
  { matricule: 'M020', prenom: 'ANIS' }
];

async function updateAdherentPrenoms() {
  console.log('🔄 Starting adherent prenom update...\n');
  
  let updated = 0;
  let notFound = 0;
  
  for (const { matricule, prenom } of adherents) {
    try {
      const result = await prisma.adherent.updateMany({
        where: { matricule },
        data: { prenom }
      });
      
      if (result.count > 0) {
        console.log(`✅ Updated ${matricule}: ${prenom}`);
        updated += result.count;
      } else {
        console.log(`⚠️  Not found: ${matricule}`);
        notFound++;
      }
    } catch (error) {
      console.error(`❌ Error updating ${matricule}:`, error.message);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Not found: ${notFound}`);
  
  // Verify
  console.log('\n🔍 Verifying updates...');
  const verified = await prisma.adherent.findMany({
    where: { matricule: { startsWith: 'M0' } },
    select: { matricule: true, nom: true, prenom: true },
    orderBy: { matricule: 'asc' }
  });
  
  console.log('\n📋 Current adherents:');
  verified.forEach(a => {
    console.log(`   ${a.matricule}: ${a.nom} ${a.prenom || '(NULL)'}`);
  });
  
  await prisma.$disconnect();
  console.log('\n✅ Done!');
}

updateAdherentPrenoms().catch(error => {
  console.error('❌ Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});
