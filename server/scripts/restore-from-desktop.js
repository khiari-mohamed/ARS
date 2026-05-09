const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_FOLDER = 'C:\\Users\\LENOVO\\Desktop\\table_backups';
const DB_CONFIG = {
  host: 'localhost',
  port: '5432',
  user: 'postgres',
  password: '23044943',
  database: 'ars_db'
};

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
      console.log(`⚠️  ${filename} not found`);
      resolve();
      return;
    }

    const tableName = filename.replace('.sql', '');
    console.log(`📥 Restoring ${tableName}...`);

    const env = { ...process.env, PGPASSWORD: DB_CONFIG.password };
    const command = `psql -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} -f "${filePath}"`;

    exec(command, { env }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error: ${stderr}`);
        reject(error);
      } else {
        console.log(`✅ ${tableName} restored`);
        resolve();
      }
    });
  });
}

async function restoreAllTables() {
  console.log('\n🚀 Starting restore from:', BACKUP_FOLDER);
  console.log('='.repeat(60));

  if (!fs.existsSync(BACKUP_FOLDER)) {
    console.error(`❌ Folder not found!`);
    return;
  }

  const files = fs.readdirSync(BACKUP_FOLDER).filter(f => f.endsWith('.sql'));
  console.log(`📋 Found ${files.length} SQL files\n`);

  for (const filename of RESTORE_ORDER) {
    try {
      await restoreTable(filename);
    } catch (error) {
      console.error(`Failed: ${filename}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Restore complete!\n');
}

restoreAllTables();
