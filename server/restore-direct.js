const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const BACKUP_FOLDER = 'C:\\Users\\LENOVO\\Desktop\\table_backups';
const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
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

async function restoreTable(client, filename) {
  const filePath = path.join(BACKUP_FOLDER, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${filename} not found`);
    return;
  }

  const tableName = filename.replace('.sql', '');
  console.log(`📥 Restoring ${tableName}...`);

  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    await client.query(sql);
    console.log(`✅ ${tableName} restored`);
  } catch (error) {
    console.error(`❌ ${tableName} failed:`, error.message);
  }
}

async function restoreAllTables() {
  console.log('\n🚀 Starting restore from:', BACKUP_FOLDER);
  console.log('='.repeat(60));

  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    for (const filename of RESTORE_ORDER) {
      await restoreTable(client, filename);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Restore complete!\n');
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  } finally {
    await client.end();
  }
}

restoreAllTables();
