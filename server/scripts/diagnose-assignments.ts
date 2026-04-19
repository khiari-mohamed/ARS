import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseAssignments() {
  console.log('='.repeat(80));
  console.log('DIAGNOSTIC: Document Assignment Analysis');
  console.log('='.repeat(80));
  console.log();

  // 1. Check total documents
  const totalDocs = await prisma.document.count();
  console.log(`📊 Total Documents: ${totalDocs}`);
  console.log();

  // 2. Check documents by assignment status
  const assignedDocs = await prisma.document.count({
    where: { assignedToUserId: { not: null } }
  });
  const unassignedDocs = await prisma.document.count({
    where: { assignedToUserId: null }
  });
  
  console.log(`✅ Assigned Documents: ${assignedDocs} (${((assignedDocs/totalDocs)*100).toFixed(2)}%)`);
  console.log(`❌ Unassigned Documents: ${unassignedDocs} (${((unassignedDocs/totalDocs)*100).toFixed(2)}%)`);
  console.log();

  // 3. Check gestionnaires
  const gestionnaires = await prisma.user.findMany({
    where: { role: { in: ['GESTIONNAIRE', 'GESTIONNAIRE_SENIOR', 'GESTIONNAIRE_JUNIOR'] } },
    select: {
      id: true,
      fullName: true,
      role: true,
      _count: {
        select: { assignedDocuments: true }
      }
    }
  });

  console.log(`👥 Total Gestionnaires: ${gestionnaires.length}`);
  console.log();
  console.log('Gestionnaire Assignment Details:');
  console.log('-'.repeat(80));
  gestionnaires.forEach(g => {
    console.log(`  ${g.fullName} (${g.role}): ${g._count.assignedDocuments} documents`);
  });
  console.log();

  // 4. Check documents by type and assignment
  const docTypes = ['BULLETIN_SOIN', 'COMPLEMENT_INFORMATION', 'ADHESION', 'RECLAMATION', 'CONTRAT_AVENANT', 'DEMANDE_RESILIATION', 'CONVENTION_TIERS_PAYANT'];
  console.log('📋 Documents by Type:');
  console.log('-'.repeat(80));
  
  for (const type of docTypes) {
    const total = await prisma.document.count({ where: { type: type as any } });
    const assigned = await prisma.document.count({ where: { type: type as any, assignedToUserId: { not: null } } });
    const unassigned = total - assigned;
    console.log(`  ${type}: ${total} total | ${assigned} assigned | ${unassigned} unassigned`);
  }
  console.log();

  // 5. Check if there are any assignment history records
  const assignmentHistory = await prisma.documentAssignmentHistory.count();
  console.log(`📜 Assignment History Records: ${assignmentHistory}`);
  console.log();

  // 6. Sample unassigned documents
  const sampleUnassigned = await prisma.document.findMany({
    where: { assignedToUserId: null },
    take: 5,
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      uploadedAt: true,
      bordereau: { select: { client: { select: { name: true } } } }
    }
  });

  console.log('🔍 Sample Unassigned Documents (first 5):');
  console.log('-'.repeat(80));
  sampleUnassigned.forEach(doc => {
    console.log(`  ID: ${doc.id} | Name: ${doc.name} | Type: ${doc.type} | Status: ${doc.status}`);
    console.log(`    Client: ${doc.bordereau?.client?.name || 'N/A'} | Uploaded: ${doc.uploadedAt.toISOString()}`);
  });
  console.log();

  // 7. Check if assignedToUserId field exists and is properly set
  const docsWithGestionnaire = await prisma.document.findMany({
    where: { assignedToUserId: { not: null } },
    take: 5,
    select: {
      id: true,
      name: true,
      assignedToUserId: true,
      assignedTo: { select: { fullName: true } }
    }
  });

  console.log('✅ Sample Assigned Documents (first 5):');
  console.log('-'.repeat(80));
  if (docsWithGestionnaire.length === 0) {
    console.log('  ⚠️  NO ASSIGNED DOCUMENTS FOUND - This is the problem!');
  } else {
    docsWithGestionnaire.forEach(doc => {
      console.log(`  ID: ${doc.id} | Name: ${doc.name} | Gestionnaire: ${doc.assignedTo?.fullName}`);
    });
  }
  console.log();

  // 8. Check document status distribution
  const statusCounts = await prisma.document.groupBy({
    by: ['status'],
    _count: { status: true }
  });

  console.log('📊 Documents by Status:');
  console.log('-'.repeat(80));
  statusCounts.forEach(s => {
    console.log(`  ${s.status}: ${s._count.status}`);
  });
  console.log();

  console.log('='.repeat(80));
  console.log('CONCLUSION:');
  console.log('='.repeat(80));
  
  if (unassignedDocs === totalDocs) {
    console.log('❌ ISSUE FOUND: ALL documents are unassigned!');
    console.log('   This indicates either:');
    console.log('   1. Users have not assigned any documents yet (human error)');
    console.log('   2. The assignment functionality is broken (app bug)');
    console.log('   3. Data migration issue - gestionnaireId field not populated');
  } else if (unassignedDocs > totalDocs * 0.5) {
    console.log('⚠️  WARNING: More than 50% of documents are unassigned');
  } else {
    console.log('✅ Assignment distribution looks normal');
  }
  console.log('='.repeat(80));

  await prisma.$disconnect();
}

diagnoseAssignments().catch(console.error);
