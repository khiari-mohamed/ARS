const fs = require('fs');
const path = require('path');

// PaperStream environment variables to check
const paperstreamVars = [
  'PAPERSTREAM_WATCH_FOLDER',
  'PAPERSTREAM_PROCESSED_FOLDER',
  'PAPERSTREAM_ENABLED',
  'PAPERSTREAM_BATCH_TIMEOUT',
  'PAPERSTREAM_AUTO_PROCESS',
  'PAPERSTREAM_ENABLE_IMPRINTER',
  'PAPERSTREAM_DEFAULT_SCANNER'
];

// File extensions to check
const extensions = ['.js', '.ts', '.json'];

// Directories to exclude
const excludeDirs = ['node_modules', '.git', 'dist', 'uploads', 'exports', 'generated', 'migrations'];

function shouldProcessFile(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath);
  
  if (excludeDirs.some(exclude => filePath.includes(exclude))) return false;
  if (fileName.includes('package-lock')) return false;
  
  return extensions.includes(ext);
}

function scanFile(filePath) {
  const results = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    paperstreamVars.forEach(varName => {
      lines.forEach((line, index) => {
        // Check for process.env.VARIABLE_NAME usage
        if (line.includes(`process.env.${varName}`) || line.includes(`process.env['${varName}']`) || line.includes(`process.env["${varName}"]`)) {
          results.push({
            variable: varName,
            line: index + 1,
            context: line.trim(),
            usage: 'process.env access'
          });
        }
        // Check for direct variable reference
        else if (line.includes(varName) && !line.includes('//')) {
          results.push({
            variable: varName,
            line: index + 1,
            context: line.trim(),
            usage: 'direct reference'
          });
        }
      });
    });
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
  }
  
  return results;
}

function scanDirectory(dir) {
  const results = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!excludeDirs.includes(item)) {
          results.push(...scanDirectory(fullPath));
        }
      } else if (shouldProcessFile(fullPath)) {
        const fileResults = scanFile(fullPath);
        if (fileResults.length > 0) {
          results.push({
            file: path.relative(__dirname, fullPath),
            usages: fileResults
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dir}:`, error.message);
  }
  
  return results;
}

// Main execution
console.log('🔍 Checking PaperStream variable usage in backend...\n');

const backendDirs = ['server/src', 'server'];
const allUsages = {};

// Initialize usage tracking
paperstreamVars.forEach(varName => {
  allUsages[varName] = [];
});

backendDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  
  if (fs.existsSync(dirPath)) {
    console.log(`📁 Scanning ${dir}/`);
    const results = scanDirectory(dirPath);
    
    if (results.length === 0) {
      console.log('   No PaperStream variables found\n');
      return;
    }
    
    results.forEach(({ file, usages }) => {
      console.log(`\n📄 ${file}`);
      
      usages.forEach(({ variable, line, context, usage }) => {
        console.log(`   ${variable} (Line ${line}) - ${usage}`);
        console.log(`   Context: ${context}`);
        
        // Track usage
        allUsages[variable].push({
          file,
          line,
          context,
          usage
        });
      });
    });
    
    console.log('');
  } else {
    console.log(`⚠️  Directory not found: ${dir}\n`);
  }
});

// Summary
console.log('📊 USAGE SUMMARY');
console.log('='.repeat(50));

paperstreamVars.forEach(varName => {
  const usageCount = allUsages[varName].length;
  const status = usageCount > 0 ? '✅ USED' : '❌ NOT USED';
  
  console.log(`${status} ${varName} (${usageCount} occurrences)`);
  
  if (usageCount > 0) {
    allUsages[varName].forEach(({ file, line }) => {
      console.log(`   └─ ${file}:${line}`);
    });
  }
});

console.log('\n💡 Recommendation:');
console.log('- Keep variables that are USED in the code');
console.log('- Remove or comment out variables that are NOT USED');
console.log('- For duplicates, keep the one that matches the usage pattern in code');