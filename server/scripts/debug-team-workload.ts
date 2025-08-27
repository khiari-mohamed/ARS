import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugTeamWorkload() {
  console.log('🔍 Debugging Team Workload...\n');

  try {
    const gestionnaires = await prisma.user.findMany({ 
      where: { role: 'gestionnaire' },
      select: { id: true, fullName: true }
    });

    console.log(`Found ${gestionnaires.length} gestionnaires:\n`);

    for (const g of gestionnaires) {
      console.log(`👤 ${g.fullName} (${g.id}):`);
      
      // Get all BS for this gestionnaire
      const allBS = await prisma.bulletinSoin.findMany({
        where: { ownerId: g.id, deletedAt: null },
        select: { etat: true, dueDate: true }
      });

      console.log(`  Total BS: ${allBS.length}`);
      
      // Count by status
      const statusCounts = allBS.reduce((acc, bs) => {
        acc[bs.etat] = (acc[bs.etat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('  Status breakdown:', statusCounts);

      // Count overdue
      const now = new Date();
      const overdue = allBS.filter(bs => 
        bs.dueDate && bs.dueDate < now && bs.etat !== 'VALIDATED'
      ).length;

      console.log(`  Overdue: ${overdue}`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTeamWorkload();