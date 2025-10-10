const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, 'frontend', 'src');
const results = [];

// Patterns to search for
const patterns = [
  /http:\/\/localhost:\d+/gi,
  /http:\/\/127\.0\.0\.1:\d+/gi,
  /https?:\/\/[a-zA-Z0-9.-]+:\d+/gi,
];

function searchFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      patterns.forEach(pattern => {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            results.push({
              file: filePath.replace(__dirname + '\\', ''),
              line: index + 1,
              url: match,
              context: line.trim()
            });
          });
        }
      });
    });
  } catch (err) {
    // Skip files that can't be read
  }
}

function walkDir(dir) {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        if (!file.startsWith('.') && file !== 'node_modules' && file !== 'build') {
          walkDir(filePath);
        }
      } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
        searchFile(filePath);
      }
    });
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err.message);
  }
}

console.log('🔍 Searching for hardcoded URLs in frontend...\n');
walkDir(frontendDir);

if (results.length === 0) {
  console.log('✅ No hardcoded URLs found!');
} else {
  console.log(`⚠️  Found ${results.length} hardcoded URL(s):\n`);
  
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.file}:${result.line}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   Context: ${result.context}`);
    console.log('');
  });
}
