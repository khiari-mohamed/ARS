// Script to clear modeRecuperation from all clients
// Run: node clear-mode-recuperation.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearModeRecuperation() {
  try {
    console.log('🔍 Checking current modeRecuperation values...\n');
    
    // Check current values
    const clientsBefore = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        modeRecuperation: true
      }
    });
    
    console.log('📊 Current values:');
    console.log('─'.repeat(80));
    clientsBefore.forEach(client => {
      console.log(`${client.name.padEnd(40)} | ${client.modeRecuperation || 'NULL'}`);
    });
    console.log('─'.repeat(80));
    console.log(`Total clients: ${clientsBefore.length}\n`);
    
    // Count clients with values
    const withValues = clientsBefore.filter(c => c.modeRecuperation !== null).length;
    console.log(`Clients with modeRecuperation set: ${withValues}`);
    console.log(`Clients with NULL: ${clientsBefore.length - withValues}\n`);
    
    // Update all to NULL
    console.log('🔄 Clearing all modeRecuperation values to NULL...\n');
    
    const result = await prisma.client.updateMany({
      data: {
        modeRecuperation: null
      }
    });
    
    console.log(`✅ Updated ${result.count} clients\n`);
    
    // Verify after update
    console.log('🔍 Verifying after update...\n');
    
    const clientsAfter = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        modeRecuperation: true
      }
    });
    
    console.log('📊 Values after update:');
    console.log('─'.repeat(80));
    clientsAfter.forEach(client => {
      console.log(`${client.name.padEnd(40)} | ${client.modeRecuperation || 'NULL'}`);
    });
    console.log('─'.repeat(80));
    
    const stillWithValues = clientsAfter.filter(c => c.modeRecuperation !== null).length;
    
    if (stillWithValues === 0) {
      console.log('\n✅ SUCCESS: All modeRecuperation values cleared to NULL');
      console.log('📋 Finance dashboard will now show "-" for all clients');
      console.log('👤 Users must now explicitly set mode de récupération for each client');
    } else {
      console.log(`\n⚠️  WARNING: ${stillWithValues} clients still have values set`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearModeRecuperation();
