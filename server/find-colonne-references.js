const fs = require('fs');
const path = require('path');

function searchInFile(filePath, searchTerm) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const matches = [];
    
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(searchTerm.toLowerCase())) {
        matches.push({
          line: index + 1,
          content: line.trim()
        });
      }
    });
    
    return matches;
  } catch (error) {
    return [];
  }
}

function searchInDirectory(dir, searchTerm, extensions = ['.ts', '.js']) {
  const results = [];
  
  function walkDir(currentDir) {
    try {
      const files = fs.readdirSync(currentDir);
      
      files.forEach(file => {
        const filePath = path.join(currentDir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          walkDir(filePath);
        } else if (stat.isFile() && extensions.some(ext => file.endsWith(ext))) {
          const matches = searchInFile(filePath, searchTerm);
          if (matches.length > 0) {
            results.push({
              file: filePath,
              matches: matches
            });
          }
        }
      });
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  walkDir(dir);
  return results;
}

console.log('🔍 Searching for "colonne" references in code...\n');

const srcDir = path.join(__dirname, 'src');
const results = searchInDirectory(srcDir, 'colonne');

if (results.length === 0) {
  console.log('❌ No "colonne" references found in src/ directory');
  
  // Also search in scripts
  console.log('\n🔍 Searching in scripts directory...');
  const scriptsDir = path.join(__dirname, 'scripts');
  const scriptResults = searchInDirectory(scriptsDir, 'colonne');
  
  if (scriptResults.length === 0) {
    console.log('❌ No "colonne" references found in scripts/ directory');
  } else {
    scriptResults.forEach(result => {
      console.log(`\n📁 ${result.file}:`);
      result.matches.forEach(match => {
        console.log(`   Line ${match.line}: ${match.content}`);
      });
    });
  }
} else {
  results.forEach(result => {
    console.log(`\n📁 ${result.file}:`);
    result.matches.forEach(match => {
      console.log(`   Line ${match.line}: ${match.content}`);
    });
  });
}

console.log('\n💡 Tip: The error might be in a Prisma query where "colonne" is used as a field name.');
console.log('   Look for queries like: prisma.bordereau.findMany({ select: { colonne: true } })');