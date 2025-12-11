const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Prisma Client Generated Code...\n');

// Check if Prisma Client exists
const prismaClientPath = path.join(__dirname, 'node_modules', '@prisma', 'client');
const prismaClientIndexPath = path.join(prismaClientPath, 'index.d.ts');

if (!fs.existsSync(prismaClientPath)) {
  console.log('❌ Prisma Client not found! Run: npx prisma generate');
  process.exit(1);
}

console.log('✅ Prisma Client exists at:', prismaClientPath);

// Read the generated type definitions
if (fs.existsSync(prismaClientIndexPath)) {
  const content = fs.readFileSync(prismaClientIndexPath, 'utf8');
  
  // Search for 'colonne' in the generated types
  const lines = content.split('\n');
  const colonneMatches = [];
  
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes('colonne')) {
      colonneMatches.push({
        line: index + 1,
        content: line.trim()
      });
    }
  });
  
  if (colonneMatches.length > 0) {
    console.log('\n⚠️  Found "colonne" references in generated Prisma Client:');
    console.log('========================================================');
    colonneMatches.forEach(match => {
      console.log(`Line ${match.line}: ${match.content}`);
    });
  } else {
    console.log('\n✅ No "colonne" references found in Prisma Client types');
  }
  
  // Check Bordereau model fields
  console.log('\n📊 Checking Bordereau model in Prisma Client...');
  const bordereauMatch = content.match(/export type Bordereau = \{[\s\S]*?\}/);
  if (bordereauMatch) {
    console.log('Bordereau type definition found:');
    console.log(bordereauMatch[0].substring(0, 500) + '...');
  }
} else {
  console.log('⚠️  Could not find index.d.ts file');
}

// Check package.json for Prisma version
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log('\n📦 Prisma versions:');
  console.log('  @prisma/client:', packageJson.dependencies?.['@prisma/client'] || 'not found');
  console.log('  prisma:', packageJson.devDependencies?.['prisma'] || 'not found');
}

console.log('\n✅ Prisma Client check complete!');
