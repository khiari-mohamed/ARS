# 🛡️ Duplicate Payment Protection System

## 📋 Overview

This document explains the **3-level protection system** implemented to prevent duplicate payments in the OV (Ordre de Virement) Excel import process.

---

## ✅ What Was Already Working

### 1. **Matricule Uniqueness per Société**
```prisma
model Adherent {
  @@unique([matricule, clientId]) // Matricule unique per société
}
```

**Meaning:**
- Matricule "12345" for Client A (CTC) = ✅ Allowed
- Matricule "12345" for Client B (STAR) = ✅ Allowed (different person)
- Matricule "12345" for Client A (CTC) again = ❌ Database constraint violation

### 2. **Within-File Amount Consolidation**
```typescript
private consolidateAmounts(results: VirementValidationItem[]): VirementValidationItem[] {
  // Groups by ${matricule}-${societe}
  // If same matricule appears multiple times in Excel → amounts are SUMMED
}
```

**Example:**
```
Excel File:
Row 1: Matricule 12345 → 100 TND
Row 2: Matricule 12345 → 50 TND

Result:
Matricule 12345 → 150 TND (consolidated) ✅
```

---

## 🚨 The Problem: Cross-OV Duplicate Payments

### Scenario: Silent Double Payment

**Month 1:**
```
User uploads Excel for Bordereau A (Client: CTC)
Matricule 12345 → 100 TND
OV created ✅
```

**Month 2:**
```
User ACCIDENTALLY uploads THE SAME Excel file for Bordereau B (Client: CTC)
Matricule 12345 → 100 TND
OV created ✅  ← DUPLICATE PAYMENT!
```

**Result:**
- Ahmed (matricule 12345) gets paid **200 TND** instead of 100 TND
- No error, no warning
- Discovered 6 months later during audit
- **Financial loss**

---

## 🔧 The Solution: 3-Level Protection System

### Level 1: **Excel File Hash Detection** (Strongest) ✅ IMPLEMENTED

**How it works:**
1. Calculate SHA-256 hash of uploaded Excel file
2. Check if this exact file was uploaded in last 90 days for same client
3. If found → Show warning with previous OV details

**Code Location:** `excel-validation.service.ts`

```typescript
// Calculate file hash
const crypto = require('crypto');
const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

// Check for duplicates
const recentDuplicateFile = await this.checkDuplicateFileHash(fileHash, clientId);
```

**Warning Message:**
```
⚠️ ATTENTION: Ce fichier Excel a déjà été utilisé le 15/03/2026 pour l'OV OV-CTC-001. 
Vérifiez qu'il ne s'agit pas d'un doublon de paiement.
```

**Storage:** File hash is stored in `OrdreVirement.commentaire` field

---

### Level 2: **Recent Payment Detection** (Smart) ✅ IMPLEMENTED

**How it works:**
1. For each matricule in Excel, check if it was used in a recent OV (last 30 days)
2. Find the **MOST RECENT OV** that contains this matricule
3. Show when that OV was **created** (not when payment was made)
4. If found → Add warning to that specific line
5. Change status from VALIDE → ALERTE

**Code Location:** `excel-validation.service.ts`

```typescript
private async checkRecentPayments(items: VirementValidationItem[], clientId: string)
```

**Warning Message:**
```
⚠️ Matricule utilisé dans un OV récent: 100 TND (OV VIR-20260316-0001 créé il y a 2 heure(s))
```

**Smart Logic:**
- If Level 1 (duplicate file) already detected → Skip Level 2 (avoid noise)
- Only checks last 30 days (legitimate monthly payments allowed)
- Shows **MOST RECENT OV** for each matricule (not oldest)
- Shows **OV creation time** (when Excel was uploaded), not payment execution time
- Per-matricule warnings (not blocking entire file)

---

### Level 3: **Amount Pattern Detection** (Advanced) ⏳ NOT YET IMPLEMENTED

**How it would work:**
1. Compare payment patterns across recent OVs
2. Detect if multiple OVs have identical amounts for same matricules
3. Flag suspicious patterns

**Example Detection:**
```
OV-001: Matricule 12345 → 100 TND, Matricule 67890 → 150 TND
OV-002: Matricule 12345 → 100 TND, Matricule 67890 → 150 TND  ← SUSPICIOUS!
```

**Status:** Not implemented yet (can be added if needed)

---

## 📊 How Warnings Are Displayed

### In Validation Results

```typescript
{
  valid: true,  // Still allows processing
  data: [
    {
      matricule: "12345",
      montant: 100,
      status: "ALERTE",  // Changed from VALIDE
      erreurs: [
        "⚠️ Paiement récent détecté: 100 TND payé il y a 15 jour(s) (OV OV-CTC-001)"
      ]
    }
  ],
  errors: [
    {
      row: 0,
      field: "file",
      message: "⚠️ ATTENTION: Ce fichier Excel a déjà été utilisé...",
      type: "WARNING"
    }
  ]
}
```

### In Frontend UI

- **File-level warning:** Yellow banner at top
- **Line-level warning:** Orange icon next to matricule with tooltip
- **Status:** ALERTE (not ERREUR) → User can still proceed after review

---

## 🎯 Business Logic Decisions

### ✅ Legitimate Cases (Allowed)

| Scenario | Allowed? | Reason |
|----------|----------|--------|
| Same matricule in different months | ✅ Yes | Monthly reimbursements |
| Same matricule for different clients | ✅ Yes | Different people |
| Same matricule multiple times in ONE Excel | ✅ Yes | Amounts consolidated |
| Same matricule after 30+ days | ✅ Yes | New period |

### ⚠️ Suspicious Cases (Warning)

| Scenario | Action | Reason |
|----------|--------|--------|
| Exact same Excel file uploaded twice | ⚠️ Warning | Likely mistake |
| Same matricule paid within 30 days | ⚠️ Warning | Possible duplicate |
| Same amounts for same matricules | ⚠️ Warning | Pattern match |

### ❌ Blocked Cases (Error)

| Scenario | Action | Reason |
|----------|--------|--------|
| Invalid RIB | ❌ Error | Cannot process payment |
| Missing matricule | ❌ Error | Cannot identify recipient |
| Invalid amount | ❌ Error | Cannot process payment |

---

## 🔐 Security & Data Integrity

### File Hash Storage

**Current Implementation:**
- Hash stored in `OrdreVirement.commentaire` field
- Format: `FileHash: abc123...xyz`

**Future Enhancement (Recommended):**
Add dedicated field to schema:
```prisma
model OrdreVirement {
  // ... existing fields
  excelFileHash String?
  excelFileName String?
  excelUploadedAt DateTime?
}
```

### Data Retention

- **File hash checks:** Last 90 days
- **Payment checks:** Last 30 days
- **Rationale:** Balance between safety and legitimate recurring payments

---

## 📈 Monitoring & Reporting

### Metrics to Track

1. **Duplicate File Detection Rate**
   - How many duplicate files caught per month
   - Which users/clients most affected

2. **Recent Payment Warnings**
   - How many matricules flagged
   - False positive rate

3. **User Override Rate**
   - How often users proceed despite warnings
   - Track if overrides lead to actual duplicates

### Audit Trail

All warnings are logged in:
- `ValidationError[]` array
- `VirementValidationItem.erreurs[]` per line
- Console logs with timestamps

---

## 🧪 Testing Scenarios

### Test Case 1: Duplicate File Detection
```
1. Upload Excel file A for Bordereau 1
2. Create OV successfully
3. Upload SAME Excel file A for Bordereau 2
4. Expected: Warning message appears
5. User can still proceed after review
```

### Test Case 2: Recent Payment Detection
```
1. Create OV with Matricule 12345 → 100 TND
2. Wait 1 day
3. Upload new Excel with Matricule 12345 → 150 TND
4. Expected: Warning "Paiement récent détecté: 100 TND payé il y a 1 jour(s)"
5. Status: ALERTE (not ERREUR)
```

### Test Case 3: Legitimate Monthly Payment
```
1. Create OV with Matricule 12345 → 100 TND
2. Wait 31 days
3. Upload new Excel with Matricule 12345 → 150 TND
4. Expected: No warning (beyond 30-day window)
5. Status: VALIDE
```

### Test Case 4: Within-File Consolidation
```
Excel File:
Row 1: Matricule 12345 → 100 TND
Row 2: Matricule 12345 → 50 TND

Expected Result:
Matricule 12345 → 150 TND (consolidated)
No warning (normal behavior)
```

---

## 🚀 Future Enhancements

### Priority 1: Dedicated Schema Fields
```prisma
model OrdreVirement {
  excelFileHash String?
  excelFileName String?
  excelUploadedAt DateTime?
}
```

### Priority 2: Admin Dashboard
- View all duplicate warnings
- Override/approve flagged payments
- Audit trail of all warnings

### Priority 3: Machine Learning
- Learn from historical patterns
- Detect anomalies automatically
- Reduce false positives over time

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue:** Warning appears for legitimate payment
**Solution:** User can proceed after review (warnings don't block)

**Issue:** No warning for obvious duplicate
**Solution:** Check if beyond 30/90 day window, adjust thresholds if needed

**Issue:** Too many false positives
**Solution:** Adjust detection windows or add whitelist for specific clients

---

## ✅ Summary

| Protection Level | Status | Blocks Payment? | Detection Window |
|-----------------|--------|-----------------|------------------|
| Level 1: File Hash | ✅ Implemented | No (Warning) | 90 days |
| Level 2: Recent Payment | ✅ Implemented | No (Warning) | 30 days |
| Level 3: Pattern Detection | ⏳ Future | No (Warning) | TBD |

**Key Principle:** 
- **Warn, don't block** → Flexibility for legitimate cases
- **Multi-layer detection** → Catch different types of duplicates
- **Audit trail** → Track all warnings for review

---

**Last Updated:** March 16, 2026
**Version:** 1.0
**Author:** ARS Development Team
