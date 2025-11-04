# Alert Module Fixes - Duplicate Alerts Resolution

## Problem Identified
The alert system was generating duplicate alerts in the history table because:
1. The scheduler was updating `createdAt` timestamp on existing alerts, making them appear as new entries
2. The `notify()` function was creating duplicate alert logs without checking for existing alerts
3. Team overload detection had very low thresholds (>1 dossier = critical)
4. Reclamation alerts were showing all courriers instead of actual reclamations

## Changes Made

### 1. Fixed Alert Scheduler (`alert-scheduler.service.ts`)
**Location:** `d:\ARS\server\src\alerts\alert-scheduler.service.ts`

**Change:** Modified `createOrUpdateAlert()` method
- **Before:** Updated `createdAt` timestamp when updating existing alerts
- **After:** Only updates `message` and `alertLevel`, preserves original `createdAt`
- **Impact:** Prevents duplicate entries in alert history

```typescript
// OLD CODE (REMOVED):
createdAt: new Date() // Update timestamp for repeat alerts

// NEW CODE:
// DO NOT update createdAt - keep original timestamp
```

### 2. Fixed Alert Notification (`alerts.service.ts`)
**Location:** `d:\ARS\server\src\alerts\alerts.service.ts`

**Change:** Added duplicate check in `notify()` method
- **Before:** Created alert log every time without checking
- **After:** Checks for existing unresolved alert with same message before creating
- **Impact:** Eliminates duplicate generic alerts

```typescript
// Added duplicate check
const existingAlert = await this.prisma.alertLog.findFirst({
  where: {
    bordereauId: alert.bordereau?.id || alert.bordereauId || null,
    alertType: alert.type || 'GENERIC',
    resolved: false,
    message
  }
});

// Only create if doesn't exist
if (!existingAlert) {
  await this.prisma.alertLog.create({ ... });
}
```

### 3. Fixed Team Overload Detection
**Location:** `d:\ARS\server\src\alerts\alerts.service.ts`

**Changes:**
- Only checks CHEF_EQUIPE role (not GESTIONNAIRE)
- Uses capacity-based thresholds (80% = warning, 120% = critical)
- Only counts bordereaux with status NOT IN ['CLOTURE', 'PAYE']
- Removed automatic notifications that were creating duplicate alerts

**Before:**
```typescript
if (count > 1) { // Critical at 2 dossiers
  alert: 'red'
}
```

**After:**
```typescript
const utilizationRate = (count / capacity) * 100;
if (utilizationRate > 120) { // Critical at 120% capacity
  alert: 'red'
} else if (utilizationRate > 80) { // Warning at 80% capacity
  alert: 'orange'
}
```

### 4. Fixed Reclamation Alerts
**Location:** `d:\ARS\server\src\alerts\alerts.service.ts`

**Change:** Use Reclamation table instead of Courrier table
- **Before:** Showed all courriers as reclamations
- **After:** Only shows actual reclamations from Reclamation table
- **Filter:** Only SENT, DRAFT, PENDING status
- **Severity:** Maps HIGH severity to red alert, others to orange

```typescript
// OLD: Used Courrier table
const reclamations = await this.prisma.courrier.findMany({ ... });

// NEW: Uses Reclamation table
const reclamations = await this.prisma.reclamation.findMany({ 
  where: { 
    createdAt: { gte: thirtyDaysAgo },
    status: { in: ['SENT', 'DRAFT', 'PENDING'] }
  }
});
```

## Database Schema Reference

### AlertLog Table
```prisma
model AlertLog {
  id            String     @id @default(uuid())
  bordereauId   String?
  documentId    String?
  userId        String?
  alertType     String     // SLA_BREACH, TEAM_OVERLOAD, etc.
  alertLevel    String     // red, orange, green
  message       String
  notifiedRoles String[]
  createdAt     DateTime   @default(now())
  resolved      Boolean    @default(false)
  resolvedAt    DateTime?
}
```

## Testing Recommendations

1. **Clear Existing Duplicate Alerts:**
```sql
-- Delete duplicate alerts keeping only the oldest one
DELETE FROM "AlertLog" a
WHERE a.id NOT IN (
  SELECT MIN(id) 
  FROM "AlertLog" 
  GROUP BY "bordereauId", "alertType", "message"
);
```

2. **Monitor Alert Creation:**
- Check alert history after 10 minutes (scheduler runs every 10 min)
- Verify no duplicate entries with same bordereauId + alertType
- Confirm createdAt timestamps are not being updated

3. **Verify Team Overload:**
- Create test team with capacity = 10
- Assign 9 bordereaux (should show no alert)
- Assign 11 bordereaux (should show orange alert at 110%)
- Assign 13 bordereaux (should show red alert at 130%)

4. **Verify Reclamation Alerts:**
- Create test reclamation with status = 'SENT'
- Should appear in reclamation alerts
- Courriers should NOT appear in reclamation alerts

## Expected Behavior After Fixes

### Alert History Table
- ✅ No duplicate alerts with same bordereauId + alertType
- ✅ createdAt timestamp remains unchanged for existing alerts
- ✅ Only message and alertLevel are updated
- ✅ Each unique alert appears only once until resolved

### Team Overload Alerts
- ✅ Only shows CHEF_EQUIPE teams
- ✅ Uses capacity-based calculation
- ✅ Warning at 80% capacity
- ✅ Critical at 120% capacity
- ✅ No alerts for normal workload (<80%)

### Reclamation Alerts
- ✅ Shows only actual reclamations from Reclamation table
- ✅ Filters by status: SENT, DRAFT, PENDING
- ✅ Color-coded by severity (HIGH = red, others = orange)
- ✅ Limited to last 30 days, max 10 items

## Files Modified

1. `d:\ARS\server\src\alerts\alert-scheduler.service.ts`
2. `d:\ARS\server\src\alerts\alerts.service.ts`

## No Changes Required

- Frontend components (already working correctly)
- Database schema (no migration needed)
- API endpoints (no changes to contracts)
- Alert types and levels (remain the same)

## Rollback Instructions

If issues occur, revert changes using:
```bash
git checkout HEAD -- server/src/alerts/alert-scheduler.service.ts
git checkout HEAD -- server/src/alerts/alerts.service.ts
```

## Next Steps

1. Restart the backend server
2. Monitor alert creation for 30 minutes
3. Verify no duplicates in AlertLog table
4. Check team overload calculations are accurate
5. Confirm reclamation alerts show correct data
