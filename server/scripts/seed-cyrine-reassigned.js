const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // 1. Find Cyrine
  const cyrine = await p.user.findFirst({
    where: { fullName: { contains: 'Cyrine', mode: 'insensitive' } },
    select: { id: true, fullName: true, email: true, role: true }
  });

  if (!cyrine) {
    console.error('❌ Cyrine not found. Listing all GESTIONNAIRE_SENIOR users:');
    const all = await p.user.findMany({ where: { role: 'GESTIONNAIRE_SENIOR' }, select: { id: true, fullName: true } });
    console.log(JSON.stringify(all, null, 2));
    return;
  }

  console.log('✅ Found:', cyrine.fullName, '|', cyrine.id);

  // 2. Find a superadmin to act as the one who reassigned
  const admin = await p.user.findFirst({
    where: { role: { in: ['SUPER_ADMIN', 'ADMINISTRATEUR'] } },
    select: { id: true, fullName: true }
  });

  if (!admin) { console.error('❌ No admin found'); return; }
  console.log('✅ Admin (reassigner):', admin.fullName);

  // 3. Find some existing documents not already assigned to Cyrine
  const docs = await p.document.findMany({
    where: {
      assignedToUserId: { not: cyrine.id },
      bordereau: { archived: false }
    },
    include: { bordereau: { select: { id: true, reference: true, statut: true } } },
    take: 25
  });

  if (docs.length === 0) {
    console.error('❌ No documents found to reassign');
    return;
  }

  console.log(`📄 Found ${docs.length} documents to reassign to Cyrine`);

  // 4. Reassign each document to Cyrine + create history entry
  let count = 0;
  for (const doc of docs) {
    const previousOwner = doc.assignedToUserId;

    await p.document.update({
      where: { id: doc.id },
      data: {
        assignedToUserId: cyrine.id,
        assignedAt: new Date(),
        assignedByUserId: admin.id
      }
    });

    await p.documentAssignmentHistory.create({
      data: {
        documentId: doc.id,
        assignedToUserId: cyrine.id,
        assignedByUserId: admin.id,
        fromUserId: previousOwner || null,
        action: 'REASSIGNED',
        reason: 'Test reassignment for dashboard pagination'
      }
    });

    count++;
    console.log(`  ✓ [${count}] ${doc.name} (bordereau: ${doc.bordereau?.reference ?? 'N/A'})`);
  }

  console.log(`\n🎉 Done! ${count} documents reassigned to ${cyrine.fullName}`);
  console.log(`👉 Hit GET /super-admin/gestionnaire-senior/reassigned-documents?userId=${cyrine.id}`);
}

main().catch(console.error).finally(() => p.$disconnect());
