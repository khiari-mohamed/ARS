# 📊 Status Mapping Analysis - OrdreVirement Workflow

## ❌ **CURRENT PROBLEM: Status Fields Are Fragmented**

### **Current Implementation (3 separate fields):**

| Field | Type | Values | Purpose |
|-------|------|--------|---------|
| `validationStatus` | String | `EN_ATTENTE_VALIDATION`, custom | Chef → Responsable validation |
| `recouvrementStatus` | Enum | `ATTENTE_RECOUVREMENT`, `AUTORISE`, `NON_AUTORISE` | Service Recouvrement gate |
| `etatVirement` | Enum | `NON_EXECUTE`, `EXECUTE`, etc. | Payment execution status |

**Problem:** No single field represents the complete 6-step workflow from the diagram!

---

## ✅ **NEW SOLUTION: Single Global Status Field**

### **Added: `statutGlobal` (StatutOrdreVirement enum)**

```prisma
enum StatutOrdreVirement {
  EN_ATTENTE            // Step 1: Order created, waiting for internal validation
  VALIDE_INTERNE        // Step 2: Internally validated by Chef/Responsable
  VALIDE_RECOUVREMENT   // Step 3: Recovery validated (payment received)
  BLOQUE_RECOUVREMENT   // Step 3 (blocked): Recovery blocked (payment not received)
  COMPTABILISE          // Step 4: Accounting entries generated (TXT file created)
  INTEGRE_SAGE          // Step 5: Successfully integrated in Sage system
}
```

---

## 🔄 **Status Transition Flow**

```
EN_ATTENTE
    ↓ (Chef/Responsable validates)
VALIDE_INTERNE
    ↓ (Service Recouvrement checks payment)
    ├─→ VALIDE_RECOUVREMENT (if paid)
    └─→ BLOQUE_RECOUVREMENT (if not paid) → Super Admin can override → VALIDE_RECOUVREMENT
            ↓
        COMPTABILISE (TXT Sage generated)
            ↓
        INTEGRE_SAGE (Imported to Sage successfully)
```

---

## 📋 **Mapping to Existing Fields**

| statutGlobal | validationStatus | recouvrementStatus | etatVirement | Action Trigger |
|--------------|------------------|-------------------|--------------|----------------|
| `EN_ATTENTE` | `EN_ATTENTE_VALIDATION` | `ATTENTE_RECOUVREMENT` | `NON_EXECUTE` | OV created |
| `VALIDE_INTERNE` | `VALIDE` | `ATTENTE_RECOUVREMENT` | `NON_EXECUTE` | Chef/Responsable approves |
| `VALIDE_RECOUVREMENT` | `VALIDE` | `AUTORISE` | `NON_EXECUTE` | SR validates payment received |
| `BLOQUE_RECOUVREMENT` | `VALIDE` | `NON_AUTORISE` | `BLOQUE` | SR rejects (no payment) |
| `COMPTABILISE` | `VALIDE` | `AUTORISE` | `NON_EXECUTE` | Sage TXT generated |
| `INTEGRE_SAGE` | `VALIDE` | `AUTORISE` | `EXECUTE` | Sage import confirmed |

---

## 🎯 **Where to Update Status**

### **Backend Services:**

1. **OV Creation** → Set `statutGlobal = EN_ATTENTE`
   - File: `finance.service.ts` or `finance.controller.ts`
   - Method: `createOrdreVirement()`

2. **Internal Validation** → Set `statutGlobal = VALIDE_INTERNE`
   - File: `finance.controller.ts`
   - Endpoint: `POST /finance/ordres-virement/:id/validate`

3. **Recouvrement Validation** → Set `statutGlobal = VALIDE_RECOUVREMENT` or `BLOQUE_RECOUVREMENT`
   - File: `finance.controller.ts`
   - Endpoint: `POST /finance/recouvrement/bulk-validate`

4. **Sage TXT Generation** → Set `statutGlobal = COMPTABILISE`
   - File: `sage-txt-generation.service.ts`
   - Method: `persistGeneration()`

5. **Sage Integration** → Set `statutGlobal = INTEGRE_SAGE`
   - File: New endpoint needed: `POST /finance/ordres-virement/:id/confirm-sage-integration`

---

## 🖥️ **Frontend Components to Update**

### **1. RecouvrementTab.tsx**
**Current:** Only shows `recouvrementStatus` (3 values)
**Needed:** Show `statutGlobal` (6 values)

```typescript
// Add to interface
interface OrdreVirement {
  statutGlobal: 'EN_ATTENTE' | 'VALIDE_INTERNE' | 'VALIDE_RECOUVREMENT' | 
                'BLOQUE_RECOUVREMENT' | 'COMPTABILISE' | 'INTEGRE_SAGE';
}

// Update filter
const [filter, setFilter] = useState<'ALL' | 'EN_ATTENTE' | 'VALIDE_INTERNE' | 
  'VALIDE_RECOUVREMENT' | 'BLOQUE_RECOUVREMENT' | 'COMPTABILISE' | 'INTEGRE_SAGE'>('ALL');

// Update status labels
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'EN_ATTENTE': return 'En attente';
    case 'VALIDE_INTERNE': return 'Validé interne';
    case 'VALIDE_RECOUVREMENT': return 'Validé recouvrement';
    case 'BLOQUE_RECOUVREMENT': return 'Bloqué recouvrement';
    case 'COMPTABILISE': return 'Comptabilisé';
    case 'INTEGRE_SAGE': return 'Intégré dans Sage';
    default: return status;
  }
};

// Update status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'EN_ATTENTE': return 'warning';
    case 'VALIDE_INTERNE': return 'info';
    case 'VALIDE_RECOUVREMENT': return 'success';
    case 'BLOQUE_RECOUVREMENT': return 'error';
    case 'COMPTABILISE': return 'primary';
    case 'INTEGRE_SAGE': return 'success';
    default: return 'default';
  }
};
```

### **2. OVProcessingTab.tsx**
Show current `statutGlobal` in the stepper/status display

### **3. HistoryTab.tsx**
Display `statutGlobal` in the history table

---

## 🚀 **Implementation Priority**

### **Phase 1: Backend Status Updates** (HIGH PRIORITY)
1. ✅ Add `statutGlobal` field to schema (DONE)
2. ❌ Update OV creation to set `EN_ATTENTE`
3. ❌ Update validation endpoint to set `VALIDE_INTERNE`
4. ❌ Update recouvrement endpoint to set `VALIDE_RECOUVREMENT` / `BLOQUE_RECOUVREMENT`
5. ❌ Update Sage generation to set `COMPTABILISE`
6. ❌ Add Sage integration confirmation endpoint to set `INTEGRE_SAGE`

### **Phase 2: Frontend Display** (MEDIUM PRIORITY)
1. ❌ Update RecouvrementTab to show `statutGlobal`
2. ❌ Update filters to use all 6 statuses
3. ❌ Update status chips/badges
4. ❌ Add status timeline/stepper visualization

### **Phase 3: Migration** (LOW PRIORITY)
1. ❌ Migrate existing OVs to set correct `statutGlobal` based on current fields
2. ❌ Add database migration script

---

## 📝 **Current Status: INCOMPLETE**

- ✅ Schema updated with `statutGlobal` field
- ✅ Enum `StatutOrdreVirement` created with 6 values
- ❌ Backend services NOT updated to set `statutGlobal`
- ❌ Frontend components still use old `recouvrementStatus` (3 values only)
- ❌ No automatic status transitions implemented

**Next Step:** Update backend services to automatically manage `statutGlobal` transitions.
