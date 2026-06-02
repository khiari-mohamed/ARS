# SAGE API Integration - Complete Implementation

## Overview
This document describes the complete SAGE API integration that automatically injects generated TXT accounting files into the SAGE accounting system via external API.

## Architecture

### Step 5: SAGE Integration (from workflow diagram)
```
┌──────────────────────────┐     ┌──────────────────────────┐
│     ACCOUNTING DEPT.     │ ──► │     SAGE (SYSTEM)        │
│                          │     │                          │
│  STEP 4                  │     │  STEP 5                  │
│  Accounting processing   │     │  SAGE integration        │
│                          │     │                          │
│  • Auto‑generate entries │     │  • Auto‑inject TXT file  │
│  • Export structured TXT │     │    via API               │
│  • Prepare for SAGE      │     │  • Real‑time or batch    │
│                          │     │                          │
└──────────────────────────┘     │  ✓ Entries integrated    │
                                 │    in SAGE               │
                                 └──────────────────────────┘
```

## Components

### 1. SageApiIntegrationService
**Location:** `d:/ARS/server/src/finance/sage-api-integration.service.ts`

**Responsibilities:**
- Generate TXT files using `SageTxtGenerationService`
- Send TXT content to SAGE external API
- Handle retries with exponential backoff
- Track integration status in database
- Update global workflow status

**Key Methods:**
- `integrateOrdreVirement(ovId, userId, templateId?)` - Real-time single OV integration
- `integrateBatch(ovIds[], userId, templateId?)` - Batch integration
- `checkIntegrationStatus(sageTransactionId)` - Check status in SAGE
- `getIntegrationHistory(ovId)` - Get integration history for an OV
- `testConnection()` - Test SAGE API connectivity

### 2. API Endpoints
**Location:** `d:/ARS/server/src/finance/finance.controller.ts`

#### Real-time Integration
```typescript
POST /finance/sage/integrate/:id
Body: { templateId?: string }
Role: FINANCE, SUPER_ADMIN
```

#### Batch Integration
```typescript
POST /finance/sage/integrate-batch
Body: { ordreVirementIds: string[], templateId?: string }
Role: FINANCE, SUPER_ADMIN
```

#### Check Integration Status
```typescript
GET /finance/sage/integration-status/:sageTransactionId
Role: FINANCE, SUPER_ADMIN
```

#### Get Integration History
```typescript
GET /finance/ordres-virement/:id/sage-integration-history
Role: FINANCE, SUPER_ADMIN
```

#### Test Connection
```typescript
GET /finance/sage/test-connection
Role: SUPER_ADMIN
```

#### Get Configuration
```typescript
GET /finance/sage/config
Role: SUPER_ADMIN
```

### 3. Database Schema
**Location:** `d:/ARS/server/prisma/schema.prisma`

#### SageIntegration Model
```prisma
model SageIntegration {
  id                String        @id @default(uuid())
  ordreVirementId   String
  sageTransactionId String?       // SAGE API transaction ID
  status            String        // "SUCCESS" | "FAILED" | "PENDING"
  errorMessage      String?       @db.Text
  integratedAt      DateTime      @default(now())
  integratedById    String
  ordreVirement     OrdreVirement @relation(fields: [ordreVirementId], references: [id])

  @@index([ordreVirementId])
  @@index([status])
  @@index([integratedAt])
}
```

## Configuration

### Environment Variables
Add to `.env` file:

```env
# SAGE API Configuration
SAGE_API_URL=http://localhost:8080/sage-api
SAGE_API_KEY=your-sage-api-key-here
SAGE_API_TIMEOUT=30000
SAGE_API_RETRY_ATTEMPTS=3
```

### SAGE API Endpoints (External)
The SAGE system must provide these endpoints:

#### 1. Import Accounting Entry
```
POST /api/accounting/import
Content-Type: application/json
X-API-Key: {API_KEY}

Request Body:
{
  "ordreVirementId": "uuid",
  "fileName": "2026ORDRE_DE_VIRMENTATT411-17042026-12_34.TXT",
  "codeJournal": "ATT411",
  "content": "ATT41101042026...",
  "timestamp": "2026-04-17T12:34:56.789Z"
}

Response:
{
  "success": true,
  "transactionId": "SAGE-TXN-12345",
  "message": "Accounting entry imported successfully"
}
```

#### 2. Check Import Status
```
GET /api/accounting/status/:transactionId
X-API-Key: {API_KEY}

Response:
{
  "transactionId": "SAGE-TXN-12345",
  "status": "COMPLETED",
  "processedAt": "2026-04-17T12:35:00.000Z",
  "entriesCreated": 2
}
```

#### 3. Health Check
```
GET /api/health
X-API-Key: {API_KEY}

Response:
{
  "status": "OK",
  "version": "1.0.0"
}
```

## Workflow

### Real-time Integration Flow
1. User clicks "Integrate to SAGE" button in UI
2. Frontend calls `POST /finance/sage/integrate/:id`
3. Service generates TXT file using `SageTxtGenerationService`
4. Service sends TXT content to SAGE API
5. SAGE API processes and returns transaction ID
6. Service creates `SageIntegration` record with status
7. Service updates `statutGlobal` to `INTEGRE_SAGE`
8. Frontend shows success/failure message

### Batch Integration Flow
1. User selects multiple OVs and clicks "Batch Integrate"
2. Frontend calls `POST /finance/sage/integrate-batch`
3. Service processes each OV sequentially
4. For each OV:
   - Generate TXT file
   - Send to SAGE API
   - Track result
5. Return batch summary with success/failure counts
6. Frontend shows batch results

### Error Handling
- **Retry Logic:** 3 attempts with exponential backoff (2s, 4s, 8s)
- **Timeout:** 30 seconds per request
- **Failure Tracking:** All failures logged in `SageIntegration` table
- **Status Updates:** Failed integrations don't update `statutGlobal`

## Business Rules

### Integration Prerequisites
1. OV must be in `COMPTABILISE` status (TXT file generated)
2. OV must have `recouvrementStatus = AUTORISE` (payment received)
3. OV must not be blocked (`recouvrementStatus != NON_AUTORISE`)

### Status Transitions
```
COMPTABILISE → (API Success) → INTEGRE_SAGE
COMPTABILISE → (API Failure) → COMPTABILISE (stays, can retry)
```

### Permissions
- **FINANCE Role:** Can integrate single or batch OVs
- **SUPER_ADMIN Role:** Can integrate + test connection + view config

## Frontend Integration

### ConfigurationsTab.tsx
**Location:** `d:/ARS/frontend/src/components/Sage/ConfigurationsTab.tsx`

The Configurations Sage tab now includes filters for:
- **Donneurs d'Ordre:** Nom, Code Journal, Compte Trésorerie, Compte Général Tiers
- **Clients:** Nom de client, Compte Auxiliaire Sage, Mode Récupération
- **Compagnies Assurance:** Nom Compagnies Assurance, Compte Général Sage

All filters are fully functional and apply to all 3 sub-tabs.

### Future UI Components (To Be Added)
1. **SAGE Integration Button** - In Recouvrement tab for single OV
2. **Batch Integration Button** - For multiple selected OVs
3. **Integration Status Badge** - Show SAGE integration status
4. **Integration History Modal** - View all integration attempts
5. **SAGE Connection Test** - Admin panel to test API connection

## Testing

### Manual Testing Steps
1. **Test Connection:**
   ```bash
   GET http://localhost:5000/api/finance/sage/test-connection
   Authorization: Bearer {token}
   ```

2. **Integrate Single OV:**
   ```bash
   POST http://localhost:5000/api/finance/sage/integrate/{ovId}
   Authorization: Bearer {token}
   Content-Type: application/json
   
   {}
   ```

3. **Integrate Batch:**
   ```bash
   POST http://localhost:5000/api/finance/sage/integrate-batch
   Authorization: Bearer {token}
   Content-Type: application/json
   
   {
     "ordreVirementIds": ["ov-id-1", "ov-id-2"]
   }
   ```

4. **Check Integration History:**
   ```bash
   GET http://localhost:5000/api/finance/ordres-virement/{ovId}/sage-integration-history
   Authorization: Bearer {token}
   ```

### Mock SAGE API (For Development)
Create a mock SAGE API server for testing:

```javascript
// mock-sage-api.js
const express = require('express');
const app = express();
app.use(express.json());

app.post('/api/accounting/import', (req, res) => {
  console.log('Received import request:', req.body);
  res.json({
    success: true,
    transactionId: `SAGE-TXN-${Date.now()}`,
    message: 'Accounting entry imported successfully'
  });
});

app.get('/api/accounting/status/:id', (req, res) => {
  res.json({
    transactionId: req.params.id,
    status: 'COMPLETED',
    processedAt: new Date().toISOString(),
    entriesCreated: 2
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', version: '1.0.0' });
});

app.listen(8080, () => {
  console.log('Mock SAGE API running on http://localhost:8080');
});
```

Run with: `node mock-sage-api.js`

## Database Migration

Run Prisma migration to add `SageIntegration` table:

```bash
cd server
npx prisma migrate dev --name add-sage-integration
npx prisma generate
```

## Monitoring & Logs

### Log Locations
- **Service Logs:** Check NestJS console output
- **Database Logs:** Query `SageIntegration` table
- **SAGE API Logs:** Check SAGE system logs

### Key Metrics to Monitor
- Integration success rate
- Average integration time
- Failed integration count
- Retry attempts per OV
- API response times

## Troubleshooting

### Common Issues

#### 1. Connection Refused
**Symptom:** `ECONNREFUSED` error
**Solution:** 
- Check SAGE API is running
- Verify `SAGE_API_URL` in `.env`
- Test with `GET /finance/sage/test-connection`

#### 2. Authentication Failed
**Symptom:** 401 Unauthorized
**Solution:**
- Verify `SAGE_API_KEY` in `.env`
- Check API key is valid in SAGE system

#### 3. Timeout
**Symptom:** Request timeout after 30s
**Solution:**
- Increase `SAGE_API_TIMEOUT` in `.env`
- Check SAGE API performance
- Verify network connectivity

#### 4. Integration Stuck in PENDING
**Symptom:** Status never updates from PENDING
**Solution:**
- Check SAGE API status endpoint
- Manually query `SageIntegration` table
- Retry integration

## Next Steps

1. **Frontend UI:** Add SAGE integration buttons and status displays
2. **Notifications:** Send notifications on integration success/failure
3. **Scheduled Integration:** Add cron job for automatic batch integration
4. **Reporting:** Add SAGE integration reports and dashboards
5. **Audit Trail:** Enhanced logging for compliance

## Summary

The SAGE API integration is now complete with:
- ✅ Backend service (`SageApiIntegrationService`)
- ✅ API endpoints (6 endpoints)
- ✅ Database schema (`SageIntegration` model)
- ✅ Error handling and retries
- ✅ Status tracking and history
- ✅ Configuration management
- ✅ Filters in Configurations Sage tab

**Missing from diagram:** Frontend UI components for triggering integration (to be added in next phase).
