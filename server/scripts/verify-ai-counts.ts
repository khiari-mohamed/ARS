import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAICounts() {
  console.log('\n🔍 === AI WORKLOAD VERIFICATION SCRIPT ===\n');

  const gestionnaires = await prisma.user.findMany({
    where: { role: { in: ['GESTIONNAIRE', 'gestionnaire'] }, active: true },
    select: { id: true, fullName: true, email: true }
  });

  const totalUsers = await prisma.user.count({ where: { active: true } });
  const totalGestionnaires = gestionnaires.length;

  console.log(`👥 Total Users in System: ${totalUsers}`);
  console.log(`👤 Total Active Gestionnaires: ${totalGestionnaires}\n`);
  console.log('─'.repeat(60));

  for (const g of gestionnaires) {
    console.log(`\n👤 ${g.fullName} (${g.email})`);
    console.log('─'.repeat(60));

    // Documents by type
    const docsByType = await prisma.document.groupBy({
      by: ['type'],
      where: { 
        assignedToUserId: g.id,
        status: { in: ['UPLOADED', 'EN_COURS', 'SCANNE', 'RETOUR_ADMIN', 'RETOURNER_AU_SCAN'] }
      },
      _count: true
    });

    const docsTotal = docsByType.reduce((sum, d) => sum + d._count, 0);
    console.log(`📁 Documents: ${docsTotal} total`);
    docsByType.forEach(d => console.log(`   - ${d.type}: ${d._count}`));

    // BulletinSoin
    const bsCount = await prisma.bulletinSoin.count({
      where: { 
        ownerId: g.id, 
        etat: { in: ['IN_PROGRESS', 'EN_COURS'] }, 
        deletedAt: null 
      }
    });
    console.log(`📄 Bulletins de Soin: ${bsCount}`);

    // Bordereaux
    const bordereauxCount = await prisma.bordereau.count({
      where: { 
        currentHandlerId: g.id,
        statut: { in: ['EN_ATTENTE', 'A_SCANNER', 'SCAN_EN_COURS', 'SCANNE', 'A_AFFECTER', 'ASSIGNE', 'EN_COURS', 'TRAITE', 'PRET_VIREMENT', 'VIREMENT_EN_COURS', 'VIREMENT_EXECUTE', 'EN_DIFFICULTE', 'PARTIEL', 'MIS_EN_INSTANCE', 'RETOURNE'] }
      }
    });
    console.log(`📋 Bordereaux: ${bordereauxCount}`);

    // Reclamations
    const reclamationsCount = await prisma.reclamation.count({
      where: { 
        assignedToId: g.id,
        status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING'] }
      }
    });
    console.log(`🎫 Réclamations: ${reclamationsCount}`);

    // Total
    const totalWorkload = docsTotal + bsCount + bordereauxCount + reclamationsCount;
    console.log(`\n✅ TOTAL CHARGE: ${totalWorkload} éléments`);
    console.log(`   Breakdown: ${docsTotal} docs, ${bsCount} BS, ${bordereauxCount} bord, ${reclamationsCount} récl`);

    // Completed (for efficiency)
    const [completedDocs, completedBS, completedBord, completedRecl] = await Promise.all([
      prisma.document.count({ where: { assignedToUserId: g.id, status: { in: ['TRAITE', 'SCANNE'] } } }),
      prisma.bulletinSoin.count({ where: { processedById: g.id, processedAt: { not: null }, deletedAt: null } }),
      prisma.bordereau.count({ where: { currentHandlerId: g.id, statut: { in: ['CLOTURE', 'PAYE'] } } }),
      prisma.reclamation.count({ where: { assignedToId: g.id, status: { in: ['RESOLVED', 'CLOSED'] } } })
    ]);

    const totalCompleted = completedDocs + completedBS + completedBord + completedRecl;
    const totalAssigned = totalWorkload + totalCompleted;
    const efficiency = totalAssigned > 0 ? (totalCompleted / totalAssigned * 100).toFixed(0) : '0';

    console.log(`\n📈 EFFICIENCY: ${efficiency}% (${totalCompleted} completed / ${totalAssigned} total assigned)`);
  }

  console.log('\n\n🎯 === VERIFICATION COMPLETE ===\n');
  console.log('Compare these numbers with your frontend display.');
  console.log('If they match, the AI is counting correctly! ✅\n');

  await prisma.$disconnect();
}

verifyAICounts().catch(console.error);
