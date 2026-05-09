const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBordereauAirbus() {
  try {
    console.log('🔍 Searching for bordereau: AIRBUS BR TEST01-25\n');
    
    const bordereau = await prisma.bordereau.findFirst({
      where: {
        reference: 'AIRBUS BR TEST01-25'
      },
      include: {
        client: true,
        contract: true,
        documents: true,
        BulletinSoin: true,
        currentHandler: true,
        team: true,
        ordresVirement: true,
        traitementHistory: true
      }
    });

    if (!bordereau) {
      console.log('❌ Bordereau NOT FOUND in database');
      return;
    }

    console.log('✅ BORDEREAU FOUND\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 BASIC INFORMATION');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`ID:                    ${bordereau.id}`);
    console.log(`Référence:             ${bordereau.reference}`);
    console.log(`Statut:                ${bordereau.statut}`);
    console.log(`Date Réception:        ${bordereau.dateReception}`);
    console.log(`Date Réception BO:     ${bordereau.dateReceptionBO || 'N/A'}`);
    console.log(`Délai Règlement:       ${bordereau.delaiReglement} jours`);
    console.log(`Nombre BS (field):     ${bordereau.nombreBS || 0}`);
    console.log(`Archived:              ${bordereau.archived ? 'YES' : 'NO'}`);
    console.log(`Created At:            ${bordereau.createdAt}`);
    console.log(`Updated At:            ${bordereau.updatedAt}`);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('👤 CLIENT & CONTRACT');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Client:                ${bordereau.client?.name || 'N/A'}`);
    console.log(`Client ID:             ${bordereau.clientId || 'N/A'}`);
    console.log(`Contract:              ${bordereau.contract?.clientName || 'N/A'}`);
    console.log(`Contract ID:           ${bordereau.contractId || 'N/A'}`);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('👥 ASSIGNMENT');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Assigned To:           ${bordereau.currentHandler?.fullName || 'Non assigné'}`);
    console.log(`Assigned To ID:        ${bordereau.assignedToUserId || 'N/A'}`);
    console.log(`Team:                  ${bordereau.team?.fullName || 'N/A'}`);
    console.log(`Team ID:               ${bordereau.teamId || 'N/A'}`);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📅 DATES & TIMELINE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Date Début Scan:       ${bordereau.dateDebutScan || 'N/A'}`);
    console.log(`Date Fin Scan:         ${bordereau.dateFinScan || 'N/A'}`);
    console.log(`Date Réception Santé:  ${bordereau.dateReceptionSante || 'N/A'}`);
    console.log(`Date Clôture:          ${bordereau.dateCloture || 'N/A'}`);
    console.log(`Date Dépôt Virement:   ${bordereau.dateDepotVirement || 'N/A'}`);
    console.log(`Date Exec Virement:    ${bordereau.dateExecutionVirement || 'N/A'}`);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 SCAN STATUS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Scan Status:           ${bordereau.scanStatus || 'N/A'}`);
    console.log(`Document Status:       ${bordereau.documentStatus || 'N/A'}`);
    console.log(`Completion Rate:       ${bordereau.completionRate || 0}%`);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📄 DOCUMENTS COUNT');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total Documents:       ${bordereau.documents?.length || 0}`);
    
    if (bordereau.documents && bordereau.documents.length > 0) {
      const docsByType = {};
      const docsByStatus = {};
      
      bordereau.documents.forEach(doc => {
        docsByType[doc.type] = (docsByType[doc.type] || 0) + 1;
        docsByStatus[doc.status || 'UNKNOWN'] = (docsByStatus[doc.status || 'UNKNOWN'] || 0) + 1;
      });
      
      console.log('\n📑 Documents by Type:');
      Object.entries(docsByType).forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}`);
      });
      
      console.log('\n📊 Documents by Status:');
      Object.entries(docsByStatus).forEach(([status, count]) => {
        console.log(`  - ${status}: ${count}`);
      });
      
      console.log('\n📋 All Documents:');
      bordereau.documents.forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.name}`);
        console.log(`     - ID: ${doc.id}`);
        console.log(`     - Type: ${doc.type}`);
        console.log(`     - Status: ${doc.status || 'N/A'}`);
        console.log(`     - Path: ${doc.path}`);
        console.log(`     - Uploaded: ${doc.uploadedAt}`);
        console.log(`     - Assigned To: ${doc.assignedToUserId || 'N/A'}`);
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('💊 BULLETIN DE SOIN (BS) COUNT');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total BS:              ${bordereau.BulletinSoin?.length || 0}`);
    
    if (bordereau.BulletinSoin && bordereau.BulletinSoin.length > 0) {
      const bsByEtat = {};
      bordereau.BulletinSoin.forEach(bs => {
        bsByEtat[bs.etat] = (bsByEtat[bs.etat] || 0) + 1;
      });
      
      console.log('\n📊 BS by État:');
      Object.entries(bsByEtat).forEach(([etat, count]) => {
        console.log(`  - ${etat}: ${count}`);
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('💰 ORDRES DE VIREMENT');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total OV:              ${bordereau.ordresVirement?.length || 0}`);
    
    if (bordereau.ordresVirement && bordereau.ordresVirement.length > 0) {
      bordereau.ordresVirement.forEach((ov, index) => {
        console.log(`\n  OV ${index + 1}:`);
        console.log(`    - ID: ${ov.id}`);
        console.log(`    - État: ${ov.etatVirement}`);
        console.log(`    - Montant: ${ov.montantTotal || 'N/A'}`);
        console.log(`    - Date Création: ${ov.dateCreation}`);
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📜 TRAITEMENT HISTORY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total History:         ${bordereau.traitementHistory?.length || 0}`);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Bordereau:             ${bordereau.reference}`);
    console.log(`Status:                ${bordereau.statut}`);
    console.log(`Total Documents:       ${bordereau.documents?.length || 0}`);
    console.log(`Total BS:              ${bordereau.BulletinSoin?.length || 0}`);
    console.log(`Total OV:              ${bordereau.ordresVirement?.length || 0}`);
    console.log(`Assigned To:           ${bordereau.currentHandler?.fullName || 'Non assigné'}`);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBordereauAirbus();
