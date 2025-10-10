const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const results = [];

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
              file: filePath.replace(srcDir, 'src'),
              line: index + 1,
              url: match,
              context: line.trim()
            });
          });
        }
      });
    });
  } catch (err) {}
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
  } catch (err) {}
}

console.log('Searching...\n');
walkDir(srcDir);

if (results.length === 0) {
  console.log('No hardcoded URLs found!');
} else {
  console.log(`Found ${results.length} hardcoded URL(s):\n`);
  
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.file}:${result.line}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   ${result.context}`);
    console.log('');
  });
}
