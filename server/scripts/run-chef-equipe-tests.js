const { populateChefEquipeTestData } = require('./populate-chef-equipe-test-data');
const { checkChefEquipeData } = require('./check-chef-equipe-data');

async function runChefEquipeTests() {
  console.log('🚀 Running Chef d\'Équipe complete test suite...\n');

  try {
    // Step 1: Populate test data
    console.log('📊 STEP 1: Populating test data...');
    await populateChefEquipeTestData();
    
    console.log('\n⏳ Waiting 2 seconds for data to settle...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Verify data
    console.log('\n🔍 STEP 2: Verifying data structure...');
    await checkChefEquipeData();

    console.log('\n✅ COMPLETE TEST SUITE FINISHED SUCCESSFULLY!');
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Start the server: npm run start:dev');
    console.log('2. Login as Chef d\'Équipe: chef.equipe@ars.tn');
    console.log('3. Navigate to Chef d\'Équipe module');
    console.log('4. Test all 3 tabs and action buttons');
    console.log('\n📋 EXPECTED RESULTS:');
    console.log('• Tab 1 (Non-Affectés): 8 bordereaux with Affecter/Rejeter/Traiter buttons');
    console.log('• Tab 2 (En Cours): 12 bordereaux being processed by team');
    console.log('• Tab 3 (Traités): 15 recently completed bordereaux');

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run the complete test suite
if (require.main === module) {
  runChefEquipeTests()
    .then(() => {
      console.log('\n🎉 All tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runChefEquipeTests };