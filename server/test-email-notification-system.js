/**
 * Comprehensive Email & Notification System Test Script
 * Tests: SMTP, GEC, Notifications, Email Sending/Receiving, Relances, Escalations
 */

const fetch = require('node-fetch');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@arstunisia.com';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}\n`)
};

let authToken = null;
let testUserId = null;
let testBordereauId = null;
let testCourrierId = null;

// Test Results Tracker
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function recordTest(name, passed, message = '') {
  results.total++;
  if (passed) {
    results.passed++;
    log.success(`${name}: ${message}`);
  } else {
    results.failed++;
    log.error(`${name}: ${message}`);
  }
  results.tests.push({ name, passed, message });
}

// Authentication
async function authenticate() {
  log.section('🔐 AUTHENTICATION');
  
  // Try multiple credential combinations
  const credentials = [
    { email: 'test@ars.com', password: 'Test123@' },
    { email: 'super@mail.com', password: 'Azerty123@' },
    { email: process.env.TEST_USER_EMAIL || 'test@ars.com', password: process.env.TEST_USER_PASSWORD || 'Test123@' }
  ];
  
  for (const cred of credentials) {
    try {
      log.info(`Trying: ${cred.email}`);
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cred)
      });

      if (response.ok) {
        const data = await response.json();
        authToken = data.access_token || data.token;
        testUserId = data.user?.id;
        recordTest('Authentication', true, `Login successful with ${cred.email}`);
        return true;
      }
    } catch (error) {
      // Try next credential
    }
  }
  
  recordTest('Authentication', false, 'All login attempts failed. Check if server is running and credentials are correct.');
  log.warning('\nDefault credentials: super@mail.com / Azerty123@');
  log.warning('Server should be running at: ' + API_URL.replace('/api', ''));
  return false;
}

// Test 1: SMTP Connection
async function testSMTPConnection() {
  log.section('📧 TEST 1: SMTP CONNECTION');
  try {
    const response = await fetch(`${API_URL}/courriers/smtp/test`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        host: process.env.SMTP_HOST || 'smtp.gnet.tn',
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: true,
        user: process.env.SMTP_USER || 'noreply@arstunisia.com',
        password: process.env.SMTP_PASS || 'NR*ars2025**##'
      })
    });

    const result = await response.json();
    recordTest('SMTP Connection Test', response.ok && result.success, 
      response.ok ? 'SMTP server reachable' : result.message);
  } catch (error) {
    recordTest('SMTP Connection Test', false, error.message);
  }
}

// Test 2: Get Existing Test Bordereau
async function createTestBordereau() {
  log.section('📋 TEST 2: GET EXISTING BORDEREAU');
  try {
    const response = await fetch(`${API_URL}/bordereaux`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.length > 0) {
        testBordereauId = data[0].id;
        recordTest('Get Existing Bordereau', true, `Using: ${data[0].reference}`);
        return true;
      } else {
        recordTest('Get Existing Bordereau', false, 'No bordereaux found - run seed-test-data.js first');
        return false;
      }
    } else {
      const error = await response.text();
      recordTest('Get Existing Bordereau', false, `Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    recordTest('Get Existing Bordereau', false, error.message);
    return false;
  }
}

// Test 3: Create GEC Template & Courrier
async function createCourrier() {
  log.section('✉️ TEST 3: CREATE COURRIER (DRAFT)');
  
  if (!testBordereauId) {
    log.warning('Skipping - no bordereau available');
    recordTest('Create Courrier', false, 'Skipped - no bordereau');
    return false;
  }
  
  try {
    // First create a template
    const templateResponse = await fetch(`${API_URL}/gec-templates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Email Template',
        content: '<h2>Test Email</h2><p>This is an automated test.</p>',
        type: 'EMAIL',
        category: 'Test'
      })
    });

    const response = await fetch(`${API_URL}/courriers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subject: 'Test Email System - Automated Test',
        body: `<h2>Test Email</h2><p>This is an automated test of the email system.</p><p>Timestamp: ${new Date().toISOString()}</p>`,
        type: 'REGLEMENT',
        status: 'DRAFT',
        bordereauId: testBordereauId,
        uploadedById: testUserId
      })
    });

    if (response.ok) {
      const data = await response.json();
      testCourrierId = data.id;
      recordTest('Create Courrier', true, `ID: ${testCourrierId}`);
      return true;
    } else {
      const error = await response.text();
      recordTest('Create Courrier', false, `Status: ${response.status} - ${error}`);
      return false;
    }
  } catch (error) {
    recordTest('Create Courrier', false, error.message);
    return false;
  }
}

// Test 4: Send Email
async function sendEmail() {
  log.section('📤 TEST 4: SEND EMAIL');
  
  if (!testCourrierId) {
    log.warning('Skipping - no courrier available');
    recordTest('Send Email', false, 'Skipped - no courrier');
    return false;
  }
  
  try {
    const response = await fetch(`${API_URL}/courriers/${testCourrierId}/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipientEmail: TEST_EMAIL
      })
    });

    if (response.ok) {
      const data = await response.json();
      recordTest('Send Email', true, `Sent to ${TEST_EMAIL}`);
      return true;
    } else {
      const error = await response.text();
      recordTest('Send Email', false, `Status: ${response.status} - ${error}`);
      return false;
    }
  } catch (error) {
    recordTest('Send Email', false, error.message);
    return false;
  }
}

// Test 5: Create In-App Notification
async function createNotification() {
  log.section('🔔 TEST 5: CREATE IN-APP NOTIFICATION');
  try {
    const response = await fetch(`${API_URL}/notifications/reassignment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bordereauId: testBordereauId,
        fromUserId: testUserId,
        toUserId: testUserId,
        comment: 'Test notification - automated test',
        timestamp: new Date().toISOString()
      })
    });

    if (response.ok) {
      const data = await response.json();
      recordTest('Create Notification', true, `Notification ID: ${data.notificationId}`);
      return true;
    } else {
      recordTest('Create Notification', false, `Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    recordTest('Create Notification', false, error.message);
    return false;
  }
}

// Test 6: Get Notifications
async function getNotifications() {
  log.section('📬 TEST 6: GET NOTIFICATIONS');
  try {
    const response = await fetch(`${API_URL}/notifications`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      recordTest('Get Notifications', true, `Found ${data.length} notifications`);
      return true;
    } else {
      recordTest('Get Notifications', false, `Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    recordTest('Get Notifications', false, error.message);
    return false;
  }
}

// Test 7: Email Tracking Stats
async function getEmailStats() {
  log.section('📊 TEST 7: EMAIL TRACKING STATS');
  try {
    const response = await fetch(`${API_URL}/courriers/smtp/stats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      recordTest('Email Stats', true, `Sent: ${data.sent}, Failed: ${data.failed}`);
      log.info(`Last sent: ${data.lastSent || 'Never'}`);
      return true;
    } else {
      recordTest('Email Stats', false, `Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    recordTest('Email Stats', false, error.message);
    return false;
  }
}

// Test 8: GEC Analytics
async function getGECAnalytics() {
  log.section('📈 TEST 8: GEC ANALYTICS');
  try {
    const response = await fetch(`${API_URL}/courriers/analytics?period=7d`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      recordTest('GEC Analytics', true, 
        `Total: ${data.totalCourriers}, Sent: ${data.sentCourriers}, Success Rate: ${data.successRate}%`);
      return true;
    } else {
      recordTest('GEC Analytics', false, `Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    recordTest('GEC Analytics', false, error.message);
    return false;
  }
}

// Test 9: Trigger Relance (Manual)
async function triggerRelance() {
  log.section('🔄 TEST 9: TRIGGER RELANCE');
  try {
    if (!testBordereauId) {
      recordTest('Trigger Relance', false, 'No test bordereau available');
      return false;
    }

    const response = await fetch(`${API_URL}/courriers/bordereau/${testBordereauId}/relance`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'CLIENT'
      })
    });

    if (response.ok) {
      const data = await response.json();
      recordTest('Trigger Relance', true, `Relance created`);
      return true;
    } else {
      recordTest('Trigger Relance', false, `Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    recordTest('Trigger Relance', false, error.message);
    return false;
  }
}

// Test 10: Email Tracking Details
async function getEmailTrackingDetails() {
  log.section('🔍 TEST 10: EMAIL TRACKING DETAILS');
  try {
    const response = await fetch(`${API_URL}/courriers/tracking/stats?period=7d`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      recordTest('Email Tracking Details', true, 
        `Delivery Rate: ${data.summary?.deliveryRate}%, Open Rate: ${data.summary?.openRate}%`);
      log.info(`Total Messages: ${data.summary?.totalMessages}`);
      return true;
    } else {
      recordTest('Email Tracking Details', false, `Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    recordTest('Email Tracking Details', false, error.message);
    return false;
  }
}

// Test 11: Search Courriers
async function searchCourriers() {
  log.section('🔎 TEST 11: SEARCH COURRIERS');
  try {
    const response = await fetch(`${API_URL}/courriers/search?status=SENT`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      recordTest('Search Courriers', true, `Found ${data.length} sent courriers`);
      return true;
    } else {
      recordTest('Search Courriers', false, `Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    recordTest('Search Courriers', false, error.message);
    return false;
  }
}

// Test 12: SLA Breaches
async function getSLABreaches() {
  log.section('🚨 TEST 12: SLA BREACHES');
  try {
    const response = await fetch(`${API_URL}/courriers/sla-breaches`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      recordTest('SLA Breaches', true, `Found ${data.length} SLA items`);
      return true;
    } else {
      recordTest('SLA Breaches', false, `Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    recordTest('SLA Breaches', false, error.message);
    return false;
  }
}

// Print Final Report
function printReport() {
  log.section('📊 FINAL TEST REPORT');
  
  console.log(`Total Tests: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`Success Rate: ${Math.round((results.passed / results.total) * 100)}%\n`);

  if (results.failed > 0) {
    log.warning('Failed Tests:');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => console.log(`  - ${t.name}: ${t.message}`));
  }

  console.log('\n' + '='.repeat(60));
  
  if (results.failed === 0) {
    log.success('🎉 ALL TESTS PASSED! Email & Notification System is working perfectly!');
  } else {
    log.warning(`⚠️  ${results.failed} test(s) failed. Please review the errors above.`);
  }
}

// Main Test Runner
async function runAllTests() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║   EMAIL & NOTIFICATION SYSTEM - COMPREHENSIVE TEST        ║
║   Testing: SMTP, GEC, Notifications, Tracking, Relances  ║
╚═══════════════════════════════════════════════════════════╝
  `);

  log.info(`API URL: ${API_URL}`);
  log.info(`Test Email: ${TEST_EMAIL}`);
  log.info(`Start Time: ${new Date().toLocaleString()}\n`);

  // Run tests sequentially
  const authenticated = await authenticate();
  if (!authenticated) {
    log.error('Authentication failed. Cannot proceed with tests.');
    return;
  }

  await testSMTPConnection();
  await createTestBordereau();
  await createCourrier();
  await sendEmail();
  await createNotification();
  await getNotifications();
  await getEmailStats();
  await getGECAnalytics();
  await triggerRelance();
  await getEmailTrackingDetails();
  await searchCourriers();
  await getSLABreaches();

  // Print final report
  printReport();
  
  log.info(`\nEnd Time: ${new Date().toLocaleString()}`);
}

// Run tests
runAllTests().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
