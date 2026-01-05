import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectDocuments() {
  console.log('\n🔍 INSPECTING ALL DOCUMENTS IN DATABASE\n');
  
  const documents = await prisma.document.findMany({
    include: {
      assignedTo: { select: { id: true, fullName: true, role: true } },
      bordereau: {
        include: {
          currentHandler: { select: { id: true, fullName: true, role: true } },
          contract: {
            select: {
              assignedManager: { select: { id: true, fullName: true, role: true } },
              teamLeader: { select: { id: true, fullName: true, role: true } }
            }
          }
        }
      }
    }
  });

  console.log(`📊 Total Documents: ${documents.length}\n`);
  
  const summary = {
    total: documents.length,
    withAssignedTo: 0,
    withCurrentHandler: 0,
    withContractManager: 0,
    withTeamLeader: 0,
    noAssignment: 0,
    byRole: {} as Record<string, number>
  };

  documents.forEach((doc, index) => {
    if (index < 50) {
      console.log(`\n📄 Document #${index + 1}: ${doc.name}`);
      console.log(`   Type: ${doc.type} | Status: ${doc.status}`);
      
      if (doc.assignedTo) {
        console.log(`   ✅ assignedTo: ${doc.assignedTo.fullName} (${doc.assignedTo.role})`);
        summary.withAssignedTo++;
        summary.byRole[doc.assignedTo.role] = (summary.byRole[doc.assignedTo.role] || 0) + 1;
      } else {
        console.log(`   ❌ assignedTo: NULL`);
      }
      
      if (doc.bordereau?.currentHandler) {
        console.log(`   👤 currentHandler: ${doc.bordereau.currentHandler.fullName} (${doc.bordereau.currentHandler.role})`);
        summary.withCurrentHandler++;
      } else {
        console.log(`   ❌ currentHandler: NULL`);
      }
      
      if (doc.bordereau?.contract?.assignedManager) {
        console.log(`   👔 contract.assignedManager: ${doc.bordereau.contract.assignedManager.fullName} (${doc.bordereau.contract.assignedManager.role})`);
        summary.withContractManager++;
      } else {
        console.log(`   ❌ contract.assignedManager: NULL`);
      }
      
      if (doc.bordereau?.contract?.teamLeader) {
        console.log(`   👨💼 contract.teamLeader: ${doc.bordereau.contract.teamLeader.fullName} (${doc.bordereau.contract.teamLeader.role})`);
        summary.withTeamLeader++;
      } else {
        console.log(`   ❌ contract.teamLeader: NULL`);
      }
      
      if (!doc.assignedTo && !doc.bordereau?.currentHandler && !doc.bordereau?.contract?.assignedManager) {
        console.log(`   ⚠️ NO ASSIGNMENT FOUND`);
        summary.noAssignment++;
      }
    } else {
      if (doc.assignedTo) {
        summary.withAssignedTo++;
        summary.byRole[doc.assignedTo.role] = (summary.byRole[doc.assignedTo.role] || 0) + 1;
      }
      if (doc.bordereau?.currentHandler) summary.withCurrentHandler++;
      if (doc.bordereau?.contract?.assignedManager) summary.withContractManager++;
      if (doc.bordereau?.contract?.teamLeader) summary.withTeamLeader++;
      if (!doc.assignedTo && !doc.bordereau?.currentHandler && !doc.bordereau?.contract?.assignedManager) {
        summary.noAssignment++;
      }
    }
  });

  console.log(`\n\n📊 SUMMARY:`);
  console.log(`   Total Documents: ${summary.total}`);
  console.log(`   With assignedTo: ${summary.withAssignedTo}`);
  console.log(`   With currentHandler: ${summary.withCurrentHandler}`);
  console.log(`   With contract.assignedManager: ${summary.withContractManager}`);
  console.log(`   With contract.teamLeader: ${summary.withTeamLeader}`);
  console.log(`   No Assignment: ${summary.noAssignment}`);
  console.log(`\n   Documents by Role:`);
  Object.entries(summary.byRole).forEach(([role, count]) => {
    console.log(`      ${role}: ${count}`);
  });

  await prisma.$disconnect();
}

inspectDocuments().catch(console.error);
