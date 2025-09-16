const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAssignments() {
  console.log('🔧 Fixing user assignments...');

  // Update reclamations to use the correct user ID
  const result = await prisma.reclamation.updateMany({
    where: { assignedToId: '079d6252-1613-421e-91de-19ef843194b2' },
    data: { assignedToId: 'f7d0493c-f2a4-4241-8abc-b80ce85913cc' }
  });

  console.log(`✅ Updated ${result.count} reclamations`);

  // Update history entries
  const historyResult = await prisma.reclamationHistory.updateMany({
    where: { userId: '079d6252-1613-421e-91de-19ef843194b2' },
    data: { userId: 'f7d0493c-f2a4-4241-8abc-b80ce85913cc' }
  });

  console.log(`✅ Updated ${historyResult.count} history entries`);
}

fixAssignments()
  .catch(console.error)
  .finally(() => prisma.$disconnect());