const fs = require('fs');
const path = require('path');

// Patterns to detect hardcoded URLs
const URL_PATTERNS = [
  /http:\/\/localhost:\d+/g,
  /https:\/\/localhost:\d+/g,
  /http:\/\/127\.0\.0\.1:\d+/g,
  /https:\/\/127\.0\.0\.1:\d+/g,
  /'http:\/\/[^']+'/g,
  /"http:\/\/[^"]+"/g,
  /'https:\/\/[^']+'/g,
  /"https:\/\/[^"]+"/g
];

// Files to exclude from scanning
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /build/,
  /dist/,
  /coverage/,
  /\.log$/,
  /\.lock$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /check-hardcoded-urls\.js$/
];

// File extensions to scan
const SCAN_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json'];

function shouldExcludeFile(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

function shouldScanFile(filePath) {
  const ext = path.extname(filePath);
  return SCAN_EXTENSIONS.includes(ext);
}

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    URL_PATTERNS.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        // Skip if it's already using environment variable
        const lineStart = content.lastIndexOf('\n', match.index) + 1;
        const lineEnd = content.indexOf('\n', match.index);
        const line = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);
        
        // Skip if line contains any environment variable usage
        if (line.includes('process.env.REACT_APP_API_URL') || 
            line.includes('process.env.REACT_APP_AI_MICROSERVICE_URL') ||
            line.includes('process.env.REACT_APP_EXTERNAL_API_URL')) {
          continue;
        }
        
        // Skip SVG namespace URLs
        if (match[0].includes('www.w3.org')) {
          continue;
        }
        
        // Skip example/placeholder URLs
        if (match[0].includes('example.com') || match[0].includes('api.example.com')) {
          continue;
        }
        
        // Skip if it's in a comment or placeholder
        if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.includes('placeholder=')) {
          continue;
        }
        
        const lineNumber = content.substring(0, match.index).split('\n').length;
        issues.push({
          url: match[0],
          line: lineNumber,
          content: line.trim()
        });
      }
    });
    
    return issues;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return [];
  }
}

function scanDirectory(dirPath) {
  const results = [];
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      
      if (shouldExcludeFile(fullPath)) {
        continue;
      }
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        results.push(...scanDirectory(fullPath));
      } else if (stat.isFile() && shouldScanFile(fullPath)) {
        const issues = scanFile(fullPath);
        if (issues.length > 0) {
          results.push({
            file: fullPath,
            issues: issues
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error.message);
  }
  
  return results;
}

function main() {
  console.log('🔍 Scanning for hardcoded URLs in frontend...\n');
  
  const srcPath = path.join(__dirname, 'src');
  const results = scanDirectory(srcPath);
  
  if (results.length === 0) {
    console.log('✅ No hardcoded URLs found! All URLs are using environment variables.');
    return;
  }
  
  console.log(`❌ Found ${results.length} files with hardcoded URLs:\n`);
  
  let totalIssues = 0;
  
  results.forEach(result => {
    console.log(`📄 ${result.file.replace(__dirname, '.')}`);
    result.issues.forEach(issue => {
      console.log(`   Line ${issue.line}: ${issue.url}`);
      console.log(`   Context: ${issue.content}`);
      console.log('');
      totalIssues++;
    });
    console.log('');
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files with issues: ${results.length}`);
  console.log(`   Total hardcoded URLs: ${totalIssues}`);
  console.log(`\n💡 Fix by replacing with:`);
  console.log(`   \`\${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/endpoint\``);
  
  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = { scanDirectory, scanFile };