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

Write-Host ""
Write-Host "Starting database restore..." -ForegroundColor Green
Write-Host "Backup folder: $backupFolder"
Write-Host "============================================================"

if (-Not (Test-Path $backupFolder)) {
    Write-Host "ERROR: Backup folder not found!" -ForegroundColor Red
    exit
}

$sqlFiles = Get-ChildItem -Path $backupFolder -Filter "*.sql"
Write-Host "Found $($sqlFiles.Count) SQL files"
Write-Host "============================================================"
Write-Host ""

foreach ($table in $tables) {
    $filePath = Join-Path $backupFolder $table
    
    if (Test-Path $filePath) {
        $tableName = $table -replace ".sql", ""
        Write-Host "Restoring $tableName..." -ForegroundColor Cyan
        
        psql -h $host -p $port -U $user -d $database -f $filePath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "SUCCESS: $tableName restored" -ForegroundColor Green
        } else {
            Write-Host "ERROR: Failed to restore $tableName" -ForegroundColor Red
        }
    } else {
        Write-Host "SKIP: $table not found" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "============================================================"
Write-Host "Database restore complete!" -ForegroundColor Green
Write-Host ""
