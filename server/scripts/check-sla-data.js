const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAndCreateSLAData() {
  try {
    console.log('🔍 Checking bordereau data...');
    
    // Check existing bordereaux
    const existingBordereaux = await prisma.bordereau.findMany({
      where: {
        statut: { in: ['EN_COURS', 'ASSIGNE', 'A_AFFECTER'] }
      },
      include: {
        client: true,
        currentHandler: true
      }
    });
    
    console.log(`Found ${existingBordereaux.length} active bordereaux`);
    
    if (existingBordereaux.length === 0) {
      console.log('📝 Creating sample bordereaux for SLA predictions...');
      
      // Get or create sample client
      let client = await prisma.client.findFirst();
      if (!client) {
        client = await prisma.client.create({
          data: {
            name: 'Sample Client SLA',
            email: 'client@example.com',
            phone: '0123456789'
          }
        });
      }
      
      // Get or create sample user
      let user = await prisma.user.findFirst({
        where: { role: { in: ['GESTIONNAIRE', 'CHEF_EQUIPE'] } }
      });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'gestionnaire@example.com',
            fullName: 'Gestionnaire SLA',
            role: 'GESTIONNAIRE',
            active: true
          }
        });
      }
      
      // Create sample bordereaux with different SLA risks
      const sampleBordereaux = [
        {
          reference: `BS-${Date.now()}-001`,
          clientId: client.id,
          assignedToUserId: user.id,
          statut: 'EN_COURS',
          delaiReglement: 3,
          dateReception: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago - HIGH RISK
          nombreBS: 5
        },
        {
          reference: `BS-${Date.now()}-002`,
          clientId: client.id,
          assignedToUserId: user.id,
          statut: 'ASSIGNE',
          delaiReglement: 5,
          dateReception: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago - MEDIUM RISK
          nombreBS: 3
        },
        {
          reference: `BS-${Date.now()}-003`,
          clientId: client.id,
          assignedToUserId: user.id,
          statut: 'A_AFFECTER',
          delaiReglement: 7,
          dateReception: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago - LOW RISK
          nombreBS: 2
        }
      ];
      
      for (const bordereau of sampleBordereaux) {
        await prisma.bordereau.create({ data: bordereau });
      }
      
      console.log('✅ Created 3 sample bordereaux');
    }
    
    // Test SLA prediction logic
    console.log('🧪 Testing SLA prediction logic...');
    
    const testBordereaux = await prisma.bordereau.findMany({
      where: {
        statut: { in: ['EN_COURS', 'ASSIGNE', 'A_AFFECTER'] }
      },
      include: {
        client: { select: { name: true } },
        currentHandler: { select: { fullName: true } }
      },
      take: 10
    });
    
    const predictions = testBordereaux.map(b => {
      const now = new Date();
      let daysSinceReception = 0;
      
      if (b.dateReception) {
        const receptionDate = new Date(b.dateReception);
        daysSinceReception = Math.floor((now.getTime() - receptionDate.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      const daysLeft = Math.max(-5, (b.delaiReglement || 30) - daysSinceReception);
      const riskScore = daysLeft <= 0 ? 0.9 : daysLeft <= 1 ? 0.7 : daysLeft <= 2 ? 0.4 : 0.1;
      
      return {
        id: b.id,
        reference: b.reference,
        clientName: b.client?.name || 'N/A',
        assignedTo: b.currentHandler?.fullName || 'Non assigné',
        risk: daysLeft <= 0 ? '🔴' : daysLeft <= 1 ? '🟠' : '🟢',
        score: riskScore,
        days_left: daysLeft,
        daysSinceReception,
        delaiReglement: b.delaiReglement
      };
    });
    
    console.log('\n📊 SLA Predictions:');
    predictions.forEach(p => {
      console.log(`${p.risk} ${p.reference} - ${p.clientName} - ${p.assignedTo} - Score: ${(p.score * 100).toFixed(0)}% - Days left: ${p.days_left}`);
    });
    
    console.log(`\n✅ SLA prediction system working with ${predictions.length} predictions`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateSLAData();