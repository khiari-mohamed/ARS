const fs = require('fs');

// Read schema file
const schemaContent = fs.readFileSync('d:\\ARS\\server\\prisma\\schema.prisma', 'utf8');

// Extract model names
const modelMatches = schemaContent.match(/^model\s+(\w+)\s*{/gm);
const models = modelMatches ? modelMatches.map(match => match.replace(/^model\s+(\w+)\s*{/, '$1')) : [];

console.log('📊 Schema Analysis:');
console.log('==================');
console.log(`Total models in schema: ${models.length}`);
console.log('\nModels found:');
models.forEach((model, index) => {
  console.log(`${index + 1}. ${model}`);
});

// Convert to lowercase for comparison with database
const dbTableNames = models.map(model => {
  // Convert PascalCase to camelCase for Prisma client
  return model.charAt(0).toLowerCase() + model.slice(1);
});

console.log('\n📋 Database table names (for verification):');
dbTableNames.forEach((table, index) => {
  console.log(`${index + 1}. ${table}`);
});

console.log(`\n🎯 Expected database tables: ${dbTableNames.length}`);