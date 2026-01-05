const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectGestionnaireSenior() {
  console.log('\n🔍 INSPECTION GESTIONNAIRE SENIOR - ARS DATABASE\n');
  console.log('='.repeat(80));

  try {
    const seniors = await prisma.user.findMany({
      where: { role: 'GESTIONNAIRE_SENIOR' }
    });

    if (seniors.length === 0) {
      console.log('\n❌ NO GESTIONNAIRE SENIOR FOUND\n');
      return;
    }

    console.log(`\n✅ Found ${seniors.length} Gestionnaire Senior(s)\n`);

    for (const senior of seniors) {
      console.log('\n' + '─'.repeat(80));
      console.log(`👤 ${senior.fullName}`);
      console.log('─'.repeat(80));
      console.log(`🆔 ID: ${senior.id}`);
      console.log(`📧 Email: ${senior.email || 'N/A'}`);
      console.log(`✅ Active: ${senior.active}`);
      console.log(`📅 Created: ${senior.createdAt.toISOString()}`);

      // DOCUMENTS (check both direct assignment AND via bordereau)
      const docs = await prisma.document.findMany({
        where: {
          OR: [
            { assignedToUserId: senior.id },
            { bordereau: { assignedToUserId: senior.id } }
          ]
        },
        include: {
          bordereau: { select: { reference: true, statut: true, assignedToUserId: true, client: { select: { name: true } } } }
        }
      });

      console.log(`\n📄 DOCUMENTS: ${docs.length}`);
      console.log(`  Direct assignment: ${docs.filter(d => d.assignedToUserId === senior.id).length}`);
      console.log(`  Via bordereau: ${docs.filter(d => d.bordereau?.assignedToUserId === senior.id).length}`);
      
      const docsByStatus = {};
      const docsByType = {};
      docs.forEach(d => {
        docsByStatus[d.status || 'NULL'] = (docsByStatus[d.status || 'NULL'] || 0) + 1;
        docsByType[d.type] = (docsByType[d.type] || 0) + 1;
      });

      console.log('\n  BY STATUS:');
      Object.entries(docsByStatus).forEach(([s, c]) => console.log(`    ${s}: ${c}`));
      
      console.log('\n  BY TYPE:');
      Object.entries(docsByType).forEach(([t, c]) => console.log(`    ${t}: ${c}`));

      // BORDEREAUX
      const bordereaux = await prisma.bordereau.findMany({
        where: { assignedToUserId: senior.id },
        include: {
          client: { select: { name: true } },
          documents: true
        }
      });

      console.log(`\n📦 BORDEREAUX: ${bordereaux.length}`);

      const bordByStatus = {};
      bordereaux.forEach(b => {
        bordByStatus[b.statut] = (bordByStatus[b.statut] || 0) + 1;
      });

      console.log('\n  BY STATUS:');
      Object.entries(bordByStatus).forEach(([s, c]) => console.log(`    ${s}: ${c}`));

      const active = bordereaux.filter(b => ['ASSIGNE', 'EN_COURS', 'A_TRAITER'].includes(b.statut));
      
      if (active.length > 0) {
        console.log(`\n🔥 ACTIVE (${active.length}):`);
        active.forEach((b, i) => {
          console.log(`\n  ${i + 1}. ${b.reference}`);
          console.log(`     Client: ${b.client?.name || 'N/A'}`);
          console.log(`     Status: ${b.statut}`);
          console.log(`     Date: ${b.dateReception?.toISOString().split('T')[0] || 'N/A'}`);
          console.log(`     Docs: ${b.documents.length}`);
        });
      }

      // ASSIGNMENT HISTORY
      const history = await prisma.documentAssignmentHistory.findMany({
        where: {
          OR: [
            { assignedToUserId: senior.id },
            { assignedByUserId: senior.id }
          ]
        },
        include: {
          document: { select: { type: true, name: true } },
          assignedTo: { select: { fullName: true } },
          assignedBy: { select: { fullName: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      if (history.length > 0) {
        console.log(`\n📋 ASSIGNMENT HISTORY (last 10):`);
        history.forEach((h, i) => {
          const direction = h.assignedToUserId === senior.id ? '📥 TO' : '📤 FROM';
          console.log(`  ${i + 1}. ${direction} ${h.assignedTo?.fullName || 'N/A'} by ${h.assignedBy?.fullName || 'N/A'}`);
          console.log(`     Doc: ${h.document?.type || 'N/A'} - ${h.createdAt.toISOString().split('T')[0]}`);
        });
      }

      // PERFORMANCE
      const completed = docs.filter(d => d.status === 'TRAITE' || d.status === 'VALIDATED');
      const completedBord = bordereaux.filter(b => ['TRAITE', 'CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut));

      console.log(`\n📈 PERFORMANCE:`);
      console.log(`  Docs Completed: ${completed.length}/${docs.length} (${docs.length > 0 ? Math.round(completed.length/docs.length*100) : 0}%)`);
      console.log(`  Bordereaux Completed: ${completedBord.length}/${bordereaux.length} (${bordereaux.length > 0 ? Math.round(completedBord.length/bordereaux.length*100) : 0}%)`);
      console.log(`  Active Workload: ${active.length}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ COMPLETE\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectGestionnaireSenior();
