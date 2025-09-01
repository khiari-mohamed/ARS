const fs = require('fs');
const path = require('path');

// URL patterns to detect
const urlPatterns = [
  /https?:\/\/[^\s"'`]+/g,
  /localhost:\d+/g,
  /127\.0\.0\.1:\d+/g,
  /\d+\.\d+\.\d+\.\d+:\d+/g
];

// File extensions to check
const extensions = ['.js', '.ts', '.py', '.json', '.env', '.config', '.yml', '.yaml'];

// Directories to exclude
const excludeDirs = ['node_modules', '.git', 'uploads', 'exports', 'generated', 'migrations'];

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
      } else if (extensions.some(ext => item.endsWith(ext))) {
        const fileResults = scanFile(fullPath);
        if (fileResults.length > 0) {
          results.push({ file: fullPath, urls: fileResults });
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dir}:`, error.message);
  }
  
  return results;
}

function scanFile(filePath) {
  const urls = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      urlPatterns.forEach(pattern => {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            // Skip common false positives
            if (!isValidUrl(match)) return;
            
            urls.push({
              line: index + 1,
              url: match,
              context: line.trim()
            });
          });
        }
      });
    });
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
  }
  
  return urls;
}

function isValidUrl(url) {
  // Skip comments and documentation
  if (url.includes('example.com') || url.includes('placeholder')) return false;
  
  // Skip package.json repository URLs
  if (url.includes('github.com') || url.includes('npmjs.org')) return false;
  
  return true;
}

// Main execution
console.log('🔍 Scanning backend for hardcoded URLs...\n');

const backendDirs = ['server', 'ai-microservice'];
let totalUrls = 0;

backendDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  
  if (!fs.existsSync(dirPath)) {
    console.log(`❌ Directory ${dir} not found`);
    return;
  }
  
  console.log(`📁 Scanning ${dir}/`);
  const results = scanDirectory(dirPath);
  
  if (results.length === 0) {
    console.log(`✅ No hardcoded URLs found in ${dir}/\n`);
    return;
  }
  
  results.forEach(result => {
    const relativePath = path.relative(__dirname, result.file);
    console.log(`\n📄 ${relativePath}`);
    
    result.urls.forEach(urlInfo => {
      console.log(`  Line ${urlInfo.line}: ${urlInfo.url}`);
      console.log(`    Context: ${urlInfo.context}`);
      totalUrls++;
    });
  });
  
  console.log('');
});

console.log(`\n📊 Summary: Found ${totalUrls} hardcoded URLs`);

if (totalUrls > 0) {
  console.log('\n💡 Recommendations:');
  console.log('- Move URLs to environment variables (.env files)');
  console.log('- Use configuration files for different environments');
  console.log('- Consider using a config service for dynamic URLs');
}