import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkGestionnaireDocuments() {
  console.log('🔍 Checking gestionnaire documents...\n');

  const gestionnaires = await prisma.user.findMany({
    where: {
      role: { in: ['GESTIONNAIRE', 'GESTIONNAIRE_SENIOR'] },
      active: true
    },
    select: {
      id: true,
      fullName: true,
      email: true
    }
  });

  console.log(`Found ${gestionnaires.length} gestionnaires\n`);

  for (const gest of gestionnaires) {
    console.log(`\n📋 ${gest.fullName || gest.email} (${gest.id})`);
    
    // Check assigned documents
    const assignedDocs = await prisma.document.count({
      where: { assignedToUserId: gest.id }
    });
    console.log(`   Assigned documents: ${assignedDocs}`);
    
    // Check completed in assignment history
    const completedDocs = await prisma.documentAssignmentHistory.count({
      where: {
        assignedToUserId: gest.id,
        action: 'COMPLETED'
      }
    });
    console.log(`   Completed documents (history): ${completedDocs}`);
    
    // Check last 24h completed
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const completedLast24h = await prisma.documentAssignmentHistory.count({
      where: {
        assignedToUserId: gest.id,
        action: 'COMPLETED',
        createdAt: { gte: last24h }
      }
    });
    console.log(`   Completed last 24h: ${completedLast24h}`);
    
    // Check all assignment history actions
    const allActions = await prisma.documentAssignmentHistory.groupBy({
      by: ['action'],
      where: { assignedToUserId: gest.id },
      _count: true
    });
    console.log(`   All actions:`, allActions.map(a => `${a.action}: ${a._count}`).join(', '));
  }

  await prisma.$disconnect();
}

checkGestionnaireDocuments().catch(console.error);
