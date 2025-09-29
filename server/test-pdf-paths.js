const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function testPDFPaths() {
  console.log('🔍 TESTING PDF FILE PATHS');
  console.log('=====================================');
  
  // Get the specific document that's failing
  const document = await prisma.document.findFirst({
    where: { 
      id: { contains: '10a3e99e' }
    },
    include: {
      bordereau: { include: { client: true } },
      assignedTo: true
    }
  });
  
  if (document) {
    console.log('📄 Document found:');
    console.log(`  ID: ${document.id}`);
    console.log(`  Name: ${document.name}`);
    console.log(`  Path in DB: ${document.path}`);
    console.log(`  Client: ${document.bordereau?.client?.name}`);
    
    // Check if file exists at different possible locations
    const possiblePaths = [
      path.join(__dirname, 'uploads', document.path),
      path.join(__dirname, document.path),
      path.join(__dirname, 'uploads', document.path.replace(/^\/+/, '')),
      path.join(__dirname, document.path.replace(/^\/+/, ''))
    ];
    
    console.log('\n🔍 Checking file existence:');
    possiblePaths.forEach((filePath, index) => {
      const exists = fs.existsSync(filePath);
      console.log(`  ${index + 1}. ${filePath} - ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    });
    
    // List actual files in uploads directory
    console.log('\n📁 Files in uploads directory:');
    const uploadsDir = path.join(__dirname, 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      files.forEach(file => {
        if (file.endsWith('.pdf')) {
          console.log(`  ✅ ${file}`);
        }
      });
    }
  } else {
    console.log('❌ Document not found');
  }
  
  await prisma.$disconnect();
}

testPDFPaths();