const fs = require('fs');
const path = require('path');

// URL patterns to detect
const urlPatterns = [
  /https?:\/\/[^\s"'`]+/g,
  /localhost:\d+/g,
  /127\.0\.0\.1:\d+/g,
  /\d+\.\d+\.\d+\.\d+:\d+/g
];

// Directories to exclude
const excludeDirs = ['node_modules', '.git', 'dist', 'uploads', 'exports', 'generated', 'migrations', 'build'];

// Files to exclude
const excludeFiles = ['package-lock.json', '.min.js', '.min.css'];

function shouldProcessFile(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath);
  
  if (excludeDirs.some(exclude => filePath.includes(exclude))) return false;
  if (excludeFiles.some(exclude => fileName.includes(exclude))) return false;
  
  return ['.js', '.ts', '.tsx', '.jsx', '.py', '.env', '.json', '.config'].includes(ext);
}

function isValidUrl(url, context) {
  // Skip common false positives
  if (url.includes('example.com') || url.includes('placeholder')) return false;
  if (url.includes('github.com') || url.includes('npmjs.org')) return false;
  if (url.includes('opencollective.com') || url.includes('patreon.com')) return false;
  if (url.includes('microsoft.com') || url.includes('graph.microsoft.com')) return false;
  if (url.includes('json.schemastore.org')) return false;
  if (context.includes('// TODO') || context.includes('// Example')) return false;
  
  return true;
}

function analyzeUrl(url, context, filePath) {
  const analysis = {
    url,
    status: 'HARDCODED',
    issue: 'Hardcoded URL found',
    recommendation: 'Move to environment variable'
  };
  
  // Check if it's properly configured with env var + fallback
  if (context.includes('process.env.') && context.includes('||')) {
    analysis.status = 'CONFIGURED';
    analysis.issue = 'Properly configured with env var + fallback';
    analysis.recommendation = 'Good - no changes needed';
  }
  // Check if it's in .env file (which is correct)
  else if (filePath.includes('.env')) {
    analysis.status = 'ENV_FILE';
    analysis.issue = 'URL in environment file';
    analysis.recommendation = 'Good - configuration value';
  }
  // Check if it's using only env var (missing fallback)
  else if (context.includes('process.env.') && !context.includes('||')) {
    analysis.status = 'NO_FALLBACK';
    analysis.issue = 'Using env var but missing fallback';
    analysis.recommendation = 'Add fallback: process.env.VAR || "fallback"';
  }
  
  return analysis;
}

function scanFile(filePath) {
  const results = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      urlPatterns.forEach(pattern => {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            if (!isValidUrl(match, line)) return;
            
            const analysis = analyzeUrl(match, line, filePath);
            results.push({
              line: index + 1,
              context: line.trim(),
              ...analysis
            });
          });
        }
      });
    });
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
  }
  
  return results;
}

function scanDirectory(dir, basePath = '') {
  const results = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!excludeDirs.includes(item)) {
          results.push(...scanDirectory(fullPath, basePath));
        }
      } else if (shouldProcessFile(fullPath)) {
        const fileResults = scanFile(fullPath);
        if (fileResults.length > 0) {
          results.push({
            file: path.relative(basePath || __dirname, fullPath),
            urls: fileResults
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dir}:`, error.message);
  }
  
  return results;
}

function generateReport(results, section) {
  const stats = {
    configured: 0,
    hardcoded: 0,
    envFile: 0,
    noFallback: 0,
    total: 0
  };
  
  console.log(`\n📁 ${section.toUpperCase()}`);
  console.log('='.repeat(50));
  
  if (results.length === 0) {
    console.log('✅ No URLs found or all URLs properly configured');
    return stats;
  }
  
  results.forEach(({ file, urls }) => {
    console.log(`\n📄 ${file}`);
    
    urls.forEach(({ line, url, status, issue, recommendation, context }) => {
      stats.total++;
      
      let icon = '❌';
      if (status === 'CONFIGURED') { icon = '✅'; stats.configured++; }
      else if (status === 'ENV_FILE') { icon = '📝'; stats.envFile++; }
      else if (status === 'NO_FALLBACK') { icon = '⚠️'; stats.noFallback++; }
      else { stats.hardcoded++; }
      
      console.log(`  ${icon} Line ${line}: ${url}`);
      console.log(`     Status: ${issue}`);
      console.log(`     Action: ${recommendation}`);
      console.log(`     Context: ${context.substring(0, 80)}...`);
    });
  });
  
  return stats;
}

// Main execution
console.log('🔍 FINAL URL AUDIT - Frontend & Backend');
console.log('📋 Checking for proper environment variable configuration');
console.log('=' .repeat(60));

const sections = [
  { name: 'Frontend', path: 'frontend/src' },
  { name: 'Backend Server', path: 'server/src' },
  { name: 'AI Microservice', path: 'ai-microservice' },
  { name: 'Environment Files', path: '.' }
];

let totalStats = {
  configured: 0,
  hardcoded: 0,
  envFile: 0,
  noFallback: 0,
  total: 0
};

sections.forEach(({ name, path: sectionPath }) => {
  const fullPath = path.join(__dirname, sectionPath);
  
  if (fs.existsSync(fullPath)) {
    let results;
    if (name === 'Environment Files') {
      // Special handling for env files
      results = ['.env', 'server/.env', 'ai-microservice/.env', 'frontend/.env']
        .filter(envPath => fs.existsSync(path.join(__dirname, envPath)))
        .map(envPath => {
          const fileResults = scanFile(path.join(__dirname, envPath));
          return fileResults.length > 0 ? { file: envPath, urls: fileResults } : null;
        })
        .filter(Boolean);
    } else {
      results = scanDirectory(fullPath);
    }
    
    const stats = generateReport(results, name);
    
    // Add to total stats
    Object.keys(totalStats).forEach(key => {
      totalStats[key] += stats[key];
    });
  } else {
    console.log(`\n📁 ${name.toUpperCase()}`);
    console.log('⚠️  Directory not found');
  }
});

// Final summary
console.log('\n' + '='.repeat(60));
console.log('📊 FINAL SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Properly Configured: ${totalStats.configured}`);
console.log(`📝 Environment Files: ${totalStats.envFile}`);
console.log(`⚠️  Missing Fallbacks: ${totalStats.noFallback}`);
console.log(`❌ Hardcoded URLs: ${totalStats.hardcoded}`);
console.log(`📈 Total URLs Found: ${totalStats.total}`);

console.log('\n💡 Status:');
if (totalStats.hardcoded === 0 && totalStats.noFallback === 0) {
  console.log('🎉 EXCELLENT! All URLs are properly configured');
} else if (totalStats.hardcoded > 0) {
  console.log('⚠️  NEEDS ATTENTION: Found hardcoded URLs that need environment variables');
} else if (totalStats.noFallback > 0) {
  console.log('⚠️  MINOR ISSUES: Some environment variables missing fallbacks');
}

console.log('\n🔧 Legend:');
console.log('✅ Configured: Uses process.env.VAR || "fallback"');
console.log('📝 Env File: URL in .env file (correct)');
console.log('⚠️  No Fallback: Uses env var but missing fallback');
console.log('❌ Hardcoded: Direct URL without environment variable');