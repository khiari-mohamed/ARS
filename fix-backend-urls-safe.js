const fs = require('fs');
const path = require('path');

// Safe URL replacements - keeping hardcoded as fallback
const urlReplacements = [
  // AI Microservice base URL replacements
  {
    pattern: /const AI_MICROSERVICE_URL = process\.env\.AI_MICROSERVICE_URL \|\| 'http:\/\/localhost:8002';/g,
    replacement: "const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8002';"
  },
  {
    pattern: /const AI_MICROSERVICE_URL = 'http:\/\/localhost:8002';/g,
    replacement: "const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8002';"
  },
  
  // Direct axios calls - replace base URL only, keep endpoints
  {
    pattern: /axios\.post\('http:\/\/localhost:8002\/([^']+)'/g,
    replacement: "axios.post(`${process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'}/$1`"
  },
  {
    pattern: /axios\.post\("http:\/\/localhost:8002\/([^"]+)"/g,
    replacement: 'axios.post(`${process.env.AI_MICROSERVICE_URL || "http://localhost:8002"}/$1`'
  },
  
  // Tuniclaim API - keep endpoint paths
  {
    pattern: /baseUrl = 'http:\/\/197\.14\.56\.112:8083\/api';/g,
    replacement: "baseUrl = process.env.TUNICLAIM_API_URL || 'http://197.14.56.112:8083/api';"
  },
  {
    pattern: /private readonly baseUrl = 'http:\/\/197\.14\.56\.112:8083\/api';/g,
    replacement: "private readonly baseUrl = process.env.TUNICLAIM_API_URL || 'http://197.14.56.112:8083/api';"
  },
  {
    pattern: /const externalUrl = `http:\/\/197\.14\.56\.112:8083\/api\/societes\/\$\{id\}`;/g,
    replacement: "const externalUrl = `${process.env.TUNICLAIM_API_URL || 'http://197.14.56.112:8083/api'}/societes/${id}`;"
  },
  
  // Frontend callback URL
  {
    pattern: /redirectUri: 'http:\/\/localhost:3000\/auth\/outlook\/callback',/g,
    replacement: "redirectUri: process.env.FRONTEND_CALLBACK_URL || 'http://localhost:3000/auth/outlook/callback',"
  },
  
  // Test URLs
  {
    pattern: /const BASE_URL = "http:\/\/localhost:5000\/api\/dashboard";/g,
    replacement: 'const BASE_URL = `${process.env.SERVER_URL || "http://localhost:5000"}/api/dashboard`;'
  },
  {
    pattern: /const BASE_URL = 'http:\/\/localhost:5000';/g,
    replacement: "const BASE_URL = process.env.SERVER_URL || 'http://localhost:5000';"
  },
  {
    pattern: /const API_BASE_URL = 'http:\/\/localhost:3001';/g,
    replacement: "const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';"
  },
  
  // Database URLs (only in config files, not .env files)
  {
    pattern: /'postgresql:\/\/postgres:23044943@localhost:5432\/arsdb'/g,
    replacement: "process.env.DATABASE_URL || 'postgresql://postgres:23044943@localhost:5432/arsdb'"
  },
  
  // Redis URL
  {
    pattern: /REDIS_URL = os\.getenv\('REDIS_URL', 'redis:\/\/localhost:6379\/0'\)/g,
    replacement: "REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')"
  },
  
  // Company URLs (make configurable but keep fallbacks)
  {
    pattern: /baseUrl: 'https:\/\/company\.sharepoint\.com',/g,
    replacement: "baseUrl: process.env.SHAREPOINT_URL || 'https://company.sharepoint.com',"
  },
  {
    pattern: /url: 'https:\/\/external-system\.com\/webhooks\/documents',/g,
    replacement: "url: process.env.EXTERNAL_WEBHOOK_URL || 'https://external-system.com/webhooks/documents',"
  },
  {
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
  
  // Only process source files, not .env files (we'll handle those separately)
  return ['.js', '.ts', '.py'].includes(ext) && 
         !fileName.includes('package-lock') &&
         !fileName.includes('.min.') &&
         !fileName.includes('.env');
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let changes = [];
    
    urlReplacements.forEach(({ pattern, replacement }) => {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        modified = true;
        changes.push(`  - ${matches.length} replacement(s) with pattern`);
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${path.relative(__dirname, filePath)}`);
      changes.forEach(change => console.log(change));
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
console.log('🔧 Safely fixing hardcoded URLs in backend...');
console.log('📋 This script will:');
console.log('   - Keep hardcoded URLs as fallbacks');
console.log('   - Preserve all endpoint paths');
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
console.log('- All endpoint paths are preserved');
console.log('- New environment variables added to .env files');
console.log('\n✅ Your app should work exactly the same, but now configurable!');