const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test data
const testUser = {
  id: 'test-user-id',
  role: 'SUPER_ADMIN',
  email: 'test@arstunisia.com'
};

const testCourrier = {
  subject: 'Test Courrier - Module GEC',
  body: 'Ceci est un test du module GEC avec le nouveau système d\'email.',
  type: 'REGLEMENT',
  templateUsed: 'template-test',
  bordereauId: null
};

const testTemplate = {
  name: 'Template Test GEC',
  subject: 'Test - {{clientName}}',
  body: 'Bonjour {{clientName}}, ceci est un test du template GEC. Date: {{date}}',
  variables: ['clientName', 'date']
};

async function testGECModule() {
  console.log('🧪 Testing GEC Module Functionality...\n');

  try {
    // Test 1: Create Template
    console.log('1️⃣ Testing Template Creation...');
    const templateResponse = await axios.post(`${BASE_URL}/courriers/templates`, testTemplate);
    console.log('✅ Template created:', templateResponse.data.id);
    const templateId = templateResponse.data.id;

    // Test 2: List Templates
    console.log('\n2️⃣ Testing Template Listing...');
    const templatesResponse = await axios.get(`${BASE_URL}/courriers/templates`);
    console.log('✅ Templates found:', templatesResponse.data.length);

    // Test 3: Create Courrier
    console.log('\n3️⃣ Testing Courrier Creation...');
    const courrierData = { ...testCourrier, templateUsed: templateId };
    const courrierResponse = await axios.post(`${BASE_URL}/courriers`, courrierData);
    console.log('✅ Courrier created:', courrierResponse.data.id);
    const courrierId = courrierResponse.data.id;

    // Test 4: Send Courrier
    console.log('\n4️⃣ Testing Courrier Sending...');
    const sendData = {
      recipientEmail: 'test@example.com',
      message: 'Test message'
    };
    const sendResponse = await axios.post(`${BASE_URL}/courriers/${courrierId}/send`, sendData);
    console.log('✅ Courrier sent:', sendResponse.data.status);

    // Test 5: Get Analytics
    console.log('\n5️⃣ Testing GEC Analytics...');
    const analyticsResponse = await axios.get(`${BASE_URL}/courriers/analytics?period=30d`);
    console.log('✅ Analytics loaded:', {
      total: analyticsResponse.data.totalCourriers,
      sent: analyticsResponse.data.sentCourriers,
      pending: analyticsResponse.data.pendingCourriers
    });

    // Test 6: Get SLA Breaches
    console.log('\n6️⃣ Testing SLA Breach Detection...');
    const slaResponse = await axios.get(`${BASE_URL}/courriers/sla-breaches`);
    console.log('✅ SLA breaches found:', slaResponse.data.length);

    // Test 7: Get Volume Stats
    console.log('\n7️⃣ Testing Volume Statistics...');
    const volumeResponse = await axios.get(`${BASE_URL}/courriers/volume-stats?period=7d`);
    console.log('✅ Volume data points:', volumeResponse.data.length);

    // Test 8: Trigger Relances
    console.log('\n8️⃣ Testing Automatic Relances...');
    const relanceResponse = await axios.post(`${BASE_URL}/courriers/trigger-relances`);
    console.log('✅ Relances triggered:', {
      overdue: relanceResponse.data.overdue,
      sent: relanceResponse.data.relancesSent,
      escalations: relanceResponse.data.escalationsSent
    });

    // Test 9: AI Insights
    console.log('\n9️⃣ Testing AI Insights...');
    const aiResponse = await axios.get(`${BASE_URL}/courriers/ai-insights`);
    console.log('✅ AI insights:', aiResponse.data.message || 'Analysis completed');

    // Test 10: Search Courriers
    console.log('\n🔟 Testing Courrier Search...');
    const searchResponse = await axios.get(`${BASE_URL}/courriers/search?type=REGLEMENT`);
    console.log('✅ Search results:', searchResponse.data.length);

    console.log('\n🎉 All GEC Module Tests Passed Successfully!');
    console.log('\n📊 Test Summary:');
    console.log('- Template Management: ✅');
    console.log('- Courrier Creation & Sending: ✅');
    console.log('- Email Integration: ✅');
    console.log('- Analytics & Reporting: ✅');
    console.log('- SLA Monitoring: ✅');
    console.log('- Automatic Relances: ✅');
    console.log('- AI Integration: ✅');
    console.log('- Search Functionality: ✅');

  } catch (error) {
    console.error('❌ Test Failed:', error.response?.data || error.message);
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Make sure the server is running on port 5000');
    console.log('2. Check database connection');
    console.log('3. Verify SMTP configuration in .env file');
    console.log('4. Ensure AI microservice is running on port 8002');
  }
}

// Email Configuration Test
async function testEmailConfiguration() {
  console.log('\n📧 Testing Email Configuration...');
  
  const nodemailer = require('nodemailer');
  
  const transporter = nodemailer.createTransporter({
    host: 'smtp.gnet.tn',
    port: 465,
    secure: true,
    auth: {
      user: 'noreply@arstunisia.com',
      pass: 'NR*ars2025**##'
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP Configuration Valid');
    
    // Send test email
    const testEmail = {
      from: 'ARS Tunisia <noreply@arstunisia.com>',
      to: 'test@example.com',
      subject: 'Test Email - GEC Module',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🧪 Test Email - Module GEC</h2>
          <p>Ceci est un email de test pour vérifier la configuration SMTP du module GEC.</p>
          <div style="background-color: #f8fafc; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <h3>Configuration SMTP:</h3>
            <ul>
              <li>Serveur: smtp.gnet.tn</li>
              <li>Port: 465 (SSL)</li>
              <li>Utilisateur: noreply@arstunisia.com</li>
            </ul>
          </div>
          <p>Si vous recevez cet email, la configuration fonctionne correctement.</p>
          <p>Cordialement,<br>Système ARS Tunisia</p>
        </div>
      `
    };
    
    console.log('📤 Sending test email...');
    // Note: Commented out to avoid sending actual emails during testing
    // await transporter.sendMail(testEmail);
    console.log('✅ Test email would be sent successfully');
    
  } catch (error) {
    console.error('❌ SMTP Configuration Error:', error.message);
  }
}

// Run tests
async function runAllTests() {
  console.log('🚀 Starting GEC Module Comprehensive Tests\n');
  console.log('=' .repeat(50));
  
  await testEmailConfiguration();
  console.log('\n' + '=' .repeat(50));
  await testGECModule();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 Testing Complete!');
}

// Execute if run directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testGECModule,
  testEmailConfiguration,
  runAllTests
};