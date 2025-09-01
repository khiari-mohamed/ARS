const fs = require('fs');
const path = require('path');

// Function to fix hardcoded URLs properly
function fixHardcodedUrls() {
  const frontendSrcPath = path.join(__dirname, 'frontend', 'src');
  
  // Get all TypeScript/JavaScript files
  function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        getAllFiles(filePath, fileList);
      } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
        fileList.push(filePath);
      }
    });
    
    return fileList;
  }
  
  const files = getAllFiles(frontendSrcPath);
  let totalFixed = 0;
  
  files.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Replace all variations of hardcoded localhost:5000 URLs
    // Pattern 1: 'http://localhost:5000/api/...' -> `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/...`
    content = content.replace(
      /'http:\/\/localhost:5000\/api\/([^']+)'/g,
      "`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/$1`"
    );
    
    // Pattern 2: `http://localhost:5000/api/...` -> `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/...`
    content = content.replace(
      /`http:\/\/localhost:5000\/api\/([^`]+)`/g,
      "`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/$1`"
    );
    
    // Pattern 3: "http://localhost:5000/api/..." -> `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/...`
    content = content.replace(
      /"http:\/\/localhost:5000\/api\/([^"]+)"/g,
      "`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/$1`"
    );
    
    // Pattern 4: 'http://localhost:5000' (without /api) -> `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}`
    content = content.replace(
      /'http:\/\/localhost:5000'(?!\/api)/g,
      "`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}`"
    );
    
    // Pattern 5: `http://localhost:5000` (without /api) -> `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}`
    content = content.replace(
      /`http:\/\/localhost:5000`(?!\/api)/g,
      "`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}`"
    );
    
    // Pattern 6: "http://localhost:5000" (without /api) -> `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}`
    content = content.replace(
      /"http:\/\/localhost:5000"(?!\/api)/g,
      "`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}`"
    );
    
    // Special case: Already has environment variable but hardcoded fallback needs API path
    content = content.replace(
      /process\.env\.REACT_APP_API_URL \|\| 'http:\/\/localhost:5000'(?!\/api)/g,
      "process.env.REACT_APP_API_URL || 'http://localhost:5000/api'"
    );
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      const relativePath = path.relative(__dirname, filePath);
      console.log(`✅ Fixed: ${relativePath}`);
      totalFixed++;
    }
  });
  
  console.log(`\n🎉 Total files fixed: ${totalFixed}`);
  
  // Verify the fixes
  console.log('\n🔍 Verifying fixes...');
  const remainingHardcoded = [];
  
  files.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = content.match(/http:\/\/localhost:5000/g);
    if (matches) {
      const relativePath = path.relative(__dirname, filePath);
      remainingHardcoded.push({ file: relativePath, count: matches.length });
    }
  });
  
  if (remainingHardcoded.length === 0) {
    console.log('✅ All hardcoded URLs have been successfully replaced!');
  } else {
    console.log('⚠️ Some hardcoded URLs remain:');
    remainingHardcoded.forEach(item => {
      console.log(`   ${item.file}: ${item.count} occurrence(s)`);
    });
  }
}

// Run the fix
fixHardcodedUrls();