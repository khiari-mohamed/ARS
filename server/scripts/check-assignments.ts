import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAssignments() {
  console.log('🔍 Checking bordereau and document assignments...\n');

  // Get all bordereaux with their documents
  const bordereaux = await prisma.bordereau.findMany({
    select: {
      id: true,
      reference: true,
      statut: true,
      assignedToUserId: true,
      documents: {
        select: {
          id: true,
          name: true,
          assignedToUserId: true,
          assignedTo: { select: { fullName: true } }
        }
      }
    },
    take: 10
  });

  console.log(`Found ${bordereaux.length} bordereaux (showing first 10)\n`);

  for (const b of bordereaux) {
    const assignedUser = b.assignedToUserId ? await prisma.user.findUnique({
      where: { id: b.assignedToUserId },
      select: { fullName: true }
    }) : null;

    console.log(`\n📋 Bordereau: ${b.reference}`);
    console.log(`   Status: ${b.statut}`);
    console.log(`   Bordereau assigned to: ${assignedUser?.fullName || '❌ NOT ASSIGNED'}`);
    console.log(`   Documents (${b.documents.length}):`);
    
    b.documents.forEach((doc, i) => {
      console.log(`      ${i + 1}. ${doc.name}`);
      console.log(`         Assigned to: ${doc.assignedTo?.fullName || '❌ NOT ASSIGNED'}`);
    });
  }

  // Summary
  console.log('\n\n📊 SUMMARY:');
  
  const totalBordereaux = await prisma.bordereau.count();
  const assignedBordereaux = await prisma.bordereau.count({
    where: { assignedToUserId: { not: null } }
  });
  
  const totalDocuments = await prisma.document.count();
  const assignedDocuments = await prisma.document.count({
    where: { assignedToUserId: { not: null } }
  });

  console.log(`\nBordereaux: ${assignedBordereaux}/${totalBordereaux} assigned`);
  console.log(`Documents: ${assignedDocuments}/${totalDocuments} assigned`);

  await prisma.$disconnect();
}

checkAssignments().catch(console.error);
