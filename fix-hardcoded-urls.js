const fs = require('fs');
const path = require('path');

// Files and their hardcoded URL fixes
const fixes = [
  // Already fixed
  { file: 'frontend/src/api/bsApi.ts', done: true },
  { file: 'frontend/src/components/Finance/FinancialReportingDashboard.tsx', done: true },
  
  // Finance ReportsTab.tsx - 2 occurrences
  {
    file: 'frontend/src/components/Finance/ReportsTab.tsx',
    replacements: [
      {
        search: "fetch(`http://localhost:5000/api/virements/export-report`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/virements/export-report`, {"
      }
    ]
  },
  
  // GEC Components
  {
    file: 'frontend/src/components/GEC/CreateCorrespondenceTab.tsx',
    replacements: [
      {
        search: "fetch('http://localhost:5000/api/courriers/templates', { headers });",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/templates`, { headers });"
      },
      {
        search: "fetch('http://localhost:5000/api/clients', { headers });",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/clients`, { headers });"
      },
      {
        search: "fetch(`http://localhost:5000/api/courriers/templates/${templateId}/render`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/templates/${templateId}/render`, {"
      },
      {
        search: "fetch('http://localhost:5000/api/courriers', {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers`, {"
      },
      {
        search: "fetch(`http://localhost:5000/api/courriers/${courrier.id}/send`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/${courrier.id}/send`, {"
      }
    ]
  },
  
  {
    file: 'frontend/src/components/GEC/EnhancedTemplateManager.tsx',
    replacements: [
      {
        search: "fetch('http://localhost:5000/api/courriers/templates', {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/templates`, {"
      },
      {
        search: "fetch('http://localhost:5000/api/courriers/ab-tests', {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/ab-tests`, {"
      },
      {
        search: "fetch(`http://localhost:5000/api/courriers/templates/${editingTemplate.id}`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/templates/${editingTemplate.id}`, {"
      },
      {
        search: "fetch(`http://localhost:5000/api/courriers/templates/${template.id}/render`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/templates/${template.id}/render`, {"
      },
      {
        search: "fetch(`http://localhost:5000/api/courriers/templates/${templateId}`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/templates/${templateId}`, {"
      },
      {
        search: "fetch(`http://localhost:5000/api/courriers/ab-tests/${test.id}/results`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/ab-tests/${test.id}/results`, {"
      },
      {
        search: "fetch(`http://localhost:5000/api/courriers/ab-tests/${editingABTest.id}`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/ab-tests/${editingABTest.id}`, {"
      }
    ]
  },
  
  {
    file: 'frontend/src/components/GEC/GECAIInsights.tsx',
    replacements: [
      {
        search: "fetch('http://localhost:5000/api/courriers/ai-insights', {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/ai-insights`, {"
      }
    ]
  },
  
  {
    file: 'frontend/src/components/GEC/GECDashboardTab.tsx',
    replacements: [
      {
        search: "fetch('http://localhost:5000/api/courriers/analytics?period=30d', { headers }),",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/analytics?period=30d`, { headers }),"
      },
      {
        search: "fetch('http://localhost:5000/api/courriers/sla-breaches', { headers }),",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/sla-breaches`, { headers }),"
      },
      {
        search: "fetch('http://localhost:5000/api/courriers/volume-stats?period=7d', { headers })",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/volume-stats?period=7d`, { headers })"
      }
    ]
  },
  
  {
    file: 'frontend/src/components/GEC/InboxTab.tsx',
    replacements: [
      {
        search: "fetch(`http://localhost:5000/api/courriers/search?${queryParams}`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/search?${queryParams}`, {"
      },
      {
        search: "fetch(`http://localhost:5000/api/courriers/${selectedItem.id}/respond`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/${selectedItem.id}/respond`, {"
      },
      {
        search: "fetch(`http://localhost:5000/api/courriers/${selectedItem.id}`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/${selectedItem.id}`, {"
      },
      {
        search: "fetch('http://localhost:5000/api/courriers', {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers`, {"
      },
      {
        search: "fetch(`http://localhost:5000/api/courriers/${newCourrier.id}/send`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/${newCourrier.id}/send`, {"
      }
    ]
  },
  
  {
    file: 'frontend/src/components/GEC/MailTrackingDashboard.tsx',
    replacements: [
      {
        search: "fetch(`http://localhost:5000/api/courriers/tracking/stats?period=${period}`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/tracking/stats?period=${period}`, {"
      }
    ]
  },
  
  {
    file: 'frontend/src/components/GEC/OutboxTab.tsx',
    replacements: [
      {
        search: "fetch(`http://localhost:5000/api/courriers/search?${queryParams}`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/search?${queryParams}`, {"
      },
      {
        search: "fetch(`http://localhost:5000/api/courriers/${itemId}/send`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/${itemId}/send`, {"
      },
      {
        search: "fetch(`http://localhost:5000/api/courriers/${itemId}/status`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/${itemId}/status`, {"
      }
    ]
  },
  
  {
    file: 'frontend/src/components/GEC/OutlookIntegration.tsx',
    replacements: [
      {
        search: "fetch('http://localhost:5000/api/courriers/smtp/config', {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/smtp/config`, {"
      },
      {
        search: "fetch('http://localhost:5000/api/courriers/smtp/stats', {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/smtp/stats`, {"
      },
      {
        search: "fetch('http://localhost:5000/api/courriers/smtp/test', {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/smtp/test`, {"
      }
    ]
  },
  
  {
    file: 'frontend/src/components/GEC/RelanceManager.tsx',
    replacements: [
      {
        search: "fetch(`http://localhost:5000/api/courriers/bordereau/${selectedBordereau}/relance`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/bordereau/${selectedBordereau}/relance`, {"
      }
    ]
  },
  
  {
    file: 'frontend/src/components/GEC/ReportsTab.tsx',
    replacements: [
      {
        search: "fetch(`http://localhost:5000/api/courriers/reports/data?${queryParams}`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/reports/data?${queryParams}`, {"
      }
    ]
  },
  
  {
    file: 'frontend/src/components/GEC/SearchArchiveTab.tsx',
    replacements: [
      {
        search: "fetch(`http://localhost:5000/api/courriers/search?${queryParams}`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/courriers/search?${queryParams}`, {"
      }
    ]
  },
  
  // GED Components
  {
    file: 'frontend/src/components/GED/DocumentWorkflowManager.tsx',
    replacements: [
      {
        search: "fetch('http://localhost:5000/api/documents/workflows/definitions', {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/documents/workflows/definitions`, {"
      },
      {
        search: "fetch('http://localhost:5000/api/documents/workflows/tasks/current', {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/documents/workflows/tasks/current`, {"
      },
      {
        search: "fetch('http://localhost:5000/api/documents/search', {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/documents/search`, {"
      },
      {
        search: "fetch('http://localhost:5000/api/documents/workflows/start', {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/documents/workflows/start`, {"
      },
      {
        search: "fetch(`http://localhost:5000/api/documents/workflows/${selectedTask.instanceId}/steps/${selectedTask.stepId}/complete`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/documents/workflows/${selectedTask.instanceId}/steps/${selectedTask.stepId}/complete`, {"
      },
      {
        search: "fetch(`http://localhost:5000/api/documents/${documentId}/lifecycle`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/documents/${documentId}/lifecycle`, {"
      }
    ]
  },
  
  {
    file: 'frontend/src/components/GED/IntegrationManager.tsx',
    replacements: [
      {
        search: "fetch('http://localhost:5000/api/documents/integrations/connectors', {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/documents/integrations/connectors`, {"
      },
      {
        search: "fetch('http://localhost:5000/api/documents/integrations/webhooks', {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/documents/integrations/webhooks`, {"
      },
      {
        search: "fetch('http://localhost:5000/api/documents/integrations/stats', {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/documents/integrations/stats`, {"
      },
      {
        search: "fetch(`http://localhost:5000/api/documents/integrations/connectors/${connectorId}/test`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/documents/integrations/connectors/${connectorId}/test`, {"
      },
      {
        search: "fetch(`http://localhost:5000/api/documents/integrations/connectors/${connectorId}/sync`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/documents/integrations/connectors/${connectorId}/sync`, {"
      },
      {
        search: "fetch(`http://localhost:5000/api/documents/integrations/connectors/${existingConnector.id}`, {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/documents/integrations/connectors/${existingConnector.id}`, {"
      },
      {
        search: "handleTestApi('http://localhost:5000/api/documents/stats')",
        replace: "handleTestApi(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/documents/stats`)"
      },
      {
        search: "handleTestApi('http://localhost:5000/api/documents/search')",
        replace: "handleTestApi(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/documents/search`)"
      },
      {
        search: "handleTestApi('http://localhost:5000/api/documents/workflows/definitions')",
        replace: "handleTestApi(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/documents/workflows/definitions`)"
      }
    ]
  },
  
  {
    file: 'frontend/src/components/GED/ReportsTab.tsx',
    replacements: [
      {
        search: "fetch('http://localhost:5000/api/documents/search', {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/documents/search`, {"
      },
      {
        search: "fetch('http://localhost:5000/api/documents/analytics?' + new URLSearchParams({",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/documents/analytics?` + new URLSearchParams({"
      },
      {
        search: "fetch('http://localhost:5000/api/documents/export', {",
        replace: "fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/documents/export`, {"
      }
    ]
  },
  
  // Pages
  {
    file: 'frontend/src/pages/bs/BSAnalyticsPage.tsx',
    replacements: [
      {
        search: "axios.get(`http://localhost:5000/api/bulletin-soin/analytics/${endpoint}`, {",
        replace: "axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/bulletin-soin/analytics/${endpoint}`, {"
      },
      {
        search: "link.href = 'http://localhost:5000/api/bulletin-soin/export/excel';",
        replace: "link.href = `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/bulletin-soin/export/excel`;"
      }
    ]
  },
  
  {
    file: 'frontend/src/pages/bs/BSListPage.tsx',
    replacements: [
      {
        search: "link.href = 'http://localhost:5000/api/bulletin-soin/export/excel';",
        replace: "link.href = `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/bulletin-soin/export/excel`;"
      }
    ]
  }
];

// Function to apply fixes
function applyFixes() {
  let totalFixed = 0;
  
  fixes.forEach(fix => {
    if (fix.done) {
      console.log(`✅ ${fix.file} - Already fixed`);
      return;
    }
    
    const filePath = path.join(__dirname, fix.file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ ${fix.file} - File not found`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let fileFixed = 0;
    
    fix.replacements.forEach(replacement => {
      const beforeCount = (content.match(new RegExp(replacement.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      content = content.replace(new RegExp(replacement.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement.replace);
      const afterCount = (content.match(new RegExp(replacement.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      
      if (beforeCount > afterCount) {
        fileFixed += (beforeCount - afterCount);
      }
    });
    
    if (fileFixed > 0) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ ${fix.file} - Fixed ${fileFixed} occurrence(s)`);
      totalFixed += fileFixed;
    } else {
      console.log(`⚠️ ${fix.file} - No changes needed`);
    }
  });
  
  console.log(`\n🎉 Total fixes applied: ${totalFixed}`);
  console.log('\n✅ All hardcoded URLs have been updated to use environment variables with fallbacks!');
}

// Run the fixes
applyFixes();