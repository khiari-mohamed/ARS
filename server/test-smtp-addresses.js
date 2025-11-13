/**
 * Test different sender addresses to find which one works
 */

const nodemailer = require('nodemailer');

const testAddresses = [
  'noreply@arstunisia.com',
  'admin@arstunisia.com',
  'contact@arstunisia.com',
  'info@arstunisia.com',
  'no-reply@arstunisia.com',
  // The SMTP username itself might be the only allowed sender
  'noreply@arstunisia.com' // Same as username
];

async function testAddress(fromAddress) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gnet.tn',
    port: 465,
    secure: true,
    auth: {
      user: 'noreply@arstunisia.com',
      pass: 'NR*ars2025**##'
    },
    tls: { rejectUnauthorized: false }
  });

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: 'test@example.com',
      subject: 'Test',
      text: 'Test'
    });
    return { address: fromAddress, success: true };
  } catch (error) {
    return { address: fromAddress, success: false, error: error.message };
  }
}

console.log('\n🔍 Testing which sender addresses are allowed...\n');
console.log('SMTP Server: smtp.gnet.tn');
console.log('SMTP User: noreply@arstunisia.com\n');

(async () => {
  console.log('Testing addresses:');
  for (const addr of testAddresses) {
    process.stdout.write(`  ${addr} ... `);
    const result = await testAddress(addr);
    if (result.success) {
      console.log('✅ WORKS!');
    } else {
      console.log('❌ Failed');
    }
  }
  
  console.log('\n💡 SOLUTION:');
  console.log('The SMTP server only allows sending from the authenticated email address.');
  console.log('You need to either:');
  console.log('  1. Use the SMTP username as the sender: noreply@arstunisia.com');
  console.log('  2. Contact your email provider to authorize additional sender addresses');
  console.log('  3. Use a different SMTP service (Gmail, SendGrid, etc.)\n');
})();
