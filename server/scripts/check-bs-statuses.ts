import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBSStatuses() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 BULLETIN DE SOIN (BS) STATUS ANALYSIS');
  console.log('='.repeat(80));

  // Get all BS grouped by status
  const bsByStatus = await prisma.bulletinSoin.groupBy({
    by: ['etat'],
    _count: { id: true }
  });

  console.log('\n📊 BS COUNT BY STATUS:\n');
  
  let totalBS = 0;
  bsByStatus.forEach(group => {
    totalBS += group._count.id;
    console.log(`   ${group.etat}: ${group._count.id} BS`);
  });

  console.log(`\n   TOTAL BS: ${totalBS}`);

  // Check specifically for IN_PROGRESS and ASSIGNED
  const activeBS = await prisma.bulletinSoin.count({
    where: { etat: { in: ['IN_PROGRESS', 'ASSIGNED'] } }
  });

  console.log(`\n🔍 ACTIVE BS (IN_PROGRESS or ASSIGNED): ${activeBS}`);

  if (activeBS === 0) {
    console.log('\n⚠️  NO ACTIVE BS FOUND!');
    console.log('   This is why all teams show 0% workload.');
    console.log('   Workload only counts BS with etat = "IN_PROGRESS" or "ASSIGNED"');
  }

  // Check BS with owners
  const bsWithOwners = await prisma.bulletinSoin.count({
    where: { ownerId: { not: null } }
  });

  console.log(`\n👤 BS WITH OWNERS ASSIGNED: ${bsWithOwners}`);

  // Sample some BS to see their actual status
  const sampleBS = await prisma.bulletinSoin.findMany({
    take: 10,
    select: {
      id: true,
      numBs: true,
      etat: true,
      ownerId: true,
      owner: { select: { fullName: true } }
    }
  });

  if (sampleBS.length > 0) {
    console.log('\n📄 SAMPLE BS (first 10):');
    sampleBS.forEach(bs => {
      console.log(`   ${bs.numBs}: ${bs.etat} | Owner: ${bs.owner?.fullName || 'NONE'}`);
    });
  }

  console.log('\n' + '='.repeat(80) + '\n');

  await prisma.$disconnect();
}

checkBSStatuses().catch(console.error);
