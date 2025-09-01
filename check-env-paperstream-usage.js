const fs = require('fs');
const path = require('path');

// File extensions to check
const extensions = ['.js', '.ts', '.tsx', '.jsx', '.py', '.json', '.config', '.md'];

// Directories to exclude
const excludeDirs = ['node_modules', '.git', 'dist', 'uploads', 'exports', 'generated', 'migrations', 'build'];

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
    
    lines.forEach((line, index) => {
      // Check for .env.paperstream references
      if (line.includes('.env.paperstream') || line.includes('env.paperstream')) {
        results.push({
          line: index + 1,
          context: line.trim(),
          type: 'file reference'
        });
      }
      // Check for dotenv config loading
      else if (line.includes('dotenv') && line.includes('paperstream')) {
        results.push({
          line: index + 1,
          context: line.trim(),
          type: 'dotenv config'
        });
      }
      // Check for require/import of .env.paperstream
      else if ((line.includes('require') || line.includes('import')) && line.includes('paperstream')) {
        results.push({
          line: index + 1,
          context: line.trim(),
          type: 'require/import'
        });
      }
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
            references: fileResults
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
console.log('🔍 Checking for .env.paperstream file usage...\n');

const dirsToCheck = ['server', 'frontend', 'ai-microservice'];
let totalReferences = 0;

dirsToCheck.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  
  if (fs.existsSync(dirPath)) {
    console.log(`📁 Scanning ${dir}/`);
    const results = scanDirectory(dirPath);
    
    if (results.length === 0) {
      console.log('   ✅ No references to .env.paperstream found\n');
      return;
    }
    
    results.forEach(({ file, references }) => {
      console.log(`\n📄 ${file}`);
      
      references.forEach(({ line, context, type }) => {
        console.log(`   Line ${line} (${type}): ${context}`);
        totalReferences++;
      });
    });
    
    console.log('');
  } else {
    console.log(`⚠️  Directory not found: ${dir}\n`);
  }
});

// Check for any dotenv configuration files that might load .env.paperstream
console.log('🔧 Checking for dotenv configuration...');
const configFiles = [
  'server/main.ts',
  'server/src/main.ts', 
  'server/app.js',
  'server/index.js',
  'ai-microservice/main.py',
  'ai-microservice/app.py',
  'ai-microservice/config.py'
];

configFiles.forEach(configFile => {
  const filePath = path.join(__dirname, configFile);
  if (fs.existsSync(filePath)) {
    const results = scanFile(filePath);
    if (results.length > 0) {
      console.log(`\n📄 ${configFile}`);
      results.forEach(({ line, context, type }) => {
        console.log(`   Line ${line} (${type}): ${context}`);
        totalReferences++;
      });
    }
  }
});

console.log('\n' + '='.repeat(50));
console.log('📊 SUMMARY');
console.log('='.repeat(50));

if (totalReferences === 0) {
  console.log('✅ SAFE TO DELETE: No references to .env.paperstream found');
  console.log('   The file is not being loaded or used by any code');
} else {
  console.log(`⚠️  FOUND ${totalReferences} REFERENCES: Check before deleting`);
  console.log('   The file might be actively loaded by the application');
}

console.log('\n💡 Recommendation:');
if (totalReferences === 0) {
  console.log('- You can safely delete .env.paperstream');
  console.log('- All variables are now in the main .env file');
} else {
  console.log('- Review the references found above');
  console.log('- Update code to use main .env file before deleting');
}