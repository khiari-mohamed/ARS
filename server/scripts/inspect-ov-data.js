const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectOVData() {
  console.log('🔍 Inspecting OrdreVirement and related data...\n');
  
  try {
    // Get the latest OrdreVirement
    const latestOV = await prisma.ordreVirement.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        donneurOrdre: true,
        items: {
          include: {
            adherent: {
              include: {
                client: true
              }
            }
          }
        }
      }
    });
    
    if (!latestOV) {
      console.log('❌ No OrdreVirement found in database');
      return;
    }
    
    console.log('📋 Latest OrdreVirement:');
    console.log(`  ID: ${latestOV.id}`);
    console.log(`  Reference: ${latestOV.reference}`);
    console.log(`  Date: ${latestOV.dateCreation}`);
    console.log(`  Items count: ${latestOV.items.length}\n`);
    
    console.log('👤 Donneur d\'Ordre:');
    console.log(`  Nom: ${latestOV.donneurOrdre.nom}`);
    console.log(`  RIB: ${latestOV.donneurOrdre.rib}\n`);
    
    console.log('📊 VirementItems Analysis:\n');
    
    for (let i = 0; i < latestOV.items.length; i++) {
      const item = latestOV.items[i];
      console.log(`\n--- Item ${i + 1} ---`);
      console.log(`  Montant: ${item.montant}`);
      console.log(`  Statut: ${item.statut}`);
      
      // Check adherent data
      if (item.adherent) {
        console.log(`  ✅ Adherent EXISTS in DB:`);
        console.log(`     ID: ${item.adherent.id}`);
        console.log(`     Matricule: ${item.adherent.matricule}`);
        console.log(`     Nom: ${item.adherent.nom}`);
        console.log(`     Prenom: ${item.adherent.prenom || '(empty)'}`);
        console.log(`     RIB: ${item.adherent.rib}`);
        console.log(`     Client: ${item.adherent.client?.name || '(no client)'}`);
      } else {
        console.log(`  ❌ Adherent MISSING from DB`);
      }
      
      // Check Excel data in erreur field
      if (item.erreur) {
        try {
          const excelData = JSON.parse(item.erreur);
          console.log(`  📄 Excel data in erreur field:`);
          console.log(`     Matricule: ${excelData.matricule || '(empty)'}`);
          console.log(`     Nom: ${excelData.nom || '(empty)'}`);
          console.log(`     Prenom: ${excelData.prenom || '(empty)'}`);
          console.log(`     RIB: ${excelData.rib || '(empty)'}`);
          console.log(`     Societe: ${excelData.societe || '(empty)'}`);
        } catch (e) {
          console.log(`  ⚠️ erreur field is not JSON: ${item.erreur.substring(0, 50)}...`);
        }
      } else {
        console.log(`  ⚠️ No erreur field data`);
      }
    }
    
    // Summary
    console.log('\n\n📈 SUMMARY:');
    const withAdherent = latestOV.items.filter(i => i.adherent && i.adherent.nom).length;
    const withExcelData = latestOV.items.filter(i => {
      try {
        const data = JSON.parse(i.erreur || '{}');
        return data.nom;
      } catch { return false; }
    }).length;
    
    console.log(`  Total items: ${latestOV.items.length}`);
    console.log(`  With DB adherent: ${withAdherent}`);
    console.log(`  With Excel data: ${withExcelData}`);
    console.log(`  Missing both: ${latestOV.items.length - Math.max(withAdherent, withExcelData)}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

inspectOVData();
