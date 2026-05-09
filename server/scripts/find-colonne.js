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
          file: filePath,
          line: index + 1,
          content: line.trim()
        });
      }
    });
    
    return matches;
  } catch (err) {
    return [];
  }
}

function searchDirectory(dir, searchTerm, results = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
      searchDirectory(filePath, searchTerm, results);
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      const matches = searchInFile(filePath, searchTerm);
      results.push(...matches);
    }
  });
  
  return results;
}

console.log('Searching for "colonne" in TypeScript/JavaScript files...\n');

const results = searchDirectory('./src', 'colonne');

if (results.length === 0) {
  console.log('No matches found!');
} else {
  console.log(`Found ${results.length} matches:\n`);
  results.forEach(match => {
    console.log(`${match.file}:${match.line}`);
    console.log(`  ${match.content}`);
    console.log('');
  });
}
