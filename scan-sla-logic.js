const fs = require('fs');
const path = require('path');

const SLA_PATTERNS = [
  /slaStatus\s*=/,
  /percentageElapsed/,
  /hoursRemaining/,
  /daysElapsed/,
  /dureeTraitement/,
  /delaiReglement/,
  /SLA_BREACH/,
  /AT_RISK/,
  /OVERDUE/,
  /ON_TIME/,
  /getSLAColor/,
  /getSLAStatus/,
  /sla.*status/i,
  /calculate.*sla/i,
  /sla.*compliance/i
];

const results = [];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      SLA_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          results.push({
            file: filePath.replace(/\\/g, '/'),
            line: index + 1,
            code: line.trim(),
            pattern: pattern.toString()
          });
        }
      });
    });
  } catch (err) {
    // Skip files that can't be read
  }
}

function scanDirectory(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist') && !file.includes('build')) {
        scanDirectory(filePath, extensions);
      }
    } else if (extensions.some(ext => file.endsWith(ext))) {
      scanFile(filePath);
    }
  });
}

console.log('🔍 Scanning codebase for SLA calculations...\n');

scanDirectory('D:\\ARS\\server\\src');
scanDirectory('D:\\ARS\\frontend\\src');

// Group by file
const grouped = results.reduce((acc, item) => {
  if (!acc[item.file]) acc[item.file] = [];
  acc[item.file].push(item);
  return acc;
}, {});

console.log('📊 SCAN RESULTS:\n');
console.log(`Total files with SLA logic: ${Object.keys(grouped).length}`);
console.log(`Total SLA-related lines: ${results.length}\n`);

Object.entries(grouped).forEach(([file, items]) => {
  console.log(`\n📄 ${file}`);
  console.log(`   Found ${items.length} SLA-related lines:`);
  items.forEach(item => {
    console.log(`   Line ${item.line}: ${item.code.substring(0, 80)}${item.code.length > 80 ? '...' : ''}`);
  });
});

// Save to file
fs.writeFileSync('D:\\ARS\\sla-scan-results.json', JSON.stringify(grouped, null, 2));
console.log('\n✅ Results saved to sla-scan-results.json');

// Analyze and categorize files
console.log('\n' + '='.repeat(80));
console.log('📊 SLA LOGIC ANALYSIS - UNIFIED vs NEEDS FIXING');
console.log('='.repeat(80));

const unifiedLogic = [
  'percentageElapsed',
  'dureeTraitement > delai',
  'dureeTraitement > (delai * 0.8)',
  'percentageElapsed > 100',
  'percentageElapsed > 80'
];

const oldLogic = [
  'hoursRemaining',
  'daysRemaining <= 3',
  'daysSinceReception > slaThreshold',
  'remaining < 0',
  'remaining <= 3'
];

const alreadyFixed = [];
const needsFix = [];

for (const [file, matches] of Object.entries(grouped)) {
  const content = matches.map(m => m.code).join(' ');
  const hasUnified = unifiedLogic.some(pattern => content.includes(pattern));
  const hasOld = oldLogic.some(pattern => content.includes(pattern));
  
  if (hasUnified && !hasOld) {
    alreadyFixed.push(file);
  } else if (hasOld) {
    needsFix.push(file);
  }
}

console.log('\n✅ ALREADY FIXED (' + alreadyFixed.length + ' files):');
console.log('─'.repeat(80));
alreadyFixed.forEach(f => console.log('  ✓', f.replace(/^.*[\\\/]/, '')));

console.log('\n❌ NEEDS FIXING (' + needsFix.length + ' files):');
console.log('─'.repeat(80));
needsFix.forEach(f => console.log('  ✗', f.replace(/^.*[\\\/]/, '')));

console.log('\n' + '='.repeat(80));
console.log('📈 SUMMARY:');
console.log('  Total files scanned: ' + Object.keys(grouped).length);
console.log('  ✅ Already unified: ' + alreadyFixed.length);
console.log('  ❌ Needs fixing: ' + needsFix.length);
console.log('  ⚪ Other/Display only: ' + (Object.keys(grouped).length - alreadyFixed.length - needsFix.length));
console.log('='.repeat(80));
