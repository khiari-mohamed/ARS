const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testTrendData() {
  try {
    console.log('🔍 Testing Trend Data Generation...');
    
    // Get all reclamations with their creation dates
    const reclamations = await prisma.reclamation.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`📊 Total reclamations: ${reclamations.length}`);
    
    if (reclamations.length === 0) {
      console.log('❌ No reclamations found');
      return;
    }
    
    // Group by date (YYYY-MM-DD)
    const dateMap = new Map();
    
    reclamations.forEach(r => {
      const dateKey = r.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
    });
    
    // Convert to array and sort
    const result = Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    console.log('📈 Trend Data:');
    result.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.date}: ${item.count} réclamations`);
    });
    
    console.log(`✅ Generated ${result.length} data points`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testTrendData();