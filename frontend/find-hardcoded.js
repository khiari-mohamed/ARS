const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const results = [];

function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Skip VALID patterns
      if (line.includes('LocalAPI.')) return;
      if (line.includes('AIAPI.')) return;
      if (line.includes('ExternalAPI.')) return;
      if (line.includes('import')) return;
      if (line.includes('from')) return;
      if (line.includes('baseURL:')) return;
      if (line.includes('const API_BASE') || line.includes('const AI_BASE')) return;
      if (line.includes('const serverBaseUrl')) return;
      
      // Check if line has process.env.REACT_APP_ with URL
      if (/process\.env\.REACT_APP_[A-Z_]+.*\|\|.*http/.test(line)) return;
      if (/\$\{process\.env\.REACT_APP_/.test(line)) return;
      
      // Look for hardcoded URLs (NOT using env vars)
      const hardcodedPatterns = [
        /['"`]https?:\/\/localhost:\d+/g,
        /['"`]https?:\/\/127\.0\.0\.1:\d+/g,
        /['"`]https?:\/\/\d+\.\d+\.\d+\.\d+:\d+/g,
      ];
      
      hardcodedPatterns.forEach(pattern => {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            results.push({
              file: filePath.replace(srcDir, 'src'),
              line: index + 1,
              url: match.replace(/['"`]/g, ''),
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
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules' && file !== 'build') {
        walkDir(filePath);
      } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
        checkFile(filePath);
      }
    });
  } catch (err) {}
}

console.log('🔍 Searching for HARDCODED URLs (not using env vars or axios instances)...\n');
walkDir(srcDir);

if (results.length === 0) {
  console.log('✅ No hardcoded URLs found! All URLs use environment variables or axios instances.\n');
} else {
  console.log(`❌ Found ${results.length} hardcoded URL(s) that need fixing:\n`);
  
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.file}:${result.line}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   ${result.context}`);
    console.log('');
  });
  
  console.log('\n💡 These URLs should use:');
  console.log('   - LocalAPI from services/axios.ts for main API calls');
  console.log('   - AIAPI from services/axios.ts for AI microservice calls');
  console.log('   - ExternalAPI from services/axios.ts for external API calls');
  console.log('   - process.env.REACT_APP_API_URL for direct fetch calls');
}
