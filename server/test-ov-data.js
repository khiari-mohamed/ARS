// Test script to check OV (Ordres de Virement) data
// Run this with: node test-ov-data.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkOVData() {
  try {
    console.log('🔍 Checking OV (Ordres de Virement) data...');
    
    // Check WireTransfer data
    const wireTransferCount = await prisma.wireTransfer.count();
    const wireTransferBatchCount = await prisma.wireTransferBatch.count();
    
    console.log(`📊 Current OV data:`);
    console.log(`   - WireTransfers: ${wireTransferCount}`);
    console.log(`   - WireTransferBatches: ${wireTransferBatchCount}`);
    
    if (wireTransferCount > 0) {
      // Get transfers by status
      const transfersByStatus = await prisma.wireTransfer.groupBy({
        by: ['status'],
        _count: { id: true }
      });
      console.log('📈 WireTransfers by status:', transfersByStatus);
      
      // Get batches by status
      const batchesByStatus = await prisma.wireTransferBatch.groupBy({
        by: ['status'],
        _count: { id: true }
      });
      console.log('📈 WireTransferBatches by status:', batchesByStatus);
      
      // Sample transfers
      const sampleTransfers = await prisma.wireTransfer.findMany({
        take: 5,
        include: {
          member: true,
          donneur: true,
          batch: {
            include: {
              society: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      console.log('📋 Sample WireTransfers:');
      sampleTransfers.forEach(transfer => {
        console.log(`   - ID: ${transfer.id.slice(0, 8)}, Amount: ${transfer.amount}, Status: ${transfer.status}, Society: ${transfer.batch.society.name}`);
      });
    }
    
    // Check related tables
    const societyCount = await prisma.society.count();
    const memberCount = await prisma.member.count();
    const donneurCount = await prisma.donneurDOrdre.count();
    
    console.log(`📊 Related data:`);
    console.log(`   - Societies: ${societyCount}`);
    console.log(`   - Members: ${memberCount}`);
    console.log(`   - Donneurs d'Ordre: ${donneurCount}`);
    
    if (societyCount > 0) {
      const societies = await prisma.society.findMany({
        take: 3,
        select: { id: true, name: true, code: true }
      });
      console.log('🏢 Sample Societies:', societies);
    }
    
    // Check if we need to create sample data
    if (wireTransferCount === 0 && societyCount === 0) {
      console.log('\n📝 No OV data found. Would you like to create sample data?');
      console.log('💡 Sample data would include:');
      console.log('   - 1 Society (ARS SARL)');
      console.log('   - 2 Members');
      console.log('   - 1 Donneur d\'Ordre');
      console.log('   - 1 WireTransferBatch');
      console.log('   - 3-5 WireTransfers with different statuses');
      
      console.log('\n🔧 To create sample data, run:');
      console.log('   node create-sample-ov-data.js');
    }
    
  } catch (error) {
    console.error('❌ Error checking OV data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOVData();