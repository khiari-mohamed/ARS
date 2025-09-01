const fs = require('fs');
const path = require('path');

// Safe URL replacements - keeping hardcoded as fallback
const urlReplacements = [
  // AI Microservice base URL replacements
  {
    name: 'AI Microservice URL variable',
    pattern: /const AI_MICROSERVICE_URL = 'http:\/\/localhost:8002';/g,
    replacement: "const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8002';"
  },
  
  // Direct axios calls - replace base URL only, keep endpoints
  {
    name: 'AI Microservice axios calls',
    pattern: /axios\.post\('http:\/\/localhost:8002\/([^']+)'/g,
    replacement: "axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/$1`"
  },
  {
    name: 'AI Microservice axios calls (double quotes)',
    pattern: /axios\.post\("http:\/\/localhost:8002\/([^"]+)"/g,
    replacement: 'axios.post(`${process.env.AI_MICROSERVICE_URL || "http://localhost:8002"}/$1`'
  },
  
  // Tuniclaim API - keep endpoint paths
  {
    name: 'Tuniclaim base URL',
    pattern: /baseUrl = 'http:\/\/197\.14\.56\.112:8083\/api';/g,
    replacement: "baseUrl = process.env.TUNICLAIM_API_URL || 'http://197.14.56.112:8083/api';"
  },
  {
    name: 'Tuniclaim private baseUrl',
    pattern: /private readonly baseUrl = 'http:\/\/197\.14\.56\.112:8083\/api';/g,
    replacement: "private readonly baseUrl = process.env.TUNICLAIM_API_URL || 'http://197.14.56.112:8083/api';"
  },
  {
    name: 'Tuniclaim external URL with endpoint',
    pattern: /const externalUrl = `http:\/\/197\.14\.56\.112:8083\/api\/societes\/\$\{id\}`;/g,
    replacement: "const externalUrl = `${process.env.TUNICLAIM_API_URL || 'http://197.14.56.112:8083/api'}/societes/${id}`;"
  },
  
  // Frontend callback URL
  {
    name: 'Outlook callback URL',
    pattern: /redirectUri: 'http:\/\/localhost:3000\/auth\/outlook\/callback',/g,
    replacement: "redirectUri: process.env.FRONTEND_CALLBACK_URL || 'http://localhost:3000/auth/outlook/callback',"
  },
  
  // Test URLs
  {
    name: 'Dashboard test URL',
    pattern: /const BASE_URL = "http:\/\/localhost:5000\/api\/dashboard";/g,
    replacement: 'const BASE_URL = `${process.env.SERVER_URL || "http://localhost:5000"}/api/dashboard`;'
  },
  {
    name: 'Server base URL',
    pattern: /const BASE_URL = 'http:\/\/localhost:5000';/g,
    replacement: "const BASE_URL = process.env.SERVER_URL || 'http://localhost:5000';"
  },
  {
    name: 'API base URL',
    pattern: /const API_BASE_URL = 'http:\/\/localhost:3001';/g,
    replacement: "const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';"
  },
  
  // Database URLs (only in config files, not .env files)
  {
    name: 'Database connection string',
    pattern: /'postgresql:\/\/postgres:23044943@localhost:5432\/arsdb'/g,
    replacement: "process.env.DATABASE_URL || 'postgresql://postgres:23044943@localhost:5432/arsdb'"
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

function previewFileChanges(filePath) {
  const changes = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    urlReplacements.forEach(({ name, pattern, replacement }) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Find the line number
          const lineIndex = lines.findIndex(line => line.includes(match));
          const lineNumber = lineIndex + 1;
          
          // Create the actual replacement for this match
          let actualReplacement = replacement;
          if (pattern.global && pattern.source.includes('([^')) {
            // Handle regex groups for endpoint preservation
            const regexMatch = match.match(pattern);
            if (regexMatch && regexMatch[1]) {
              actualReplacement = replacement.replace('$1', regexMatch[1]);
            }
          }
          
          changes.push({
            name,
            lineNumber,
            oldCode: match.trim(),
            newCode: actualReplacement.trim(),
            context: lines[lineIndex]?.trim() || ''
          });
        });
      }
    });
  } catch (error) {
    console.error(`❌ Error reading ${filePath}:`, error.message);
  }
  
  return changes;
}

function previewDirectory(dir) {
  const allChanges = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!excludeFiles.includes(item)) {
          allChanges.push(...previewDirectory(fullPath));
        }
      } else if (shouldProcessFile(fullPath)) {
        const changes = previewFileChanges(fullPath);
        if (changes.length > 0) {
          allChanges.push({
            file: path.relative(__dirname, fullPath),
            changes
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dir}:`, error.message);
  }
  
  return allChanges;
}

// Preview environment file changes
function previewEnvChanges() {
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
  
  return envUpdates;
}

// Main execution - PREVIEW ONLY
console.log('🔍 PREVIEW: Backend URL fixes (NO CHANGES WILL BE MADE)');
console.log('=' .repeat(60));

const backendDirs = ['server/src', 'ai-microservice'];
let totalChanges = 0;

backendDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  
  if (fs.existsSync(dirPath)) {
    console.log(`\n📁 Scanning ${dir}/`);
    const fileChanges = previewDirectory(dirPath);
    
    if (fileChanges.length === 0) {
      console.log('   ✅ No changes needed in this directory');
      return;
    }
    
    fileChanges.forEach(({ file, changes }) => {
      console.log(`\n📄 ${file}`);
      console.log('-'.repeat(40));
      
      changes.forEach(({ name, lineNumber, oldCode, newCode, context }) => {
        console.log(`\n🔧 ${name} (Line ${lineNumber})`);
        console.log(`   OLD: ${oldCode}`);
        console.log(`   NEW: ${newCode}`);
        console.log(`   Context: ${context}`);
        totalChanges++;
      });
    });
  }
});

// Preview environment file changes
console.log('\n📝 Environment file additions:');
console.log('=' .repeat(40));

const envChanges = previewEnvChanges();
envChanges.forEach(({ file, additions }) => {
  const filePath = path.join(__dirname, file);
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasOurAdditions = content.includes('# External APIs (added by fix script)');
    
    console.log(`\n📄 ${file}`);
    if (hasOurAdditions) {
      console.log('   ⏭️  Already updated - no changes needed');
    } else {
      console.log('   Will add:');
      additions.forEach(line => {
        if (line.trim()) {
          console.log(`   + ${line}`);
        }
      });
    }
  } else {
    console.log(`\n📄 ${file}`);
    console.log('   ⚠️  File not found - will be skipped');
  }
});

console.log('\n' + '=' .repeat(60));
console.log(`📊 SUMMARY: ${totalChanges} changes found`);
console.log('\n💡 All changes preserve:');
console.log('   ✅ Hardcoded URLs as fallbacks');
console.log('   ✅ Complete endpoint paths');
console.log('   ✅ Original functionality');
console.log('\n🚀 To apply these changes, run: node fix-backend-urls-safe.js');