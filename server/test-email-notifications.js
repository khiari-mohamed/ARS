/**
 * Email & Notification Testing Script
 * Tests all email and notification features of the ARS system
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let authToken = '';
let testUserId = '';
let testBordereauId = '';
let testCourrierId = '';

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

async function login() {
  logSection('🔐 Step 1: Authentication');
  try {
    // Check if server is running
    try {
      await axios.get(`${API_URL}/`);
    } catch (e) {
      log('❌ Server is not running! Please start the server first:', 'red');
      log('   Run: npm run start:dev', 'yellow');
      return false;
    }
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@ars.tn',
      password: 'admin123'
    });
    authToken = response.data.access_token;
    testUserId = response.data.user.id;
    log('✅ Login successful', 'green');
    log(`   User ID: ${testUserId}`, 'blue');
    return true;
  } catch (error) {
    log('❌ Login failed: ' + error.message, 'red');
    return false;
  }
}

async function testSMTPConnection() {
  logSection('📧 Step 2: Test SMTP Connection');
  try {
    const response = await axios.post(
      `${API_URL}/gec/test-smtp`,
      {
        host: 'smtp.gnet.tn',
        port: 465,
        secure: true,
        user: 'noreply@arstunisia.com',
        password: 'NR*ars2025**##'
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    log('✅ SMTP connection test: ' + response.data.message, 'green');
    return response.data.success;
  } catch (error) {
    log('❌ SMTP test failed: ' + (error.response?.data?.message || error.message), 'red');
    return false;
  }
}

async function createTestBordereau() {
  logSection('📋 Step 3: Create Test Bordereau');
  try {
    // First get a client
    const clientsResponse = await axios.get(`${API_URL}/client`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const testClient = clientsResponse.data[0];
    if (!testClient) {
      log('⚠️  No clients found, creating one...', 'yellow');
      const newClient = await axios.post(
        `${API_URL}/client`,
        {
          name: 'Test Client Email',
          email: 'testclient@example.com',
          phone: '12345678',
          address: 'Test Address'
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      testClient = newClient.data;
    }

    const response = await axios.post(
      `${API_URL}/bordereaux`,
      {
        reference: `TEST-EMAIL-${Date.now()}`,
        clientId: testClient.id,
        receptionDate: new Date().toISOString(),
        totalBS: 10,
        delaiReglement: 30
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    testBordereauId = response.data.id;
    log('✅ Test bordereau created', 'green');
    log(`   Bordereau ID: ${testBordereauId}`, 'blue');
    return true;
  } catch (error) {
    log('❌ Failed to create bordereau: ' + (error.response?.data?.message || error.message), 'red');
    return false;
  }
}

async function testCourrierCreation() {
  logSection('✉️  Step 4: Create Test Courrier (Draft)');
  try {
    const response = await axios.post(
      `${API_URL}/gec/courriers`,
      {
        subject: 'Test Email - Notification System',
        body: '<h2>Test Email</h2><p>This is a test email from ARS notification system.</p>',
        type: 'NOTIFICATION',
        bordereauId: testBordereauId
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    testCourrierId = response.data.id;
    log('✅ Courrier created (DRAFT)', 'green');
    log(`   Courrier ID: ${testCourrierId}`, 'blue');
    return true;
  } catch (error) {
    log('❌ Failed to create courrier: ' + (error.response?.data?.message || error.message), 'red');
    return false;
  }
}

async function testSendEmail() {
  logSection('📤 Step 5: Send Email via Courrier');
  try {
    log('⏳ Sending email to: admin@ars.tn', 'yellow');
    const response = await axios.post(
      `${API_URL}/gec/courriers/${testCourrierId}/send`,
      {
        recipientEmail: 'admin@ars.tn'
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    log('✅ Email sent successfully', 'green');
    log(`   Status: ${response.data.status}`, 'blue');
    log(`   Sent at: ${response.data.sentAt}`, 'blue');
    return true;
  } catch (error) {
    log('❌ Failed to send email: ' + (error.response?.data?.message || error.message), 'red');
    log('   Note: Email may still be sent even if error occurs', 'yellow');
    return false;
  }
}

async function testNotificationPreferences() {
  logSection('⚙️  Step 6: Test Notification Preferences');
  try {
    // Get current preferences
    const getResponse = await axios.get(`${API_URL}/notifications/preferences`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    log('✅ Current preferences retrieved', 'green');
    log(`   Email enabled: ${getResponse.data.emailEnabled}`, 'blue');
    log(`   In-app enabled: ${getResponse.data.inAppEnabled}`, 'blue');

    // Update preferences
    const updateResponse = await axios.post(
      `${API_URL}/notifications/preferences`,
      {
        emailEnabled: true,
        inAppEnabled: true,
        slaAlerts: true,
        reclamationAlerts: true,
        assignmentAlerts: true
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    log('✅ Preferences updated', 'green');
    return true;
  } catch (error) {
    log('❌ Failed to manage preferences: ' + (error.response?.data?.message || error.message), 'red');
    return false;
  }
}

async function testReassignmentNotification() {
  logSection('🔄 Step 7: Test Reassignment Notification');
  try {
    // Get another user for reassignment
    const usersResponse = await axios.get(`${API_URL}/user`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const targetUser = usersResponse.data.find(u => u.id !== testUserId) || usersResponse.data[0];
    
    log(`⏳ Sending reassignment notification to: ${targetUser.email}`, 'yellow');
    const response = await axios.post(
      `${API_URL}/notifications/reassignment`,
      {
        bordereauId: testBordereauId,
        fromUserId: testUserId,
        toUserId: targetUser.id,
        comment: 'Test reassignment notification',
        timestamp: new Date().toISOString()
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    log('✅ Reassignment notification sent', 'green');
    log(`   Notification ID: ${response.data.notificationId}`, 'blue');
    log(`   Email sent: ${response.data.emailSent}`, 'blue');
    return true;
  } catch (error) {
    log('❌ Failed to send reassignment notification: ' + (error.response?.data?.message || error.message), 'red');
    return false;
  }
}

async function testInAppNotifications() {
  logSection('🔔 Step 8: Test In-App Notifications');
  try {
    const response = await axios.get(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    log('✅ In-app notifications retrieved', 'green');
    log(`   Total notifications: ${response.data.length}`, 'blue');
    
    if (response.data.length > 0) {
      log(`   Latest: ${response.data[0].title}`, 'blue');
      
      // Mark first as read
      const markReadResponse = await axios.post(
        `${API_URL}/notifications/mark-read/${response.data[0].id}`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      log('✅ Notification marked as read', 'green');
    }
    return true;
  } catch (error) {
    log('❌ Failed to retrieve notifications: ' + (error.response?.data?.message || error.message), 'red');
    return false;
  }
}

async function testAutomaticRelance() {
  logSection('🔄 Step 9: Test Automatic Relance');
  try {
    log('⏳ Creating automatic relance...', 'yellow');
    const response = await axios.post(
      `${API_URL}/gec/relances/automatic`,
      {
        bordereauId: testBordereauId,
        type: 'CLIENT'
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    log('✅ Automatic relance created', 'green');
    log(`   Courrier ID: ${response.data.id}`, 'blue');
    log(`   Status: ${response.data.status}`, 'blue');
    return true;
  } catch (error) {
    log('❌ Failed to create relance: ' + (error.response?.data?.message || error.message), 'red');
    return false;
  }
}

async function testSMTPStats() {
  logSection('📊 Step 10: Check SMTP Statistics');
  try {
    const response = await axios.get(`${API_URL}/gec/smtp-stats`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    log('✅ SMTP statistics retrieved', 'green');
    log(`   Emails sent: ${response.data.sent}`, 'blue');
    log(`   Failed: ${response.data.failed}`, 'blue');
    log(`   Last sent: ${response.data.lastSent || 'N/A'}`, 'blue');
    return true;
  } catch (error) {
    log('❌ Failed to get SMTP stats: ' + (error.response?.data?.message || error.message), 'red');
    return false;
  }
}

async function testEmailTracking() {
  logSection('📈 Step 11: Test Email Tracking Stats');
  try {
    const response = await axios.get(`${API_URL}/gec/email-tracking?period=7d`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    log('✅ Email tracking stats retrieved', 'green');
    log(`   Total messages: ${response.data.summary.totalMessages}`, 'blue');
    log(`   Delivery rate: ${response.data.summary.deliveryRate}%`, 'blue');
    log(`   Open rate: ${response.data.summary.openRate}%`, 'blue');
    return true;
  } catch (error) {
    log('❌ Failed to get tracking stats: ' + (error.response?.data?.message || error.message), 'red');
    return false;
  }
}

async function runAllTests() {
  log('\n🚀 Starting Email & Notification System Tests\n', 'cyan');
  log('Testing SMTP: smtp.gnet.tn:465', 'yellow');
  log('User: noreply@arstunisia.com\n', 'yellow');

  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };

  const tests = [
    { name: 'Authentication', fn: login },
    { name: 'SMTP Connection', fn: testSMTPConnection },
    { name: 'Create Bordereau', fn: createTestBordereau },
    { name: 'Create Courrier', fn: testCourrierCreation },
    { name: 'Send Email', fn: testSendEmail },
    { name: 'Notification Preferences', fn: testNotificationPreferences },
    { name: 'Reassignment Notification', fn: testReassignmentNotification },
    { name: 'In-App Notifications', fn: testInAppNotifications },
    { name: 'Automatic Relance', fn: testAutomaticRelance },
    { name: 'SMTP Statistics', fn: testSMTPStats },
    { name: 'Email Tracking', fn: testEmailTracking }
  ];

  for (const test of tests) {
    results.total++;
    const success = await test.fn();
    if (success) {
      results.passed++;
    } else {
      results.failed++;
    }
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
  }

  // Final summary
  logSection('📊 Test Summary');
  log(`Total tests: ${results.total}`, 'blue');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Success rate: ${Math.round((results.passed / results.total) * 100)}%`, 'cyan');

  if (results.failed === 0) {
    log('\n🎉 All tests passed! Email and notification system is working correctly.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please check the logs above for details.', 'yellow');
  }
}

// Run tests
runAllTests().catch(error => {
  log('\n❌ Test suite failed with error:', 'red');
  console.error(error);
  process.exit(1);
});
