# OV Notification Flow - Debug Guide

## Issue
Company reports that OV validation notifications (bell icon) work on local but NOT on hosted version.

## How It Should Work

### 1. OV Creation Flow
```
Chef Équipe creates OV 
  → OV status = 'EN_ATTENTE_VALIDATION'
  → Backend calls: notifyResponsableEquipeForValidation()
  → Creates notification with type: 'OV_PENDING_VALIDATION'
  → Notification sent to all RESPONSABLE_DEPARTEMENT users
```

### 2. Notification Display Flow
```
Frontend MainLayout.tsx
  → Polls /users/{userId}/notifications every 30s
  → Filters notifications by type
  → Shows bell icon with unread count
  → Click notification → Opens OVValidationModal
```

### 3. Validation Flow
```
Responsable clicks notification
  → Opens OVValidationModal
  → Shows OV details
  → Approve/Reject buttons
  → Calls: PUT /finance/validation/{ovId}
  → Updates OV validationStatus
  → Notifies Chef Équipe
```

## Files Involved

### Backend
- `server/src/finance/finance.service.ts` - Line ~1850: `notifyResponsableEquipeForValidation()`
- `server/src/finance/finance.controller.ts` - Line ~700: `/finance/notify-responsable-equipe` endpoint
- `server/src/finance/finance.controller.ts` - Line ~750: `/finance/validation/:id` endpoint

### Frontend
- `frontend/src/layouts/MainLayout.tsx` - Lines 95-110: Notification polling
- `frontend/src/layouts/MainLayout.tsx` - Lines 140-150: Notification click handler
- `frontend/src/components/Finance/OVValidationModal.tsx` - Validation modal
- `frontend/src/components/Finance/OVValidationTab.tsx` - Validation tab

## Checklist for Debugging

### On Hosted Server

#### 1. Check Database
```sql
-- Check if notifications are being created
SELECT * FROM "Notification" 
WHERE type = 'OV_PENDING_VALIDATION' 
ORDER BY "createdAt" DESC 
LIMIT 10;

-- Check if RESPONSABLE_DEPARTEMENT users exist
SELECT id, email, role, active 
FROM "User" 
WHERE role = 'RESPONSABLE_DEPARTEMENT';

-- Check pending OVs
SELECT id, reference, "validationStatus", "dateCreation"
FROM "OrdreVirement"
WHERE "validationStatus" = 'EN_ATTENTE_VALIDATION'
ORDER BY "dateCreation" DESC;
```

#### 2. Check Backend Logs
Look for these log messages:
```
✅ Notified X RESPONSABLE_DEPARTEMENT users for OV {reference}
🔍 getPendingValidationOVs called for user: {role}
✅ OV validé avec succès
```

#### 3. Check API Endpoints (use Postman/curl)

**Get Notifications:**
```bash
curl -H "Authorization: Bearer {token}" \
  https://197.14.56.112:8083/api/users/{userId}/notifications
```

**Get Pending OVs:**
```bash
curl -H "Authorization: Bearer {token}" \
  https://197.14.56.112:8083/api/finance/ordres-virement/pending-validation
```

**Validate OV:**
```bash
curl -X PUT \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"approved": true, "comment": "Test"}' \
  https://197.14.56.112:8083/api/finance/validation/{ovId}
```

#### 4. Check Frontend Console
Open browser DevTools → Console, look for:
```
🔍 Loading pending OVs...
✅ Pending OVs loaded: [...]
Using fallback notification system
```

#### 5. Check Network Tab
- Is `/users/{userId}/notifications` being called every 30s?
- What is the response status? 200? 401? 500?
- What data is returned?

## Common Issues & Solutions

### Issue 1: No RESPONSABLE_DEPARTEMENT users
**Symptom:** Notifications not created
**Solution:** Create user with role 'RESPONSABLE_DEPARTEMENT'
```sql
UPDATE "User" SET role = 'RESPONSABLE_DEPARTEMENT' WHERE email = 'responsable@ars.tn';
```

### Issue 2: CORS/Auth issues on hosted
**Symptom:** 401/403 errors in network tab
**Solution:** Check .env.production has correct API_URL

### Issue 3: Polling not working
**Symptom:** No network requests every 30s
**Solution:** Check if user is logged in, check MainLayout is mounted

### Issue 4: Wrong notification type
**Symptom:** Notifications created but not showing
**Solution:** Verify notification type is exactly 'OV_PENDING_VALIDATION'

### Issue 5: Database connection
**Symptom:** Backend errors when creating notifications
**Solution:** Check Prisma connection, check database credentials

## Test Script

Run this on the server:
```bash
cd /path/to/ARS
node test-ov-notification-flow.js
```

## Environment Variables to Check

### Backend (.env.production)
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
PORT=5000
```

### Frontend (.env.production)
```
REACT_APP_API_URL=https://197.14.56.112:8083/api
```

## Quick Fix if Notifications Stuck

If notifications exist but not showing:
```sql
-- Mark all as unread to force refresh
UPDATE "Notification" 
SET read = false 
WHERE type = 'OV_PENDING_VALIDATION' 
AND "userId" = '{responsable_user_id}';
```

## Contact Points

1. Check backend logs: `/var/log/ars-backend.log` or PM2 logs
2. Check frontend build: Verify .env.production was used
3. Check database: Verify notifications table has records
4. Check user role: Verify user has RESPONSABLE_DEPARTEMENT role
