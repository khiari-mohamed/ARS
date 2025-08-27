import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  console.log('🔍 Checking database data...');

  try {
    const userCount = await prisma.user.count();
    const bsCount = await prisma.bulletinSoin.count();
    const bordereauCount = await prisma.bordereau.count();
    
    console.log(`Users: ${userCount}`);
    console.log(`Bulletin Soins: ${bsCount}`);
    console.log(`Bordereaux: ${bordereauCount}`);

    if (userCount > 0) {
      const users = await prisma.user.findMany({
        where: { role: 'gestionnaire' },
        select: { id: true, fullName: true, email: true }
      });
      console.log('Gestionnaires:', users);
    }

    if (bsCount > 0) {
      const bs = await prisma.bulletinSoin.findMany({
        take: 5,
        select: { id: true, numBs: true, etat: true, ownerId: true }
      });
      console.log('Sample BS:', bs);
    }

  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();