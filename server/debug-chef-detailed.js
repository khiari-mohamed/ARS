const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugChefDetailed() {
  console.log('\n========================================');
  console.log('🔍 DETAILED CHEF D\'ÉQUIPE DATA');
  console.log('========================================\n');

  try {
    const chefUser = await prisma.user.findFirst({
      where: { role: 'CHEF_EQUIPE' }
    });

    console.log(`Chef: ${chefUser.fullName} (${chefUser.email})\n`);

    // Get all bordereaux with full details
    const bordereaux = await prisma.bordereau.findMany({
      include: {
        client: true,
        documents: {
          include: {
            assignedTo: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`TOTAL BORDEREAUX: ${bordereaux.length}\n`);
    console.log('='.repeat(80));

    bordereaux.forEach((bordereau, idx) => {
      console.log(`\n[${idx + 1}] BORDEREAU: ${bordereau.reference}`);
      console.log('─'.repeat(80));
      console.log(`ID: ${bordereau.id}`);
      console.log(`CLIENT: ${bordereau.client?.name || 'N/A'}`);
      console.log(`TYPE: ${bordereau.type}`);
      console.log(`STATUT BORDEREAU: ${bordereau.statut}`);
      console.log(`DATE: ${bordereau.dateReception}`);
      console.log(`DOCUMENTS: ${bordereau.documents.length}`);
      
      if (bordereau.documents.length > 0) {
        console.log('\n  DOCUMENTS DETAILS:');
        bordereau.documents.forEach((doc, docIdx) => {
          console.log(`\n  [${docIdx + 1}] ${doc.name}`);
          console.log(`      Document ID: ${doc.id}`);
          console.log(`      Document Type: ${doc.type}`);
          console.log(`      Document Status: ${doc.status}`);
          console.log(`      Assigned To ID: ${doc.assignedToUserId || 'NULL'}`);
          console.log(`      Assigned To Name: ${doc.assignedTo?.fullName || 'NOT ASSIGNED'}`);
          console.log(`      Uploaded At: ${doc.uploadedAt}`);
        });
      }
      console.log('\n' + '='.repeat(80));
    });

    console.log('\n\n📊 SUMMARY BY BORDEREAU STATUS:');
    console.log('─'.repeat(80));
    
    const statusGroups = {};
    bordereaux.forEach(b => {
      if (!statusGroups[b.statut]) {
        statusGroups[b.statut] = { count: 0, docs: [] };
      }
      statusGroups[b.statut].count++;
      b.documents.forEach(d => {
        statusGroups[b.statut].docs.push({
          name: d.name,
          docStatus: d.status,
          assigned: d.assignedTo?.fullName || 'NOT ASSIGNED'
        });
      });
    });

    Object.entries(statusGroups).forEach(([status, data]) => {
      console.log(`\n${status}: ${data.count} bordereau(x)`);
      data.docs.forEach(doc => {
        console.log(`  - ${doc.name} (Doc Status: ${doc.docStatus}, Assigned: ${doc.assigned})`);
      });
    });

    console.log('\n\n📊 SUMMARY BY DOCUMENT STATUS:');
    console.log('─'.repeat(80));
    
    const docStatusGroups = {};
    bordereaux.forEach(b => {
      b.documents.forEach(d => {
        if (!docStatusGroups[d.status]) {
          docStatusGroups[d.status] = [];
        }
        docStatusGroups[d.status].push({
          name: d.name,
          bordereauRef: b.reference,
          bordereauStatus: b.statut,
          assigned: d.assignedTo?.fullName || 'NOT ASSIGNED'
        });
      });
    });

    Object.entries(docStatusGroups).forEach(([status, docs]) => {
      console.log(`\n${status}: ${docs.length} document(s)`);
      docs.forEach(doc => {
        console.log(`  - ${doc.name}`);
        console.log(`    Bordereau: ${doc.bordereauRef} (Status: ${doc.bordereauStatus})`);
        console.log(`    Assigned: ${doc.assigned}`);
      });
    });

    console.log('\n\n🗂️ WHAT GED CORBEILLE SHOULD SHOW:');
    console.log('─'.repeat(80));

    // Traités tab (bordereau status = TRAITE)
    const traites = [];
    bordereaux.forEach(b => {
      if (b.statut === 'TRAITE') {
        b.documents.forEach(d => traites.push({ name: d.name, assigned: d.assignedTo?.fullName }));
      }
    });
    console.log(`\nTraités Tab (bordereau status = TRAITE): ${traites.length} documents`);
    traites.forEach(d => console.log(`  - ${d.name} (Assigned: ${d.assigned || 'NOT ASSIGNED'})`));

    // En cours tab (bordereau status = EN_COURS or ASSIGNE)
    const enCours = [];
    bordereaux.forEach(b => {
      if (b.statut === 'EN_COURS' || b.statut === 'ASSIGNE') {
        b.documents.forEach(d => enCours.push({ name: d.name, assigned: d.assignedTo?.fullName }));
      }
    });
    console.log(`\nEn Cours Tab (bordereau status = EN_COURS/ASSIGNE): ${enCours.length} documents`);
    enCours.forEach(d => console.log(`  - ${d.name} (Assigned: ${d.assigned || 'NOT ASSIGNED'})`));

    // Non affectés tab (bordereau status = A_AFFECTER, A_SCANNER, SCANNE)
    const nonAffectes = [];
    bordereaux.forEach(b => {
      if (b.statut === 'A_AFFECTER' || b.statut === 'A_SCANNER' || b.statut === 'SCANNE') {
        b.documents.forEach(d => nonAffectes.push({ name: d.name, assigned: d.assignedTo?.fullName }));
      }
    });
    console.log(`\nNon Affectés Tab (bordereau status = A_AFFECTER/A_SCANNER/SCANNE): ${nonAffectes.length} documents`);
    nonAffectes.forEach(d => console.log(`  - ${d.name} (Assigned: ${d.assigned || 'NOT ASSIGNED'})`));

    // Retournés tab (bordereau status = REJETE)
    const retournes = [];
    bordereaux.forEach(b => {
      if (b.statut === 'REJETE') {
        b.documents.forEach(d => retournes.push({ name: d.name, assigned: d.assignedTo?.fullName }));
      }
    });
    console.log(`\nRetournés Tab (bordereau status = REJETE): ${retournes.length} documents`);
    retournes.forEach(d => console.log(`  - ${d.name} (Assigned: ${d.assigned || 'NOT ASSIGNED'})`));

    console.log('\n========================================');
    console.log('✅ DONE');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugChefDetailed();
