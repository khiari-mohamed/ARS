const fs = require('fs');
const path = require('path');

function searchPrismaQueries(dir) {
  const results = [];
  
  function walkDir(currentDir) {
    try {
      const files = fs.readdirSync(currentDir);
      
      files.forEach(file => {
        const filePath = path.join(currentDir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          walkDir(filePath);
        } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.js'))) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            
            lines.forEach((line, index) => {
              // Look for Prisma queries that might reference 'colonne'
              if (line.includes('prisma.') && line.includes('findMany') && line.includes('colonne')) {
                results.push({
                  file: filePath,
                  line: index + 1,
                  content: line.trim()
                });
              }
              // Also look for select/include with colonne
              if ((line.includes('select:') || line.includes('include:')) && line.includes('colonne')) {
                results.push({
                  file: filePath,
                  line: index + 1,
                  content: line.trim()
                });
              }
              // Look for orderBy with colonne
              if (line.includes('orderBy:') && line.includes('colonne')) {
                results.push({
                  file: filePath,
                  line: index + 1,
                  content: line.trim()
                });
              }
            });
          } catch (error) {
            // Skip files we can't read
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

console.log('🔍 Searching for Prisma queries with "colonne"...\n');

const srcDir = path.join(__dirname, 'src');
const results = searchPrismaQueries(srcDir);

if (results.length === 0) {
  console.log('❌ No Prisma queries with "colonne" found');
  console.log('\n🔍 Let me search for any database field references...');
  
  // Search for any reference to colonne in database context
  function searchDbReferences(dir) {
    const dbResults = [];
    
    function walkDir(currentDir) {
      try {
        const files = fs.readdirSync(currentDir);
        
        files.forEach(file => {
          const filePath = path.join(currentDir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            walkDir(filePath);
          } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.js'))) {
            try {
              const content = fs.readFileSync(filePath, 'utf8');
              
              // Look for any database-related colonne usage
              if (content.includes('colonne') && (content.includes('prisma') || content.includes('findMany') || content.includes('select'))) {
                const lines = content.split('\n');
                lines.forEach((line, index) => {
                  if (line.includes('colonne')) {
                    dbResults.push({
                      file: filePath,
                      line: index + 1,
                      content: line.trim()
                    });
                  }
                });
              }
            } catch (error) {
              // Skip files we can't read
            }
          }
        });
      } catch (error) {
        // Skip directories we can't read
      }
    }
    
    walkDir(dir);
    return dbResults;
  }
  
  const dbResults = searchDbReferences(srcDir);
  
  if (dbResults.length > 0) {
    console.log('📋 Found database-related "colonne" references:');
    dbResults.forEach(result => {
      console.log(`\n📁 ${result.file}:${result.line}`);
      console.log(`   ${result.content}`);
    });
  } else {
    console.log('❌ No database-related "colonne" references found');
    console.log('\n💡 The error might be in a different location or generated dynamically.');
    console.log('   Check the AutomaticWorkflowService mentioned in the error logs.');
  }
  
} else {
  console.log('📋 Found Prisma queries with "colonne":');
  results.forEach(result => {
    console.log(`\n📁 ${result.file}:${result.line}`);
    console.log(`   ${result.content}`);
  });
}