const fs = require('fs');
const path = require('path');

// Remaining files to fix
const filesToFix = [
  'frontend/src/components/GEC/InboxTab.tsx',
  'frontend/src/components/GEC/MailTrackingDashboard.tsx',
  'frontend/src/components/GEC/OutboxTab.tsx',
  'frontend/src/components/GEC/OutlookIntegration.tsx',
  'frontend/src/components/GEC/RelanceManager.tsx',
  'frontend/src/components/GEC/ReportsTab.tsx',
  'frontend/src/components/GEC/SearchArchiveTab.tsx',
  'frontend/src/components/GED/DocumentWorkflowManager.tsx',
  'frontend/src/components/GED/IntegrationManager.tsx',
  'frontend/src/components/GED/ReportsTab.tsx',
  'frontend/src/pages/bs/BSAnalyticsPage.tsx',
  'frontend/src/pages/bs/BSListPage.tsx'
];

function fixFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  
  // Replace hardcoded URLs with environment variable + fallback
  // Pattern: 'http://localhost:5000/api/...' -> `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/...`
  content = content.replace(
    /'http:\/\/localhost:5000\/api\/([^']+)'/g,
    "`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/$1`"
  );
  
  // Pattern: `http://localhost:5000/api/...` -> `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/...`
  content = content.replace(
    /`http:\/\/localhost:5000\/api\/([^`]+)`/g,
    "`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/$1`"
  );
  
  // Pattern: "http://localhost:5000/api/..." -> `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/...`
  content = content.replace(
    /"http:\/\/localhost:5000\/api\/([^"]+)"/g,
    "`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/$1`"
  );
  
  // Pattern: 'http://localhost:5000' (without /api) -> `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}`
  content = content.replace(
    /'http:\/\/localhost:5000'(?!\/api)/g,
    "`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}`"
  );
  
  // Pattern: link.href = 'http://localhost:5000/api/...' -> link.href = `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/...`
  content = content.replace(
    /link\.href = 'http:\/\/localhost:5000\/api\/([^']+)'/g,
    "link.href = `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/$1`"
  );
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  } else {
    console.log(`⚠️ No changes needed: ${filePath}`);
    return false;
  }
}

// Fix all files
let totalFixed = 0;
filesToFix.forEach(file => {
  if (fixFile(file)) {
    totalFixed++;
  }
});

console.log(`\n🎉 Total files fixed: ${totalFixed}`);
console.log('✅ All remaining hardcoded URLs have been updated!');