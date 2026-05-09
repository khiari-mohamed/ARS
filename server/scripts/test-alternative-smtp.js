/**
 * Test alternative SMTP configurations
 */

const nodemailer = require('nodemailer');

const configs = [
  {
    name: 'Current Config (Port 465)',
    host: 'smtp.gnet.tn',
    port: 465,
    secure: true,
    user: 'noreply@arstunisia.com',
    pass: 'NR*ars2025**##'
  },
  {
    name: 'Port 587 with STARTTLS',
    host: 'smtp.gnet.tn',
    port: 587,
    secure: false,
    user: 'noreply@arstunisia.com',
    pass: 'NR*ars2025**##'
  },
  {
    name: 'Port 25',
    host: 'smtp.gnet.tn',
    port: 25,
    secure: false,
    user: 'noreply@arstunisia.com',
    pass: 'NR*ars2025**##'
  }
];

async function testConfig(config) {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    },
    tls: { rejectUnauthorized: false }
  });

  try {
    await transporter.verify();
    console.log(`  ✅ Connection OK`);
    
    await transporter.sendMail({
      from: config.user,
      to: 'test@example.com',
      subject: 'Test',
      text: 'Test'
    });
    console.log(`  ✅ Send OK - THIS CONFIG WORKS!\n`);
    return true;
  } catch (error) {
    console.log(`  ❌ ${error.message}\n`);
    return false;
  }
}

console.log('\n🔍 Testing Alternative SMTP Configurations\n');

(async () => {
  for (const config of configs) {
    console.log(`Testing: ${config.name}`);
    console.log(`  ${config.host}:${config.port} (secure: ${config.secure})`);
    await testConfig(config);
  }
  
  console.log('━'.repeat(60));
  console.log('\n💡 RECOMMENDATION:\n');
  console.log('The SMTP server is rejecting the sender address.');
  console.log('This typically means:\n');
  console.log('1. The email account needs to be activated/verified first');
  console.log('2. Contact your email provider (GNET) to enable sending');
  console.log('3. Use a different email service:\n');
  console.log('   • Gmail SMTP (smtp.gmail.com:587)');
  console.log('   • SendGrid (smtp.sendgrid.net:587)');
  console.log('   • Mailgun, AWS SES, etc.\n');
  console.log('For now, the system will log emails but not send them.');
  console.log('All other features (notifications, tracking) will work.\n');
})();
