const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testReclamationStats() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Get total count
    const total = await prisma.reclamation.count();
    console.log(`📊 Total reclamations: ${total}`);

    // Get count by status
    const byStatus = await prisma.reclamation.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });
    console.log('📈 By Status:', byStatus);

    // Get count by severity
    const bySeverity = await prisma.reclamation.groupBy({
      by: ['severity'],
      _count: {
        id: true
      }
    });
    console.log('⚠️ By Severity:', bySeverity);

    // Get count by type
    const byType = await prisma.reclamation.groupBy({
      by: ['type'],
      _count: {
        id: true
      }
    });
    console.log('📋 By Type:', byType);

    // Get recent reclamations
    const recent = await prisma.reclamation.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        client: {
          select: {
            name: true
          }
        },
        assignedTo: {
          select: {
            fullName: true
          }
        }
      }
    });
    console.log('🕒 Recent reclamations:', recent.map(r => ({
      id: r.id,
      client: r.client?.name,
      type: r.type,
      severity: r.severity,
      status: r.status,
      createdAt: r.createdAt
    })));

    // Calculate stats like the API would
    const resolved = await prisma.reclamation.count({
      where: { status: 'RESOLVED' }
    });
    
    const open = await prisma.reclamation.count({
      where: { status: 'OPEN' }
    });

    const stats = {
      total,
      open,
      resolved,
      byStatus,
      bySeverity,
      byType,
      slaCompliance: total > 0 ? ((resolved / total) * 100).toFixed(1) : '0'
    };

    console.log('\n📊 Complete Stats Object:');
    console.log(JSON.stringify(stats, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testReclamationStats();