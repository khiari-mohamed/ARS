# ============================================================================
# PostgreSQL Full Database Backup Script
# Run this on the SERVER via PowerShell
# ============================================================================

Write-Host "🔄 PostgreSQL Full Database Backup Script" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Gray

# Configuration
$DB_NAME = "ars_db"
$DB_USER = "postgres"
$DB_HOST = "localhost"
$DB_PORT = "5432"
$BACKUP_DIR = "C:\Backups"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "$BACKUP_DIR\ars_full_backup_$TIMESTAMP.backup"
$SQL_FILE = "$BACKUP_DIR\ars_full_backup_$TIMESTAMP.sql"

# Find PostgreSQL installation
$PG_PATHS = @(
    "C:\Program Files\PostgreSQL\16\bin",
    "C:\Program Files\PostgreSQL\15\bin",
    "C:\Program Files\PostgreSQL\14\bin",
    "C:\Program Files (x86)\PostgreSQL\16\bin",
    "C:\Program Files (x86)\PostgreSQL\15\bin"
)

$PG_BIN = $null
foreach ($path in $PG_PATHS) {
    if (Test-Path "$path\pg_dump.exe") {
        $PG_BIN = $path
        Write-Host "✅ Found PostgreSQL at: $path" -ForegroundColor Green
        break
    }
}

if (-not $PG_BIN) {
    Write-Host "❌ ERROR: PostgreSQL not found!" -ForegroundColor Red
    Write-Host "Please install PostgreSQL or update the paths in the script." -ForegroundColor Yellow
    exit 1
}

# Create backup directory
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
    Write-Host "📁 Created backup directory: $BACKUP_DIR" -ForegroundColor Green
}

Write-Host "`n📊 Backup Configuration:" -ForegroundColor Cyan
Write-Host "   Database: $DB_NAME"
Write-Host "   Host: $DB_HOST"
Write-Host "   User: $DB_USER"
Write-Host "   Backup Dir: $BACKUP_DIR"
Write-Host ("=" * 80) -ForegroundColor Gray

# Set PostgreSQL password (change this to your actual password)
$env:PGPASSWORD = "postgres"

Write-Host "`n🚀 Starting backup process..." -ForegroundColor Cyan

# ============================================================================
# Backup 1: Custom Format (for pg_restore)
# ============================================================================
Write-Host "`n📦 Creating Custom Format Backup..." -ForegroundColor Yellow
$pg_dump = "$PG_BIN\pg_dump.exe"

try {
    $arguments = @(
        "-h", $DB_HOST,
        "-p", $DB_PORT,
        "-U", $DB_USER,
        "-d", $DB_NAME,
        "-F", "c",  # Custom format
        "-b",       # Include blobs
        "-v",       # Verbose
        "-f", $BACKUP_FILE
    )
    
    Write-Host "   Command: pg_dump $($arguments -join ' ')" -ForegroundColor Gray
    
    & $pg_dump $arguments 2>&1 | ForEach-Object {
        if ($_ -match "processing") {
            Write-Host "   $_" -ForegroundColor Gray
        }
    }
    
    if (Test-Path $BACKUP_FILE) {
        $fileSize = (Get-Item $BACKUP_FILE).Length / 1MB
        Write-Host "   ✅ Custom backup created: $BACKUP_FILE" -ForegroundColor Green
        Write-Host "   📊 Size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Custom backup failed!" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Error: $_" -ForegroundColor Red
}

# ============================================================================
# Backup 2: SQL Format (plain text, most compatible)
# ============================================================================
Write-Host "`n📝 Creating SQL Format Backup..." -ForegroundColor Yellow

try {
    $arguments = @(
        "-h", $DB_HOST,
        "-p", $DB_PORT,
        "-U", $DB_USER,
        "-d", $DB_NAME,
        "-F", "p",  # Plain SQL format
        "-b",       # Include blobs
        "-v",       # Verbose
        "-f", $SQL_FILE
    )
    
    Write-Host "   Command: pg_dump $($arguments -join ' ')" -ForegroundColor Gray
    
    & $pg_dump $arguments 2>&1 | ForEach-Object {
        if ($_ -match "processing") {
            Write-Host "   $_" -ForegroundColor Gray
        }
    }
    
    if (Test-Path $SQL_FILE) {
        $fileSize = (Get-Item $SQL_FILE).Length / 1MB
        Write-Host "   ✅ SQL backup created: $SQL_FILE" -ForegroundColor Green
        Write-Host "   📊 Size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Green
    } else {
        Write-Host "   ❌ SQL backup failed!" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Error: $_" -ForegroundColor Red
}

# ============================================================================
# Verify Backups
# ============================================================================
Write-Host "`n🔍 Verifying Backups..." -ForegroundColor Cyan

$backups = @()
if (Test-Path $BACKUP_FILE) { $backups += $BACKUP_FILE }
if (Test-Path $SQL_FILE) { $backups += $SQL_FILE }

if ($backups.Count -eq 0) {
    Write-Host "❌ No backups were created!" -ForegroundColor Red
    exit 1
}

Write-Host "`n📋 Backup Summary:" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Gray

foreach ($backup in $backups) {
    $file = Get-Item $backup
    $sizeInMB = [math]::Round($file.Length / 1MB, 2)
    Write-Host "✅ $($file.Name)" -ForegroundColor Green
    Write-Host "   Path: $($file.FullName)"
    Write-Host "   Size: $sizeInMB MB"
    Write-Host "   Created: $($file.CreationTime)"
    Write-Host ""
}

# ============================================================================
# Create Info File
# ============================================================================
$infoFile = "$BACKUP_DIR\backup_info_$TIMESTAMP.txt"
@"
PostgreSQL Database Backup Information
========================================
Database: $DB_NAME
Host: $DB_HOST
Backup Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
PostgreSQL Version: $(& "$PG_BIN\pg_dump.exe" --version)

Files Created:
--------------
"@ | Out-File -FilePath $infoFile -Encoding UTF8

foreach ($backup in $backups) {
    $file = Get-Item $backup
    "- $($file.Name) ($([math]::Round($file.Length / 1MB, 2)) MB)" | Out-File -FilePath $infoFile -Append -Encoding UTF8
}

Write-Host "📝 Info file created: $infoFile" -ForegroundColor Green

# ============================================================================
# Instructions
# ============================================================================
Write-Host "`n" + ("=" * 80) -ForegroundColor Gray
Write-Host "✅ BACKUP COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host ("=" * 80) -ForegroundColor Gray

Write-Host "`n📥 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Copy the backup files to your local machine:"
Write-Host "   - $BACKUP_FILE" -ForegroundColor Yellow
Write-Host "   - $SQL_FILE" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. On your local machine, restore using:" -ForegroundColor Cyan
Write-Host "   pg_restore -h localhost -U postgres -d ars_db -v --clean `"$BACKUP_FILE`"" -ForegroundColor Yellow
Write-Host "   OR" -ForegroundColor Gray
Write-Host "   psql -h localhost -U postgres -d ars_db -f `"$SQL_FILE`"" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 Tip: Use the SQL file (.sql) if you have version compatibility issues" -ForegroundColor Cyan
Write-Host ""

# Clean up
$env:PGPASSWORD = $null

Write-Host "🎉 Done!`n" -ForegroundColor Green
