const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearAllData() {
  console.log('🗑️  Starting database cleanup...\n');

  try {
    // Delete in correct order to respect foreign key constraints
    
    console.log('Deleting VirementHistorique...');
    await prisma.virementHistorique.deleteMany({});
    
    console.log('Deleting VirementItem...');
    await prisma.virementItem.deleteMany({});
    
    console.log('Deleting OrdreVirement...');
    await prisma.ordreVirement.deleteMany({});
    
    console.log('Deleting Virement...');
    await prisma.virement.deleteMany({});
    
    console.log('Deleting WireTransfer...');
    await prisma.wireTransfer.deleteMany({});
    
    console.log('Deleting WireTransferBatchHistory...');
    await prisma.wireTransferBatchHistory.deleteMany({});
    
    console.log('Deleting WireTransferBatch...');
    await prisma.wireTransferBatch.deleteMany({});
    
    console.log('Deleting DocumentAssignmentHistory...');
    await prisma.documentAssignmentHistory.deleteMany({});
    
    console.log('Deleting Document...');
    await prisma.document.deleteMany({});
    
    console.log('Deleting BulletinSoin...');
    await prisma.bulletinSoin.deleteMany({});
    
    console.log('Deleting ActionLog...');
    await prisma.actionLog.deleteMany({});
    
    console.log('Deleting AuditLog...');
    await prisma.auditLog.deleteMany({});
    
    console.log('Deleting Notification...');
    await prisma.notification.deleteMany({});
    
    console.log('Deleting Reclamation...');
    await prisma.reclamation.deleteMany({});
    
    console.log('Deleting Bordereau...');
    await prisma.bordereau.deleteMany({});
    
    console.log('Deleting Contract...');
    await prisma.contract.deleteMany({});
    
    console.log('Deleting Adherent...');
    await prisma.adherent.deleteMany({});
    
    console.log('Deleting Member...');
    await prisma.member.deleteMany({});
    
    console.log('Deleting DonneurOrdre...');
    await prisma.donneurOrdre.deleteMany({});
    
    console.log('Deleting Society...');
    await prisma.society.deleteMany({});
    
    console.log('Deleting CompagnieAssurance...');
    await prisma.compagnieAssurance.deleteMany({});
    
    console.log('Deleting Client...');
    await prisma.client.deleteMany({});
    
    // Keep users - only delete non-admin users if needed
    console.log('Deleting non-admin users...');
    await prisma.user.deleteMany({
      where: {
        role: { not: 'SUPER_ADMIN' }
      }
    });
    
    console.log('\n✅ Database cleanup completed successfully!');
    console.log('📊 All data deleted, tables structure preserved.');
    console.log('🔐 Super Admin users kept intact.\n');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearAllData()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
