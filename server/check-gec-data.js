const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkGECData() {
  try {
    console.log('🔍 Checking GEC Module Database Data...\n');

    // Check Courriers
    const courriers = await prisma.courrier.findMany({
      include: {
        uploader: { select: { email: true, fullName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📧 COURRIERS (${courriers.length} total):`);
    if (courriers.length > 0) {
      courriers.forEach((c, i) => {
        console.log(`  ${i + 1}. ID: ${c.id}`);
        console.log(`     Subject: ${c.subject}`);
        console.log(`     Type: ${c.type}`);
        console.log(`     Status: ${c.status}`);
        console.log(`     Created: ${c.createdAt}`);
        console.log(`     Uploader: ${c.uploader?.email || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('  ❌ No courriers found\n');
    }

    // Check Users
    const users = await prisma.user.findMany({
      select: { id: true, email: true, fullName: true, role: true }
    });

    console.log(`👥 USERS (${users.length} total):`);
    users.forEach((u, i) => {
      console.log(`  ${i + 1}. ID: ${u.id}`);
      console.log(`     Email: ${u.email}`);
      console.log(`     Name: ${u.fullName}`);
      console.log(`     Role: ${u.role}`);
      console.log('');
    });

    // Check GEC Templates
    const templates = await prisma.gecTemplate.findMany({
      include: { createdBy: { select: { email: true } } }
    });

    console.log(`📝 GEC TEMPLATES (${templates.length} total):`);
    if (templates.length > 0) {
      templates.forEach((t, i) => {
        console.log(`  ${i + 1}. ID: ${t.id}`);
        console.log(`     Name: ${t.name}`);
        console.log(`     Type: ${t.type}`);
        console.log(`     Active: ${t.isActive}`);
        console.log(`     Usage: ${t.usageCount}`);
        console.log('');
      });
    } else {
      console.log('  ❌ No GEC templates found\n');
    }

    // Analytics Summary
    const statusCounts = await prisma.courrier.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    const typeCounts = await prisma.courrier.groupBy({
      by: ['type'],
      _count: { id: true }
    });

    console.log('📊 ANALYTICS SUMMARY:');
    console.log('  Status Distribution:');
    statusCounts.forEach(s => {
      console.log(`    ${s.status}: ${s._count.id}`);
    });

    console.log('  Type Distribution:');
    typeCounts.forEach(t => {
      console.log(`    ${t.type}: ${t._count.id}`);
    });

  } catch (error) {
    console.error('❌ Error checking GEC data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGECData();