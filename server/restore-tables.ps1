$env:PGPASSWORD = "23044943"
$backupFolder = "D:\ARS\table_backups"
$host = "localhost"
$port = "5432"
$user = "postgres"
$database = "ars_db"

$tables = @(
    "User.sql",
    "CompagnieAssurance.sql",
    "Client.sql",
    "Contract.sql",
    "ContractHistory.sql",
    "Bordereau.sql",
    "Document.sql",
    "DocumentAssignmentHistory.sql",
    "TraitementHistory.sql",
    "ActionLog.sql",
    "AlertLog.sql",
    "AuditLog.sql",
    "Notification.sql",
    "WorkflowNotification.sql",
    "AiOutput.sql",
    "SyncLog.sql",
    "_prisma_migrations.sql"
)

Write-Host "`n🚀 Starting database restore...`n" -ForegroundColor Green
Write-Host ("=" * 60)

foreach ($table in $tables) {
    $filePath = Join-Path $backupFolder $table
    
    if (Test-Path $filePath) {
        $tableName = $table -replace ".sql", ""
        Write-Host "📥 Restoring $tableName..." -ForegroundColor Cyan
        
        psql -h $host -p $port -U $user -d $database -f $filePath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $tableName restored successfully" -ForegroundColor Green
        } else {
            Write-Host "❌ Error restoring $tableName" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️  $table not found, skipping..." -ForegroundColor Yellow
    }
}

Write-Host "`n" ("=" * 60)
Write-Host "✅ Database restore complete!`n" -ForegroundColor Green
