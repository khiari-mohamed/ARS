const fs = require('fs');
const path = require('path');

// Safe URL replacements - keeping hardcoded as fallback and preserving endpoints
const urlReplacements = [
  // AI Microservice URL variable declarations
  {
    name: 'AI Microservice URL variable',
    pattern: /const AI_MICROSERVICE_URL = 'http:\/\/localhost:8002';/g,
    replacement: "const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8002';"
  },
  
  // AI Microservice axios calls - preserve exact endpoints
  {
    name: 'AI Microservice /analyze endpoint',
    pattern: /axios\.post\('http:\/\/localhost:8002\/analyze'/g,
    replacement: "axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/analyze`"
  },
  {
    name: 'AI Microservice /suggestions endpoint',
    pattern: /axios\.post\('http:\/\/localhost:8002\/suggestions'/g,
    replacement: "axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/suggestions`"
  },
  {
    name: 'AI Microservice /recommendations endpoint',
    pattern: /axios\.post\('http:\/\/localhost:8002\/recommendations'/g,
    replacement: "axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/recommendations`"
  },
  {
    name: 'AI Microservice /predict_resources endpoint',
    pattern: /axios\.post\('http:\/\/localhost:8002\/predict_resources'/g,
    replacement: "axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/predict_resources`"
  },
  {
    name: 'AI Microservice /pattern_recognition/recurring_issues endpoint',
    pattern: /axios\.post\('http:\/\/localhost:8002\/pattern_recognition\/recurring_issues'/g,
    replacement: "axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/pattern_recognition/recurring_issues`"
  },
  {
    name: 'AI Microservice /priorities endpoint',
    pattern: /axios\.post\('http:\/\/localhost:8002\/priorities'/g,
    replacement: "axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/priorities`"
  },
  {
    name: 'AI Microservice /token endpoint',
    pattern: /axios\.post\('http:\/\/localhost:8002\/token'/g,
    replacement: "axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/token`"
  },
  {
    name: 'AI Microservice /sla_prediction endpoint',
    pattern: /axios\.post\('http:\/\/localhost:8002\/sla_prediction'/g,
    replacement: "axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/sla_prediction`"
  },
  {
    name: 'AI Microservice /anomaly_detection endpoint',
    pattern: /axios\.post\('http:\/\/localhost:8002\/anomaly_detection'/g,
    replacement: "axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/anomaly_detection`"
  },
  {
    name: 'AI Microservice /smart_routing/suggest_assignment endpoint',
    pattern: /axios\.post\('http:\/\/localhost:8002\/smart_routing\/suggest_assignment'/g,
    replacement: "axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/smart_routing/suggest_assignment`"
  },
  {
    name: 'AI Microservice /sla_breach_prediction/predict endpoint',
    pattern: /axios\.post\('http:\/\/localhost:8002\/sla_breach_prediction\/predict'/g,
    replacement: "axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/sla_breach_prediction/predict`"
  },
  
  // Tuniclaim API - keep endpoint paths
  {
    name: 'Tuniclaim private baseUrl',
    pattern: /private readonly baseUrl = 'http:\/\/197\.14\.56\.112:8083\/api';/g,
    replacement: "private readonly baseUrl = process.env.TUNICLAIM_API_URL || 'http://197.14.56.112:8083/api';"
  },
  {
    name: 'Tuniclaim external URL with societes endpoint',
    pattern: /const externalUrl = `http:\/\/197\.14\.56\.112:8083\/api\/societes\/\$\{id\}`;/g,
    replacement: "const externalUrl = `${process.env.TUNICLAIM_API_URL || 'http://197.14.56.112:8083/api'}/societes/${id}`;"
  },
  
  // Frontend callback URL
  {
    name: 'Outlook callback URL',
    pattern: /redirectUri: 'http:\/\/localhost:3000\/auth\/outlook\/callback',/g,
    replacement: "redirectUri: process.env.FRONTEND_CALLBACK_URL || 'http://localhost:3000/auth/outlook/callback',"
  },
  
  // Database URLs (only in config files, not .env files)
  {
    name: 'Database connection string',
    pattern: /'postgresql:\/\/postgres:23044943@localhost:5432\/arsdb'/g,
    replacement: "os.getenv('DATABASE_URL', 'postgresql://postgres:23044943@localhost:5432/arsdb')"
  },
  
  // Company URLs (make configurable but keep fallbacks)
  {
    name: 'SharePoint URL',
    pattern: /baseUrl: 'https:\/\/company\.sharepoint\.com',/g,
    replacement: "baseUrl: process.env.SHAREPOINT_URL || 'https://company.sharepoint.com',"
  },
  {
    name: 'External webhook URL',
    pattern: /url: 'https:\/\/external-system\.com\/webhooks\/documents',/g,
    replacement: "url: process.env.EXTERNAL_WEBHOOK_URL || 'https://external-system.com/webhooks/documents',"
  },
  {
    name: 'CRM notification URL',
    pattern: /url: 'https:\/\/crm-system\.com\/api\/document-notifications',/g,
    replacement: "url: process.env.CRM_NOTIFICATION_URL || 'https://crm-system.com/api/document-notifications',"
  }
];

// Files to exclude from processing
const excludeFiles = [
  'package-lock.json',
  'node_modules',
  '.git',
  'dist',
  'uploads',
  'exports',
  'generated',
  'migrations'
];

function shouldProcessFile(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath);
  
  // Skip excluded files
  if (excludeFiles.some(exclude => filePath.includes(exclude))) {
    return false;
  }
  
  // Only process source files, not .env files
  return ['.js', '.ts', '.py'].includes(ext) && 
         !fileName.includes('package-lock') &&
         !fileName.includes('.min.') &&
         !fileName.includes('.env');
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const changes = [];
    
    urlReplacements.forEach(({ name, pattern, replacement }) => {
      const matches = content.match(pattern);
      if (matches) {
        const oldContent = content;
        content = content.replace(pattern, replacement);
        if (content !== oldContent) {
          modified = true;
          changes.push({
            name,
            count: matches.length,
            example: matches[0]
          });
        }
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${path.relative(__dirname, filePath)}`);
      changes.forEach(({ name, count, example }) => {
        console.log(`   - ${name}: ${count} replacement(s)`);
        console.log(`     Example: ${example.substring(0, 60)}...`);
      });
      return true;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
  
  return false;
}

function processDirectory(dir) {
  let filesFixed = 0;
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!excludeFiles.includes(item)) {
          filesFixed += processDirectory(fullPath);
        }
      } else if (shouldProcessFile(fullPath)) {
        if (processFile(fullPath)) {
          filesFixed++;
        }
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dir}:`, error.message);
  }
  
  return filesFixed;
}

// Update environment files safely
function updateEnvFiles() {
  const envUpdates = [
    {
      file: 'server/.env',
      additions: [
        '',
        '# External APIs (added by fix script)',
        'TUNICLAIM_API_URL=http://197.14.56.112:8083/api',
        'FRONTEND_CALLBACK_URL=http://localhost:3000/auth/outlook/callback',
        'SERVER_URL=http://localhost:5000',
        '',
        '# External Services (added by fix script)',
        'SHAREPOINT_URL=https://company.sharepoint.com',
        'EXTERNAL_WEBHOOK_URL=https://external-system.com/webhooks/documents',
        'CRM_NOTIFICATION_URL=https://crm-system.com/api/document-notifications'
      ]
    },
    {
      file: 'ai-microservice/.env',
      additions: [
        '',
        '# External APIs (added by fix script)',
        'TUNICLAIM_API_URL=http://197.14.56.112:8083/api',
        'SERVER_URL=http://localhost:5000'
      ]
    }
  ];
  
  envUpdates.forEach(({ file, additions }) => {
    const filePath = path.join(__dirname, file);
    
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Check if our additions already exist
      const hasOurAdditions = content.includes('# External APIs (added by fix script)');
      
      if (!hasOurAdditions) {
        content += additions.join('\n');
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated: ${file}`);
      } else {
        console.log(`⏭️  Skipped: ${file} (already updated)`);
      }
    } else {
      console.log(`⚠️  Not found: ${file}`);
    }
  });
}

// Main execution
console.log('🔧 Fixing hardcoded URLs in backend...');
console.log('📋 This script will:');
console.log('   - Keep hardcoded URLs as fallbacks');
console.log('   - Preserve all endpoint paths exactly');
console.log('   - Only modify source files (not dist or node_modules)');
console.log('   - Add environment variables to .env files\n');

const backendDirs = ['server/src', 'ai-microservice'];
let totalFixed = 0;

backendDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  
  if (fs.existsSync(dirPath)) {
    console.log(`📁 Processing ${dir}/`);
    const fixed = processDirectory(dirPath);
    totalFixed += fixed;
    console.log(`   Fixed ${fixed} files\n`);
  } else {
    console.log(`⚠️  Directory not found: ${dir}\n`);
  }
});

// Update environment files
console.log('📝 Updating environment files...');
updateEnvFiles();

console.log(`\n🎉 Complete! Fixed ${totalFixed} files safely`);
console.log('\n💡 What was changed:');
console.log('- Hardcoded URLs now use environment variables with fallbacks');
console.log('- All endpoint paths are preserved exactly');
console.log('- New environment variables added to .env files');
console.log('\n✅ Your app should work exactly the same, but now configurable!');
console.log('\n🔍 To verify changes, run: node check-backend-urls.js');