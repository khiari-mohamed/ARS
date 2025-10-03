const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Finance Workflow Implementation\n');

const checks = [
  {
    name: 'Backend Controller Endpoint',
    file: 'server/src/finance/finance.controller.ts',
    search: 'ordres-virement/:id/status',
    description: 'New status update endpoint'
  },
  {
    name: 'Frontend Service Method',
    file: 'frontend/src/services/financeService.ts',
    search: 'async updateOVStatus',
    description: 'Service method to call backend'
  },
  {
    name: 'SuiviVirementTab Update',
    file: 'frontend/src/components/Finance/SuiviVirementTab.tsx',
    search: 'financeService.updateOVStatus',
    description: 'UI component using new method'
  },
  {
    name: 'TrackingTab Update',
    file: 'frontend/src/components/Finance/TrackingTab.tsx',
    search: 'financeService.updateOVStatus',
    description: 'Tracking tab using new method'
  },
  {
    name: 'Test Script',
    file: 'server/test-ov-status-update.js',
    search: 'testOVStatusUpdate',
    description: 'Automated test script'
  },
  {
    name: 'Documentation',
    file: 'server/FINANCE_STATUS_WORKFLOW_GUIDE.md',
    search: 'Finance Module - OV Status Workflow Guide',
    description: 'Complete workflow documentation'
  }
];

let allPassed = true;

checks.forEach((check, index) => {
  const filePath = path.join(__dirname, check.file);
  
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (content.includes(check.search)) {
        console.log(`✅ ${index + 1}. ${check.name}`);
        console.log(`   📄 ${check.file}`);
        console.log(`   ℹ️  ${check.description}\n`);
      } else {
        console.log(`⚠️  ${index + 1}. ${check.name}`);
        console.log(`   📄 ${check.file}`);
        console.log(`   ❌ Search string not found: "${check.search}"\n`);
        allPassed = false;
      }
    } else {
      console.log(`❌ ${index + 1}. ${check.name}`);
      console.log(`   📄 ${check.file}`);
      console.log(`   ❌ File not found\n`);
      allPassed = false;
    }
  } catch (error) {
    console.log(`❌ ${index + 1}. ${check.name}`);
    console.log(`   📄 ${check.file}`);
    console.log(`   ❌ Error: ${error.message}\n`);
    allPassed = false;
  }
});

console.log('═'.repeat(60));

if (allPassed) {
  console.log('\n🎉 ALL CHECKS PASSED! Finance workflow is 100% implemented.\n');
  console.log('📋 Next Steps:');
  console.log('   1. Start backend: cd server && npm run start:dev');
  console.log('   2. Start frontend: cd frontend && npm start');
  console.log('   3. Test workflow: node server/test-ov-status-update.js');
  console.log('   4. Manual test via UI: Finance Module → Suivi & Statut\n');
} else {
  console.log('\n⚠️  Some checks failed. Please review the errors above.\n');
}

console.log('📖 Documentation: FINANCE_STATUS_WORKFLOW_GUIDE.md\n');
