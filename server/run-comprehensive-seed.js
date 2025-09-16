const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting comprehensive database seeding...');
console.log('This will populate the database with extensive test data for all ARS modules.\n');

// Run the TypeScript seed script
const seedScript = path.join(__dirname, 'scripts', 'basic-seed.js');
const command = `node "${seedScript}"`;

console.log(`Executing: ${command}\n`);

const child = exec(command, { cwd: __dirname });

child.stdout.on('data', (data) => {
  process.stdout.write(data);
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Comprehensive database seeding completed successfully!');
    console.log('\n🎯 Your ARS application is now ready for testing with:');
    console.log('- 12 users across all departments');
    console.log('- 6 insurance clients with realistic data');
    console.log('- 50 bordereaux with various statuses');
    console.log('- 120 adherents with unique matricules');
    console.log('- 250+ bulletin de soins with items and expertises');
    console.log('- 30 reclamations with history tracking');
    console.log('- Complete wire transfer system');
    console.log('- AI learning data and performance analytics');
    console.log('- Comprehensive audit trails and notifications');
    console.log('\n🔗 You can now start testing all modules of the ARS application!');
  } else {
    console.error(`\n❌ Seeding failed with exit code ${code}`);
    process.exit(1);
  }
});

child.on('error', (error) => {
  console.error('❌ Error executing seed script:', error);
  process.exit(1);
});