const fs = require('fs');
const path = require('path');

console.log('🔍 TRACING VIREMENT_EXECUTE STATUS CHANGES...\n');

const srcDir = path.join(__dirname, 'src');
const patterns = [
  /VIREMENT_EXECUTE/gi,
  /statut.*=.*['"]VIREMENT_EXECUTE['"]/gi,
  /status.*=.*['"]VIREMENT_EXECUTE['"]/gi,
  /etatVirement.*=.*['"]VIREMENT_EXECUTE['"]/gi
];

function searchInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const results = [];

    lines.forEach((line, index) => {
      patterns.forEach(pattern => {
        if (pattern.test(line)) {
          results.push({
            line: index + 1,
            content: line.trim(),
            context: lines.slice(Math.max(0, index - 1), Math.min(lines.length, index + 2))
          });
        }
      });
    });

    return results;
  } catch (error) {
    return [];
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', 'build'].includes(file)) {
        walkDir(filePath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const results = searchInFile(filePath);
      
      if (results.length > 0) {
        console.log(`📄 Checking: ${path.relative(__dirname, filePath)}`);
        results.forEach(result => {
          console.log(`🎯 Line ${result.line}: ${result.content}`);
          console.log(`   Context:`);
          result.context.forEach((ctx, i) => {
            const lineNum = result.line - 1 + i;
            const marker = i === 1 ? '>> ' : '   ';
            console.log(`   ${marker}${lineNum}: ${ctx}`);
          });
          console.log('');
        });
      }
    }
  });
}

walkDir(srcDir);

console.log('✅ TRACE COMPLETE\n');
