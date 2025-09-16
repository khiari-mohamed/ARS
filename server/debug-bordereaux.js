const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugBordereaux() {
  try {
    console.log('🔍 Debugging Bordereaux Database...\n');

    // Check total count
    const totalCount = await prisma.bordereau.count();
    console.log(`📊 Total bordereaux: ${totalCount}`);

    if (totalCount === 0) {
      console.log('❌ No bordereaux found in database!');
      console.log('💡 Creating test bordereaux...\n');
      
      // Create test client first
      const testClient = await prisma.client.upsert({
        where: { name: 'Test Client' },
        update: {},
        create: {
          name: 'Test Client',
          reglementDelay: 30,
          reclamationDelay: 7
        }
      });

      // Create test bordereaux
      const testBordereaux = [
        {
          reference: 'BDX-TEST-001',
          clientId: testClient.id,
          dateReception: new Date(),
          delaiReglement: 30,
          nombreBS: 5,
          statut: 'A_AFFECTER'
        },
        {
          reference: 'BDX-TEST-002', 
          clientId: testClient.id,
          dateReception: new Date(),
          delaiReglement: 30,
          nombreBS: 8,
          statut: 'SCANNE'
        },
        {
          reference: 'BDX-TEST-003',
          clientId: testClient.id,
          dateReception: new Date(),
          delaiReglement: 30,
          nombreBS: 3,
          statut: 'EN_ATTENTE'
        }
      ];

      for (const bordereau of testBordereaux) {
        await prisma.bordereau.create({ data: bordereau });
        console.log(`✅ Created: ${bordereau.reference} (${bordereau.statut})`);
      }
      
      console.log('\n🎉 Test bordereaux created successfully!');
    } else {
      // Show existing bordereaux
      const bordereaux = await prisma.bordereau.findMany({
        include: {
          client: { select: { name: true } }
        },
        orderBy: { dateReception: 'desc' },
        take: 10
      });

      console.log('\n📋 Recent bordereaux:');
      bordereaux.forEach(b => {
        console.log(`  ${b.reference}: ${b.statut} | Client: ${b.client?.name} | Assigned: ${b.assignedToUserId ? 'YES' : 'NO'}`);
      });

      // Check unassigned
      const unassigned = await prisma.bordereau.findMany({
        where: {
          OR: [
            { statut: { in: ['SCANNE', 'A_AFFECTER'] } },
            { assignedToUserId: null }
          ]
        }
      });

      console.log(`\n🎯 Unassigned bordereaux: ${unassigned.length}`);
      unassigned.forEach(b => {
        console.log(`  ${b.reference}: ${b.statut} | Assigned: ${b.assignedToUserId ? 'YES' : 'NO'}`);
      });

      // Status breakdown
      const statusCounts = await prisma.bordereau.groupBy({
        by: ['statut'],
        _count: { statut: true }
      });

      console.log('\n📊 Status breakdown:');
      statusCounts.forEach(s => {
        console.log(`  ${s.statut}: ${s._count.statut}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugBordereaux();