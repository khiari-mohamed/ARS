# 🔧 SLA Data Fix Script

## Purpose
This script fixes SLA data in the database for bordereaux that have executed virements but show incorrect SLA status.

## What It Does

### ✅ Safe Operations
1. **Finds** bordereaux with `VIREMENT_EXECUTE` or `PAYE` status
2. **Checks** if they have executed `OrdreVirement` records
3. **Calculates** correct SLA based on virement execution date
4. **Updates** only bordereaux where SLA is currently wrong
5. **Skips** all other bordereaux (leaves them untouched)

### 🎯 What Gets Fixed
- Bordereaux with executed virements that show wrong SLA
- Missing `dateExecutionVirement` field (sets it from OrdreVirement)
- Only bordereaux with status `VIREMENT_EXECUTE` or `PAYE`

### 🛡️ Safety Features
- **Dry run by default** - Shows what would be changed without making changes
- **Detailed analysis** - Shows before/after comparison
- **5-second countdown** - When running in execute mode
- **Error handling** - Continues on errors, reports at end
- **Validation** - Only updates if difference > 1 day

## Usage

### 1. Dry Run (Safe - No Changes)
```bash
cd d:\ARS
node fix-sla-data.js
```

This will:
- ✅ Analyze all bordereaux with executed virements
- ✅ Show which ones need fixing
- ✅ Display before/after SLA values
- ❌ NOT make any changes to database

### 2. Execute (Apply Changes)
```bash
cd d:\ARS
node fix-sla-data.js --execute
```

This will:
- ⚠️ Show 5-second countdown (press Ctrl+C to cancel)
- ✅ Apply fixes to database
- ✅ Update `dateExecutionVirement` where missing
- ✅ Show detailed results

## Example Output

```
========================================
🔧 SLA Data Fix Script
========================================

⚠️  DRY RUN MODE - No changes will be made
Run with --execute flag to apply changes

📊 Step 1: Finding bordereaux with executed virements...
✅ Found 45 bordereaux with executed virements

📊 Step 2: Analyzing SLA data...

📈 Analysis Results:
   ✅ Already correct: 30
   🔧 Need fixing: 12
   ⚠️  No freeze date: 3

🔍 Bordereaux that need fixing:
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Reference            | Client                    | Status               | Wrong SLA       | Correct SLA     | Freeze Date 
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
BRD-2024-001        | ASSURANCE SANTE          | VIREMENT_EXECUTE     | 45d 🔴 OVERDUE | 18d 🟢 ON_TIME | 2024-03-15  
BRD-2024-002        | MUTUELLE GENERALE        | PAYE                 | 52d 🔴 OVERDUE | 22d 🟢 ON_TIME | 2024-03-20  
BRD-2024-003        | PREVOYANCE PLUS          | VIREMENT_EXECUTE     | 38d 🔴 OVERDUE | 25d 🟡 AT_RISK | 2024-03-25  
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

ℹ️  Dry run complete. Run with --execute to apply changes.

========================================
📊 Summary
========================================
Total bordereaux analyzed: 45
Already correct: 30
Fixed (or would fix): 12
Skipped (no freeze date): 3
========================================

✅ Script completed successfully!
```

## What Gets Updated in Database

The script updates the `Bordereau` table:

```sql
UPDATE "Bordereau"
SET "dateExecutionVirement" = [freeze_date_from_OrdreVirement]
WHERE id = [bordereau_id]
  AND "dateExecutionVirement" IS NULL
  AND ("statut" = 'VIREMENT_EXECUTE' OR "statut" = 'PAYE');
```

**Note:** The script does NOT store `daysElapsed` in the database. The SLA calculation is done in the code (already fixed). This script only ensures `dateExecutionVirement` is set correctly.

## Validation Logic

A bordereau needs fixing if:
1. ✅ Status is `VIREMENT_EXECUTE` or `PAYE`
2. ✅ Has at least one executed `OrdreVirement`
3. ✅ Current SLA calculation differs by more than 1 day from correct SLA
4. ✅ Has a valid freeze date (from virement execution)

## Safety Checks

- ✅ Only touches bordereaux with executed virements
- ✅ Validates freeze date exists before updating
- ✅ Checks difference > 1 day before marking as "needs fix"
- ✅ Dry run by default
- ✅ 5-second countdown in execute mode
- ✅ Continues on individual errors
- ✅ Reports all errors at end

## Troubleshooting

### "No freeze date found"
This means the bordereau has status `VIREMENT_EXECUTE` or `PAYE` but:
- No `dateExecutionVirement` set
- No executed `OrdreVirement` records
- No `dateCloture` available

**Solution:** Manually investigate these bordereaux - they may have data issues.

### "Already correct"
The bordereau already has correct SLA data. No action needed.

### Script fails to connect
Make sure:
1. PostgreSQL is running
2. Database credentials in `.env` are correct
3. You're in the correct directory (`d:\ARS`)

## Rollback

If you need to rollback changes:

```sql
-- Backup before running script
pg_dump arsdb > backup_before_sla_fix.sql

-- Restore if needed
psql arsdb < backup_before_sla_fix.sql
```

## Testing

1. **Test on staging first**
   ```bash
   # Copy production data to staging
   pg_dump arsdb_prod | psql arsdb_staging
   
   # Run script on staging
   cd d:\ARS
   node fix-sla-data.js --execute
   ```

2. **Verify results**
   ```sql
   -- Check updated bordereaux
   SELECT 
     reference,
     statut,
     "dateReception",
     "dateExecutionVirement",
     "delaiReglement"
   FROM "Bordereau"
   WHERE "statut" IN ('VIREMENT_EXECUTE', 'PAYE')
     AND "dateExecutionVirement" IS NOT NULL
   ORDER BY "dateReception" DESC
   LIMIT 20;
   ```

3. **Test in application**
   - Open bordereau detail page
   - Verify SLA shows frozen status
   - Check dashboard analytics

## Support

If you encounter issues:
1. Run in dry-run mode first
2. Check the output for errors
3. Verify database connection
4. Check Prisma schema matches database
5. Review logs for detailed error messages
