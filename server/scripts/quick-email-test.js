/**
 * Quick SMTP Test - Tests email credentials directly
 * Run this BEFORE starting the full test suite
 */

const nodemailer = require('nodemailer');

console.log('\n📧 Quick SMTP Connection Test\n');
console.log('Testing credentials:');
console.log('  Host: smtp.gnet.tn');
console.log('  Port: 465');
console.log('  User: noreply@arstunisia.com');
console.log('  Pass: NR*ars2025**##\n');

const transporter = nodemailer.createTransport({
  host: 'smtp.gnet.tn',
  port: 465,
  secure: true,
  auth: {
    user: 'noreply@arstunisia.com',
    pass: 'NR*ars2025**##'
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
  tls: {
    rejectUnauthorized: false
  }
});

console.log('⏳ Testing SMTP connection...\n');

transporter.verify()
  .then(() => {
    console.log('✅ SUCCESS! SMTP connection verified');
    console.log('✅ Credentials are correct');
    console.log('✅ Server is reachable\n');
    
    console.log('📤 Sending test email...\n');
    
    return transporter.sendMail({
      from: 'noreply@arstunisia.com', // Must match SMTP username
      to: 'admin@ars.tn', // Change this to your email
      subject: 'Test Email - ARS System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🎉 Email Test Successful!</h2>
          <p>This is a test email from the ARS notification system.</p>
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Test Details:</strong></p>
            <ul>
              <li>SMTP Server: smtp.gnet.tn</li>
              <li>Port: 465 (SSL)</li>
              <li>From: noreply@arstunisia.com</li>
              <li>Timestamp: ${new Date().toLocaleString('fr-FR')}</li>
            </ul>
          </div>
          <p>If you received this email, your SMTP configuration is working correctly! ✅</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">
            ARS Tunisia - Automated Email System
          </p>
        </div>
      `,
      text: 'Test email from ARS system. If you received this, SMTP is working!'
    });
  })
  .then((info) => {
    console.log('✅ TEST EMAIL SENT SUCCESSFULLY!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('\n📬 Check your inbox at: admin@ars.tn');
    console.log('   (Also check spam folder)\n');
    console.log('🎉 All tests passed! You can now run the full test suite.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ SMTP TEST FAILED!\n');
    console.error('Error:', error.message);
    console.error('\nPossible issues:');
    console.error('  1. Wrong credentials (username/password)');
    console.error('  2. SMTP server not reachable (firewall/network)');
    console.error('  3. Port 465 blocked');
    console.error('  4. SSL/TLS certificate issues\n');
    console.error('Full error:', error);
    process.exit(1);
  });
