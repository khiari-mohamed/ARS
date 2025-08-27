import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyBSStats() {
  console.log('🔍 Verifying BS Statistics...\n');

  try {
    // Total BS count
    const totalBS = await prisma.bulletinSoin.count({ where: { deletedAt: null } });
    console.log(`📊 Total BS: ${totalBS}`);

    // BS by status
    const bsByStatus = await prisma.bulletinSoin.groupBy({
      by: ['etat'],
      where: { deletedAt: null },
      _count: { id: true }
    });
    
    console.log('\n📈 BS by Status:');
    bsByStatus.forEach(status => {
      console.log(`  ${status.etat}: ${status._count.id}`);
    });

    // Non-assigned BS (ownerId is null)
    const nonAssigned = await prisma.bulletinSoin.count({
      where: { deletedAt: null, ownerId: null }
    });
    console.log(`\n🔄 Non-assigned BS: ${nonAssigned}`);

    // BS in progress
    const inProgress = await prisma.bulletinSoin.count({
      where: { 
        deletedAt: null, 
        etat: { in: ['IN_PROGRESS', 'EN_COURS'] }
      }
    });
    console.log(`⏳ BS in progress: ${inProgress}`);

    // Overdue BS
    const overdue = await prisma.bulletinSoin.count({
      where: {
        deletedAt: null,
        dueDate: { lt: new Date() },
        etat: { not: 'VALIDATED' }
      }
    });
    console.log(`⚠️  Overdue BS: ${overdue}`);

    // Gestionnaires workload
    const gestionnaires = await prisma.user.findMany({
      where: { role: 'gestionnaire' },
      select: { id: true, fullName: true }
    });

    console.log('\n👥 Gestionnaires Workload:');
    for (const g of gestionnaires) {
      const assigned = await prisma.bulletinSoin.count({
        where: { 
          deletedAt: null, 
          ownerId: g.id,
          etat: { in: ['IN_PROGRESS', 'EN_COURS'] }
        }
      });
      
      const overdueForUser = await prisma.bulletinSoin.count({
        where: {
          deletedAt: null,
          ownerId: g.id,
          dueDate: { lt: new Date() },
          etat: { not: 'VALIDATED' }
        }
      });

      console.log(`  ${g.fullName}: ${assigned} BS assigned, ${overdueForUser} overdue`);
    }

    // Sample BS data
    console.log('\n📋 Sample BS Data:');
    const sampleBS = await prisma.bulletinSoin.findMany({
      where: { deletedAt: null },
      take: 5,
      select: {
        numBs: true,
        etat: true,
        ownerId: true,
        dueDate: true,
        nomAssure: true
      },
      orderBy: { createdAt: 'desc' }
    });

    sampleBS.forEach(bs => {
      const isOverdue = bs.dueDate && bs.dueDate < new Date();
      console.log(`  ${bs.numBs} | ${bs.etat} | Owner: ${bs.ownerId ? 'Assigned' : 'Unassigned'} | ${isOverdue ? '⚠️ OVERDUE' : '✅ On time'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyBSStats();