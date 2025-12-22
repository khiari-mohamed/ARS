import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDocumentVsBordereau() {
  console.log('🔍 Checking Documents vs Bordereaux...\n');
  
  try {
    // Count bordereaux
    const totalBordereaux = await prisma.bordereau.count();
    console.log(`📋 Total Bordereaux: ${totalBordereaux}`);
    
    // Count documents (BS inside bordereaux)
    const bordereaux = await prisma.bordereau.findMany({
      select: {
        id: true,
        reference: true,
        nombreBS: true,
        type: true,
        statut: true
      }
    });
    
    let totalDocuments = 0;
    const byType: any = {};
    const byStatus: any = {};
    
    for (const b of bordereaux) {
      const docCount = b.nombreBS || 1; // Each bordereau has at least 1 document
      totalDocuments += docCount;
      
      // Count by type
      byType[b.type] = (byType[b.type] || 0) + docCount;
      
      // Count by status
      byStatus[b.statut] = (byStatus[b.statut] || 0) + docCount;
    }
    
    console.log(`\n📄 Total Documents (BS): ${totalDocuments}`);
    console.log(`\n📊 Documents by Type:`);
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    
    console.log(`\n📈 Documents by Status:`);
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    
    // Check if nombreBS field exists and has data
    const withNombreBS = bordereaux.filter(b => b.nombreBS && b.nombreBS > 0);
    console.log(`\n✅ Bordereaux with nombreBS: ${withNombreBS.length}/${totalBordereaux}`);
    
    if (withNombreBS.length > 0) {
      console.log(`\n📋 Sample bordereaux with nombreBS:`);
      withNombreBS.slice(0, 5).forEach(b => {
        console.log(`   ${b.reference}: ${b.nombreBS} BS`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocumentVsBordereau();
