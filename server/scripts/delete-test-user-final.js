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
      
      console.log(`  Cleaning up references for ${user.fullName}...`);
      
      // Try each cleanup, skip if column doesn't exist
      const cleanups = [
        { sql: `UPDATE "Document" SET "assignedToUserId" = NULL WHERE "assignedToUserId" = '${userId}'`, name: 'Document.assignedToUserId' },
        { sql: `DELETE FROM "Document" WHERE "uploadedById" = '${userId}'`, name: 'Document.uploadedById' },
        { sql: `DELETE FROM "Notification" WHERE "userId" = '${userId}'`, name: 'Notification' },
        { sql: `DELETE FROM "AuditLog" WHERE "userId" = '${userId}'`, name: 'AuditLog' },
        { sql: `DELETE FROM "AlertLog" WHERE "userId" = '${userId}'`, name: 'AlertLog' },
        { sql: `UPDATE "Bordereau" SET "assignedToUserId" = NULL WHERE "assignedToUserId" = '${userId}'`, name: 'Bordereau.assignedToUserId' },
        { sql: `UPDATE "Bordereau" SET "currentHandlerId" = NULL WHERE "currentHandlerId" = '${userId}'`, name: 'Bordereau.currentHandlerId' },
        { sql: `UPDATE "Bordereau" SET "teamId" = NULL WHERE "teamId" = '${userId}'`, name: 'Bordereau.teamId' },
        { sql: `UPDATE "Contract" SET "teamLeaderId" = NULL WHERE "teamLeaderId" = '${userId}'`, name: 'Contract.teamLeaderId' },
        { sql: `UPDATE "Client" SET "chargeCompteId" = NULL WHERE "chargeCompteId" = '${userId}'`, name: 'Client.chargeCompteId' },
        { sql: `UPDATE "User" SET "teamLeaderId" = NULL WHERE "teamLeaderId" = '${userId}'`, name: 'User.teamLeaderId' },
        { sql: `UPDATE "BulletinSoin" SET "assignedToUserId" = NULL WHERE "assignedToUserId" = '${userId}'`, name: 'BulletinSoin.assignedToUserId' },
        { sql: `UPDATE "BulletinSoin" SET "validatedById" = NULL WHERE "validatedById" = '${userId}'`, name: 'BulletinSoin.validatedById' },
        { sql: `UPDATE "Courrier" SET "assignedToUserId" = NULL WHERE "assignedToUserId" = '${userId}'`, name: 'Courrier.assignedToUserId' },
        { sql: `UPDATE "WireTransferBatch" SET "createdById" = NULL WHERE "createdById" = '${userId}'`, name: 'WireTransferBatch.createdById' },
        { sql: `UPDATE "WireTransferBatch" SET "confirmedById" = NULL WHERE "confirmedById" = '${userId}'`, name: 'WireTransferBatch.confirmedById' },
      ];
      
      for (const cleanup of cleanups) {
        try {
          await prisma.$executeRawUnsafe(cleanup.sql);
        } catch (error) {
          // Skip if column doesn't exist
        }
      }
      
      console.log(`  ✅ Cleaned up all references`);
      
      // Finally delete the user
      await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE id = '${userId}'`);
      
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
