const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDateReceptionBO() {
  console.log('🔧 Fixing dateReceptionBO for existing bordereaux...');
  
  // Get all bordereaux with null dateReceptionBO
  const bordereaux = await prisma.bordereau.findMany({
    where: { dateReceptionBO: null },
    select: { id: true, dateReception: true }
  });
  
  console.log(`📊 Found ${bordereaux.length} bordereaux to fix`);
  
  // Update each one
  for (const bordereau of bordereaux) {
    await prisma.bordereau.update({
      where: { id: bordereau.id },
      data: { dateReceptionBO: bordereau.dateReception }
    });
  }
  
  console.log(`✅ Updated ${bordereaux.length} bordereaux`);
  
  await prisma.$disconnect();
}

fixDateReceptionBO().catch(console.error);
