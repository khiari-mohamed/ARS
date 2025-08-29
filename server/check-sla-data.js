const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSLAData() {
  try {
    console.log('🔍 Checking SLA Breaches Data...\n');

    // Check all courriers
    const allCourriers = await prisma.courrier.findMany({
      include: {
        uploader: { select: { fullName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📧 ALL COURRIERS (${allCourriers.length} total):`);
    allCourriers.forEach((c, i) => {
      console.log(`  ${i + 1}. ID: ${c.id.substring(0, 8)}...`);
      console.log(`     Subject: ${c.subject}`);
      console.log(`     Status: ${c.status}`);
      console.log(`     Sent At: ${c.sentAt || 'Not sent'}`);
      console.log(`     Created: ${c.createdAt}`);
      console.log('');
    });

    // Check SENT courriers
    const sentCourriers = await prisma.courrier.findMany({
      where: { status: 'SENT' },
      include: {
        uploader: { select: { fullName: true, email: true } }
      }
    });

    console.log(`📤 SENT COURRIERS (${sentCourriers.length} total):`);
    sentCourriers.forEach((c, i) => {
      const daysSinceSent = c.sentAt ? Math.floor((Date.now() - new Date(c.sentAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      console.log(`  ${i + 1}. ${c.subject} - ${daysSinceSent} days ago`);
    });

    // Check PENDING_RESPONSE courriers
    const pendingCourriers = await prisma.courrier.findMany({
      where: { status: 'PENDING_RESPONSE' },
      include: {
        uploader: { select: { fullName: true, email: true } }
      }
    });

    console.log(`⏳ PENDING_RESPONSE COURRIERS (${pendingCourriers.length} total):`);
    pendingCourriers.forEach((c, i) => {
      const daysSinceSent = c.sentAt ? Math.floor((Date.now() - new Date(c.sentAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      console.log(`  ${i + 1}. ${c.subject} - ${daysSinceSent} days ago`);
    });

    // Check SLA breaches (>5 days)
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    console.log(`📅 Checking for courriers sent before: ${fiveDaysAgo.toISOString()}`);

    const slaBreaches = await prisma.courrier.findMany({
      where: {
        status: { in: ['SENT', 'PENDING_RESPONSE'] },
        sentAt: { lte: fiveDaysAgo }
      },
      include: {
        uploader: { select: { fullName: true, email: true } },
        bordereau: { 
          include: { 
            client: { select: { name: true } } 
          } 
        }
      },
      orderBy: { sentAt: 'asc' }
    });

    console.log(`🚨 SLA BREACHES (${slaBreaches.length} total):`);
    if (slaBreaches.length > 0) {
      slaBreaches.forEach((c, i) => {
        const daysOverdue = Math.floor((Date.now() - new Date(c.sentAt || new Date()).getTime()) / (1000 * 60 * 60 * 24));
        console.log(`  ${i + 1}. ${c.subject}`);
        console.log(`     Days overdue: ${daysOverdue}`);
        console.log(`     Status: ${c.status}`);
        console.log(`     Sent: ${c.sentAt}`);
        console.log('');
      });
    } else {
      console.log('  ✅ No SLA breaches found');
    }

  } catch (error) {
    console.error('❌ Error checking SLA data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSLAData();