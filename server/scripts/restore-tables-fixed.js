const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Correct path - table_backups is in ARS root, not server folder
const BACKUP_FOLDER = path.join(__dirname, '..', 'table_backups');
const DB_CONFIG = {
  host: 'localhost',
  port: '5432',
  user: 'postgres',
  password: '23044943',
  database: 'ars_db'
};

// Order matters - restore in correct dependency order
const RESTORE_ORDER = [
  'User.sql',
  'CompagnieAssurance.sql',
  'Client.sql',
  'Contract.sql',
  'ContractHistory.sql',
  'Bordereau.sql',
  'Document.sql',
  'DocumentAssignmentHistory.sql',
  'TraitementHistory.sql',
  'ActionLog.sql',
  'AlertLog.sql',
  'AuditLog.sql',
  'Notification.sql',
  'WorkflowNotification.sql',
  'AiOutput.sql',
  'SyncLog.sql',
  '_prisma_migrations.sql'
];

async function restoreTable(filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(BACKUP_FOLDER, filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${filename} not found at ${filePath}`);
      resolve();
      return;
    }

    const tableName = filename.replace('.sql', '');
    console.log(`📥 Restoring ${tableName}...`);

    const env = { ...process.env, PGPASSWORD: DB_CONFIG.password };
    const command = `psql -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} -f "${filePath}"`;

    exec(command, { env }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error restoring ${tableName}:`, stderr);
        reject(error);
      } else {
        console.log(`✅ ${tableName} restored successfully`);
        resolve();
      }
    });
  });
}

async function restoreAllTables() {
  console.log('\n🚀 Starting database restore...');
  console.log(`📁 Backup folder: ${BACKUP_FOLDER}\n`);
  console.log('='.repeat(60));

  // Check if folder exists
  if (!fs.existsSync(BACKUP_FOLDER)) {
    console.error(`❌ Backup folder not found: ${BACKUP_FOLDER}`);
    return;
  }

  // List all SQL files found
  const files = fs.readdirSync(BACKUP_FOLDER).filter(f => f.endsWith('.sql'));
  console.log(`📋 Found ${files.length} SQL files:\n`, files.join(', '));
  console.log('='.repeat(60) + '\n');

  for (const filename of RESTORE_ORDER) {
    try {
      await restoreTable(filename);
    } catch (error) {
      console.error(`Failed to restore ${filename}, continuing...`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Database restore complete!\n');
}

restoreAllTables();
