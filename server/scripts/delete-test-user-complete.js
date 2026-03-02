const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteTestUser() {
  try {
    console.log('🔍 Searching for "Test User" in database...\n');
    
    const testUsers = await prisma.user.findMany({
      where: {
        OR: [
          { fullName: { contains: 'Test', mode: 'insensitive' } },
          { email: { contains: 'test', mode: 'insensitive' } }
        ]
      }
    });
    
    if (testUsers.length === 0) {
      console.log('✅ No test users found in database.');
      return;
    }
    
    console.log(`Found ${testUsers.length} test user(s):\n`);
    testUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.fullName} (${user.email}) - ID: ${user.id}`);
    });
    
    console.log('\n🗑️  Deleting test users...\n');
    
    for (const user of testUsers) {
      const userId = user.id;
      
      // Delete ALL foreign key references using raw SQL
      console.log(`  Cleaning up references for ${user.fullName}...`);
      
      // 1. Documents
      await prisma.$executeRaw`UPDATE "Document" SET "assignedToUserId" = NULL WHERE "assignedToUserId" = ${userId}`;
      await prisma.$executeRaw`DELETE FROM "Document" WHERE "uploadedById" = ${userId}`;
      
      // 2. Notifications
      await prisma.$executeRaw`DELETE FROM "Notification" WHERE "userId" = ${userId}`;
      
      // 3. AuditLog
      await prisma.$executeRaw`DELETE FROM "AuditLog" WHERE "userId" = ${userId}`;
      
      // 4. AlertLog
      await prisma.$executeRaw`DELETE FROM "AlertLog" WHERE "userId" = ${userId}`;
      
      // 5. Bordereaux
      await prisma.$executeRaw`UPDATE "Bordereau" SET "assignedToUserId" = NULL WHERE "assignedToUserId" = ${userId}`;
      await prisma.$executeRaw`UPDATE "Bordereau" SET "currentHandlerId" = NULL WHERE "currentHandlerId" = ${userId}`;
      await prisma.$executeRaw`UPDATE "Bordereau" SET "teamId" = NULL WHERE "teamId" = ${userId}`;
      
      // 6. Contracts
      await prisma.$executeRaw`UPDATE "Contract" SET "teamLeaderId" = NULL WHERE "teamLeaderId" = ${userId}`;
      
      // 7. Clients
      await prisma.$executeRaw`UPDATE "Client" SET "chargeCompteId" = NULL WHERE "chargeCompteId" = ${userId}`;
      
      // 8. Team members
      await prisma.$executeRaw`UPDATE "User" SET "teamLeaderId" = NULL WHERE "teamLeaderId" = ${userId}`;
      
      // 9. BulletinSoin
      await prisma.$executeRaw`UPDATE "BulletinSoin" SET "assignedToUserId" = NULL WHERE "assignedToUserId" = ${userId}`;
      await prisma.$executeRaw`UPDATE "BulletinSoin" SET "validatedById" = NULL WHERE "validatedById" = ${userId}`;
      
      // 10. Courrier
      await prisma.$executeRaw`UPDATE "Courrier" SET "assignedToUserId" = NULL WHERE "assignedToUserId" = ${userId}`;
      
      // 11. WireTransferBatch
      await prisma.$executeRaw`UPDATE "WireTransferBatch" SET "createdById" = NULL WHERE "createdById" = ${userId}`;
      await prisma.$executeRaw`UPDATE "WireTransferBatch" SET "confirmedById" = NULL WHERE "confirmedById" = ${userId}`;
      
      console.log(`  ✅ Cleaned up all references`);
      
      // Finally delete the user
      await prisma.$executeRaw`DELETE FROM "User" WHERE id = ${userId}`;
      
      console.log(`  ✅ Deleted user: ${user.fullName}\n`);
    }
    
    console.log('✅ All test users deleted successfully!');
    
  } catch (error) {
    console.error('❌ Error deleting test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestUser();
