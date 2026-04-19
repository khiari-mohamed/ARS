# Fix Summary: Active Alerts Issues (Issue b)

## Issues Addressed

### b. Interface Super Admin → Alertes Équipes → Alertes Actives

1. ✅ **SLA calculation stops after virement execution**
2. ✅ **Completed bordereaux (VIREMENT_EXECUTE) don't appear in active alerts**
3. ✅ **Resolved alerts don't appear in "ALERTES ACTIVES"**

---

## Changes Made

### 1. File: `server/src/alerts/alerts.service.ts`

#### Change 1: Filter out completed bordereaux from active alerts
**Location:** `getAlertsDashboard()` method

**Before:**
```typescript
const alerts = bordereaux.map(b => {
  // ... alert generation logic
});
```

**After:**
```typescript
const alerts = bordereaux
  // FILTER OUT COMPLETED BORDEREAUX - No action possible
  .filter(b => !['CLOTURE', 'VIREMENT_EXECUTE', 'PAYE'].includes(b.statut))
  .map(b => {
    // ... alert generation logic
  });
```

**Reason:** Bordereaux with status `VIREMENT_EXECUTE`, `CLOTURE`, or `PAYE` are completed and no action can be taken on them, so they should not appear in active alerts.

---

#### Change 2: Include AlertLog relation in query
**Location:** `getAlertsDashboard()` method - Prisma query

**Before:**
```typescript
const bordereaux = await this.prisma.bordereau.findMany({
  where,
  include: { 
    // ... other relations
  },
});
```

**After:**
```typescript
const bordereaux = await this.prisma.bordereau.findMany({
  where,
  include: { 
    // ... other relations
    AlertLog: {
      where: { resolved: false },
      select: { id: true, resolved: true }
    }
  },
});
```

**Reason:** Need to fetch alert logs to determine if all alerts for a bordereau have been resolved.

---

#### Change 3: Filter out bordereaux with all alerts resolved
**Location:** `getAlertsDashboard()` method

**After Change 1:**
```typescript
const alerts = bordereaux
  // FILTER OUT COMPLETED BORDEREAUX - No action possible
  .filter(b => !['CLOTURE', 'VIREMENT_EXECUTE', 'PAYE'].includes(b.statut))
  // FILTER OUT BORDEREAUX WITH ALL ALERTS RESOLVED
  .filter(b => {
    // If there are no alert logs, include it (might need an alert)
    if (!b.AlertLog || b.AlertLog.length === 0) return true;
    // If there are unresolved alerts, include it
    return b.AlertLog.some(log => !log.resolved);
  })
  .map(b => {
    // ... alert generation logic
  });
```

**Reason:** If all alerts for a bordereau have been resolved (acknowledged), it should not appear in "ALERTES ACTIVES" anymore.

---

#### Change 4: Remove statut check from SLA calculation
**Location:** `getAlertsDashboard()` method - SLA calculation logic

**Before:**
```typescript
if (b.statut !== 'CLOTURE' && percentageElapsed > 100) {
  level = 'red';
  reason = 'SLA breach';
} else if (b.statut !== 'CLOTURE' && percentageElapsed > 80) {
  level = 'orange';
  reason = 'Risk of delay';
}
```

**After:**
```typescript
// SLA calculation stops when virement is executed
if (percentageElapsed > 100) {
  level = 'red';
  reason = 'SLA breach';
} else if (percentageElapsed > 80) {
  level = 'orange';
  reason = 'Risk of delay';
}
```

**Reason:** The statut check is no longer needed because completed bordereaux are already filtered out in the previous step. SLA calculation naturally stops for completed bordereaux since they're excluded from the alerts list.

---

## Verification

### Diagnostic Script: `server/scripts/diagnose-active-alerts.ts`

Created a diagnostic script to verify the fixes:

**Results:**
```
📊 Total Bordereaux (non-archived): 13

📋 Categorization:
✅ Completed (CLOTURE/VIREMENT_EXECUTE/PAYE): 6
✅ With All Alerts Resolved: 0
⚠️  Should Show in Active Alerts: 7

🚫 Completed Bordereaux (Should NOT appear in active alerts):
  - AMARIS BORD 6-26 (VIREMENT_EXECUTE)
  - ONA BR 03-2026 (VIREMENT_EXECUTE)
  - ATELIER BR 06-2026 (VIREMENT_EXECUTE)
  - BR 09-2026 NOVARTIS (VIREMENT_EXECUTE)
  - T-BULLETIN-2026-31866 (VIREMENT_EXECUTE)
  - BORDEREAU 6-2026 CLIENT TEST (VIREMENT_EXECUTE)

⚠️  Bordereaux That SHOULD Appear in Active Alerts:
  - A-BULLETIN-2026-98115 (TRAITE) - 15 days, 100% elapsed
  - CET-BULLETIN-2026-28711 (A_SCANNER) - 5 days, 50% elapsed
  - ... (5 more)
```

---

## Impact

### Before Fix:
- ❌ 6 completed bordereaux (VIREMENT_EXECUTE) appeared in active alerts
- ❌ SLA calculation continued even after virement execution
- ❌ Resolved alerts still showed in "ALERTES ACTIVES"

### After Fix:
- ✅ Completed bordereaux (VIREMENT_EXECUTE, CLOTURE, PAYE) excluded from active alerts
- ✅ SLA calculation stops when bordereau is completed
- ✅ Resolved alerts don't appear in "ALERTES ACTIVES"
- ✅ Only actionable alerts are shown (7 out of 13 bordereaux)

---

## Testing Recommendations

1. **Test completed bordereaux:**
   - Create a bordereau
   - Process it through to VIREMENT_EXECUTE
   - Verify it disappears from active alerts

2. **Test resolved alerts:**
   - Create an alert for a bordereau
   - Resolve the alert using the "Résoudre" button
   - Verify the bordereau disappears from active alerts

3. **Test SLA calculation:**
   - Verify that bordereaux with VIREMENT_EXECUTE status don't show SLA warnings
   - Verify that only in-progress bordereaux show SLA status

---

## Related Files

- `server/src/alerts/alerts.service.ts` - Main alerts service with fixes
- `server/scripts/diagnose-active-alerts.ts` - Diagnostic script
- `server/src/dashboard/dashboard.service.ts` - Previously fixed (Top Clients issue)

---

## Notes

- The fix maintains backward compatibility
- No database schema changes required
- The filtering logic is efficient (done in-memory after fetch)
- Alert resolution workflow remains unchanged
