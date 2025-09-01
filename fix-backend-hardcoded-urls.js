const fs = require('fs');
const path = require('path');

// URL replacements mapping
const urlReplacements = [
  // AI Microservice URLs
  {
    pattern: /'http:\/\/localhost:8002'/g,
    replacement: "process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'"
  },
  {
    pattern: /"http:\/\/localhost:8002"/g,
    replacement: 'process.env.AI_MICROSERVICE_URL || "http://localhost:8002"'
  },
  {
    pattern: /`http:\/\/localhost:8002/g,
    replacement: '`${process.env.AI_MICROSERVICE_URL || "http://localhost:8002"}'
  },
  
  // External API URLs
  {
    pattern: /'http:\/\/197\.14\.56\.112:8083\/api'/g,
    replacement: "process.env.TUNICLAIM_API_URL || 'http://197.14.56.112:8083/api'"
  },
  {
    pattern: /"http:\/\/197\.14\.56\.112:8083\/api"/g,
    replacement: 'process.env.TUNICLAIM_API_URL || "http://197.14.56.112:8083/api"'
  },
  {
    pattern: /`http:\/\/197\.14\.56\.112:8083\/api\/societes\/\$\{id\}`/g,
    replacement: '`${process.env.TUNICLAIM_API_URL || "http://197.14.56.112:8083/api"}/societes/${id}`'
  },
  
  // Frontend callback URLs
  {
    pattern: /'http:\/\/localhost:3000\/auth\/outlook\/callback'/g,
    replacement: "process.env.FRONTEND_CALLBACK_URL || 'http://localhost:3000/auth/outlook/callback'"
  },
  {
    pattern: /"http:\/\/localhost:3000\/auth\/outlook\/callback"/g,
    replacement: 'process.env.FRONTEND_CALLBACK_URL || "http://localhost:3000/auth/outlook/callback"'
  },
  
  // Test/Debug URLs
  {
    pattern: /'http:\/\/localhost:5000'/g,
    replacement: "process.env.SERVER_URL || 'http://localhost:5000'"
  },
  {
    pattern: /"http:\/\/localhost:5000"/g,
    replacement: 'process.env.SERVER_URL || "http://localhost:5000"'
  },
  {
    pattern: /'http:\/\/localhost:3001'/g,
    replacement: "process.env.API_BASE_URL || 'http://localhost:3001'"
  },
  
  // Database URLs (only in config files)
  {
    pattern: /"postgresql:\/\/postgres:23044943@localhost:5432\/ars_db"/g,
    replacement: 'process.env.DATABASE_URL || "postgresql://postgres:23044943@localhost:5432/ars_db"'
  },
  {
    pattern: /'postgresql:\/\/postgres:23044943@localhost:5432\/arsdb'/g,
    replacement: "process.env.DATABASE_URL || 'postgresql://postgres:23044943@localhost:5432/arsdb'"
  },
  {
    pattern: /"postgresql:\/\/postgres:23044943@localhost:5432\/arsdb"/g,
    replacement: 'process.env.DATABASE_URL || "postgresql://postgres:23044943@localhost:5432/arsdb"'
  },
  
  // Redis URLs
  {
    pattern: /'redis:\/\/localhost:6379\/0'/g,
    replacement: "process.env.REDIS_URL || 'redis://localhost:6379/0'"
  },
  
  // Company URLs (make configurable)
  {
    pattern: /'https:\/\/company\.sharepoint\.com'/g,
    replacement: "process.env.SHAREPOINT_URL || 'https://company.sharepoint.com'"
  },
  {
    pattern: /'https:\/\/external-system\.com\/webhooks\/documents'/g,
    replacement: "process.env.EXTERNAL_WEBHOOK_URL || 'https://external-system.com/webhooks/documents'"
  },
  {
    pattern: /'https:\/\/crm-system\.com\/api\/document-notifications'/g,
    replacement: "process.env.CRM_NOTIFICATION_URL || 'https://crm-system.com/api/document-notifications'"
  },
  {
    pattern: /'https:\/\/your-domain\.com'/g,
    replacement: "process.env.ALLOWED_ORIGINS || 'https://your-domain.com'"
  }
];

// Files to exclude from processing
const excludeFiles = [
  'package-lock.json',
  'node_modules',
  '.git',
  'dist',
  'uploads',
  'exports'
];

function shouldProcessFile(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath);
  
  // Skip excluded files
  if (excludeFiles.some(exclude => filePath.includes(exclude))) {
    return false;
  }
  
  // Only process source files
  return ['.js', '.ts', '.py', '.env'].includes(ext) && 
         !fileName.includes('package-lock') &&
         !fileName.includes('.min.');
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    urlReplacements.forEach(({ pattern, replacement }) => {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${path.relative(__dirname, filePath)}`);
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

// Update environment files
function updateEnvFiles() {
  const envUpdates = [
    {
      file: 'server/.env',
      additions: [
        '# External APIs',
        'TUNICLAIM_API_URL=http://197.14.56.112:8083/api',
        'FRONTEND_CALLBACK_URL=http://localhost:3000/auth/outlook/callback',
        'SERVER_URL=http://localhost:5000',
        '',
        '# External Services',
        'SHAREPOINT_URL=https://company.sharepoint.com',
        'EXTERNAL_WEBHOOK_URL=https://external-system.com/webhooks/documents',
        'CRM_NOTIFICATION_URL=https://crm-system.com/api/document-notifications',
        'ALLOWED_ORIGINS=https://your-domain.com'
      ]
    },
    {
      file: 'ai-microservice/.env',
      additions: [
        '# External APIs',
        'TUNICLAIM_API_URL=http://197.14.56.112:8083/api',
        'SERVER_URL=http://localhost:5000'
      ]
    }
  ];
  
  envUpdates.forEach(({ file, additions }) => {
    const filePath = path.join(__dirname, file);
    
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Check if additions already exist
      const needsUpdate = additions.some(line => 
        line.includes('=') && !content.includes(line.split('=')[0])
      );
      
      if (needsUpdate) {
        content += '\n\n' + additions.join('\n') + '\n';
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated: ${file}`);
      }
    }
  });
}

// Main execution
console.log('🔧 Fixing hardcoded URLs in backend...\n');

const backendDirs = ['server/src', 'ai-microservice'];
let totalFixed = 0;

backendDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  
  if (fs.existsSync(dirPath)) {
    console.log(`📁 Processing ${dir}/`);
    const fixed = processDirectory(dirPath);
    totalFixed += fixed;
    console.log(`   Fixed ${fixed} files\n`);
  }
});

// Update environment files
console.log('📝 Updating environment files...');
updateEnvFiles();

console.log(`\n🎉 Complete! Fixed ${totalFixed} files`);
console.log('\n💡 Next steps:');
console.log('- Review the changes and test your application');
console.log('- Update your deployment environment variables');
console.log('- Consider creating different .env files for different environments');