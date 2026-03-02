const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteTestUser() {
  try {
    console.log('🔍 Searching for "Test User" in database...\n');
    
    // Find users with "Test" in their name
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
      // Delete related data first (to avoid foreign key constraints)
      
      // 1. Delete document assignments
      const docsCount = await prisma.document.updateMany({
        where: { assignedToUserId: user.id },
        data: { assignedToUserId: null }
      });
      console.log(`  - Unassigned ${docsCount.count} documents from ${user.fullName}`);
      
      // 2. Delete uploaded documents
      const uploadedDocsCount = await prisma.document.deleteMany({
        where: { uploadedById: user.id }
      });
      console.log(`  - Deleted ${uploadedDocsCount.count} uploaded documents`);
      
      // 3. Try to delete document assignment history (skip if table doesn't exist or has different structure)
      try {
        const historyCount = await prisma.$executeRaw`DELETE FROM "DocumentAssignmentHistory" WHERE "assignedToId" = ${user.id} OR "assignedById" = ${user.id}`;
        console.log(`  - Deleted assignment history records`);
      } catch (error) {
        console.log(`  - Skipped assignment history (table may not exist)`);
      }
      
      // 4. Update team members if user is team leader
      const teamMembersCount = await prisma.user.updateMany({
        where: { teamLeaderId: user.id },
        data: { teamLeaderId: null }
      });
      if (teamMembersCount.count > 0) {
        console.log(`  - Updated ${teamMembersCount.count} team members`);
      }
      
      // 5. Update contracts where user is team leader
      const contractsCount = await prisma.contract.updateMany({
        where: { teamLeaderId: user.id },
        data: { teamLeaderId: null }
      });
      if (contractsCount.count > 0) {
        console.log(`  - Updated ${contractsCount.count} contracts`);
      }
      
      // 6. Update clients where user is charge de compte
      const clientsCount = await prisma.client.updateMany({
        where: { chargeCompteId: user.id },
        data: { chargeCompteId: null }
      });
      if (clientsCount.count > 0) {
        console.log(`  - Updated ${clientsCount.count} clients`);
      }
      
      // 7. Delete audit logs
      try {
        await prisma.$executeRaw`DELETE FROM "AuditLog" WHERE "userId" = ${user.id}`;
        console.log(`  - Deleted audit logs`);
      } catch (error) {
        console.log(`  - Skipped audit logs`);
      }
      
      // 8. Finally delete the user using raw SQL
      await prisma.$executeRaw`DELETE FROM "User" WHERE id = ${user.id}`;
      
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
