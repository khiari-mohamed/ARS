// Script to create sample OV (Ordres de Virement) data
// Run this with: node create-sample-ov-data.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSampleOVData() {
  try {
    console.log('🔧 Creating sample OV data...');
    
    // Create a society
    const society = await prisma.society.create({
      data: {
        name: 'ARS SARL',
        code: 'ARS001'
      }
    });
    console.log('✅ Created society:', society.name);
    
    // Create a donneur d'ordre
    const donneur = await prisma.donneurDOrdre.create({
      data: {
        societyId: society.id,
        name: 'ARS Direction',
        rib: '12345678901234567890123'
      }
    });
    console.log('✅ Created donneur d\'ordre:', donneur.name);
    
    // Create members
    const members = await Promise.all([
      prisma.member.create({
        data: {
          societyId: society.id,
          name: 'Jean Dupont',
          rib: '98765432109876543210987',
          cin: '12345678',
          address: '123 Rue de la Paix, Tunis'
        }
      }),
      prisma.member.create({
        data: {
          societyId: society.id,
          name: 'Marie Martin',
          rib: '11223344556677889900112',
          cin: '87654321',
          address: '456 Avenue Habib Bourguiba, Sfax'
        }
      })
    ]);
    console.log('✅ Created members:', members.map(m => m.name).join(', '));
    
    // Create a wire transfer batch
    const batch = await prisma.wireTransferBatch.create({
      data: {
        societyId: society.id,
        donneurId: donneur.id,
        status: 'CREATED',
        fileName: 'batch_001.xml',
        fileType: 'XML'
      }
    });
    console.log('✅ Created wire transfer batch');
    
    // Create wire transfers with different statuses
    const transfers = await Promise.all([
      prisma.wireTransfer.create({
        data: {
          batchId: batch.id,
          memberId: members[0].id,
          donneurId: donneur.id,
          amount: 1500.00,
          reference: 'VIR001',
          status: 'EXECUTED'
        }
      }),
      prisma.wireTransfer.create({
        data: {
          batchId: batch.id,
          memberId: members[1].id,
          donneurId: donneur.id,
          amount: 2300.50,
          reference: 'VIR002',
          status: 'PENDING'
        }
      }),
      prisma.wireTransfer.create({
        data: {
          batchId: batch.id,
          memberId: members[0].id,
          donneurId: donneur.id,
          amount: 850.75,
          reference: 'VIR003',
          status: 'REJECTED',
          error: 'RIB invalide'
        }
      }),
      prisma.wireTransfer.create({
        data: {
          batchId: batch.id,
          memberId: members[1].id,
          donneurId: donneur.id,
          amount: 3200.00,
          reference: 'VIR004',
          status: 'EXECUTED'
        }
      })
    ]);
    
    console.log('✅ Created wire transfers:', transfers.length);
    
    // Update batch status
    await prisma.wireTransferBatch.update({
      where: { id: batch.id },
      data: { status: 'PROCESSED' }
    });
    
    // Show summary
    console.log('\n📊 Sample data created successfully!');
    console.log(`   - 1 Society: ${society.name}`);
    console.log(`   - 1 Donneur d'Ordre: ${donneur.name}`);
    console.log(`   - ${members.length} Members`);
    console.log(`   - 1 WireTransferBatch`);
    console.log(`   - ${transfers.length} WireTransfers`);
    
    // Show status breakdown
    const statusCounts = {};
    transfers.forEach(t => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });
    
    console.log('\n📈 Status breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });
    
    const totalAmount = transfers.reduce((sum, t) => sum + t.amount, 0);
    console.log(`\n💰 Total amount: ${totalAmount.toFixed(2)} TND`);
    
  } catch (error) {
    console.error('❌ Error creating sample OV data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleOVData();