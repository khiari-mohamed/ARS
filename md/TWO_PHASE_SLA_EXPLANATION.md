# 📊 Two-Phase SLA System - ARS Application

## Overview

The ARS application uses a **two-phase SLA tracking system** to accurately monitor both gestionnaire work and finance processing separately.

---

## 🎯 Why Two Phases?

**Problem:** A single SLA doesn't accurately reflect the workflow because:
- Gestionnaires complete their work at status `TRAITE`
- Finance department handles payment after `TRAITE`
- These are two separate responsibilities with different timelines

**Solution:** Track two separate SLAs:
1. **Phase 1 (Gestionnaire):** Reception → TRAITE
2. **Phase 2 (Finance):** TRAITE → VIREMENT_EXECUTE

---

## 📋 Phase 1: Gestionnaire SLA

**Starts:** `dateReception` (when bordereau is received)  
**Ends:** When status becomes `TRAITE` (treatment complete)  
**Threshold:** Contract-specific `delaiReglement` (typically 10-30 days)

### Status Colors:
- 🟢 **Green:** ≤ 80% of time elapsed
- 🟠 **Orange:** 80-100% of time elapsed (at risk)
- 🔴 **Red:** > 100% of time elapsed (SLA breach)

### Example:
```
Bordereau: BR-2026-001
Client: APAL
Délai règlement: 15 days
Date réception: 01/04/2026
Current date: 13/04/2026
Days elapsed: 12 days
Percentage: 80% (12/15)
Status: 🟠 Orange (at risk)
```

---

## 💰 Phase 2: Finance SLA

**Starts:** When status becomes `TRAITE` or `PRET_VIREMENT`  
**Ends:** When status becomes `VIREMENT_EXECUTE` (payment executed)  
**Threshold:** **3 days** (fixed for all bordereaux)

### Status Colors:
- 🟢 **Green:** ≤ 2.4 days (80% of 3 days)
- 🟠 **Orange:** 2.4-3 days (at risk)
- 🔴 **Red:** > 3 days (finance delay)

### Example:
```
Bordereau: A-BULLETIN-2026-98115
Client: APAL
Status: TRAITE
Date TRAITE: 08/04/2026
Current date: 13/04/2026
Days since TRAITE: 5 days
Finance SLA: 3 days
Status: 🔴 Red (Finance delay: 5 days since TRAITE)
```

---

## 🔄 Complete Workflow Example

### Bordereau Lifecycle:

```
Day 0:  Reception (EN_ATTENTE)
        ↓ Phase 1 SLA starts (15 days threshold)
Day 1:  A_SCANNER
Day 2:  SCAN_EN_COURS
Day 3:  SCANNE
Day 4:  ASSIGNE (assigned to gestionnaire)
Day 5-12: EN_COURS (gestionnaire processing)
Day 12: TRAITE ✅ Phase 1 complete (12/15 days = 80%)
        ↓ Phase 2 SLA starts (3 days threshold)
Day 13: PRET_VIREMENT
Day 14: Finance processes payment
Day 15: VIREMENT_EXECUTE ✅ Phase 2 complete (3/3 days = 100%)
        ↓ SLA tracking stops completely
```

---

## 📊 Alert Display

### For Phase 1 (Gestionnaire work):
```
ID: BR-2026-001
Type: Dépassement SLA
Status: EN_COURS
SLA (jours): 12 / 15
Message: "Risk of delay"
```

### For Phase 2 (Finance work):
```
ID: A-BULLETIN-2026-98115
Type: Finance delay: 5 days since TRAITE
Status: TRAITE
SLA (jours): 5 / 3 (Finance)
Message: "Finance delay: 5 days since TRAITE"
Tooltip: "Phase 1 (Gestionnaire): ✅ Completed in 12/15 days
          Phase 2 (Finance): 🔴 5/3 days - Action required"
```

---

## 🎨 UI Implementation

### SLA Column Display:

**Phase 1 (Gestionnaire):**
```
16 days
(Gestionnaire SLA)
```

**Phase 2 (Finance):**
```
5 / 3 days
(Finance SLA)
ℹ️ Gestionnaire: ✅ Completed
```

### Tooltip Content:

```
📊 Two-Phase SLA Tracking

Phase 1: Gestionnaire Work
✅ Completed in 12 days (Threshold: 15 days)
Status: On time (80%)

Phase 2: Finance Processing
🔴 Current: 5 days (Threshold: 3 days)
Status: Delayed - Action required
```

---

## 🔧 Technical Implementation

### Backend Response Structure:

```json
{
  "alertLevel": "red",
  "reason": "Finance delay: 5 days since TRAITE",
  "slaThreshold": 3,
  "daysSinceReception": 5,
  "slaPhase": "FINANCE",
  "slaInfo": {
    "threshold": 3,
    "daysSince": 5,
    "phase": "FINANCE",
    "gestionnaireSla": {
      "threshold": 15,
      "daysSince": 12,
      "completed": true
    }
  }
}
```

### Frontend Display Logic:

```typescript
if (alert.slaPhase === 'FINANCE') {
  // Show finance-specific SLA
  slaDisplay = `${alert.daysSinceReception} / ${alert.slaThreshold} (Finance)`;
  tooltip = `Phase 1 (Gestionnaire): ✅ Completed in ${alert.slaInfo.gestionnaireSla.daysSince}/${alert.slaInfo.gestionnaireSla.threshold} days
Phase 2 (Finance): ${alert.daysSinceReception}/${alert.slaThreshold} days`;
} else {
  // Show gestionnaire SLA
  slaDisplay = `${alert.daysSinceReception} / ${alert.slaThreshold}`;
  tooltip = `Gestionnaire SLA: ${alert.daysSinceReception}/${alert.slaThreshold} days`;
}
```

---

## ✅ Benefits

1. **Accurate Tracking:** Each department's work is tracked separately
2. **Clear Responsibility:** Easy to identify if delay is in gestionnaire or finance
3. **Better Alerts:** Alerts show which phase needs attention
4. **Fair Metrics:** Gestionnaires aren't penalized for finance delays
5. **Actionable:** Clear indication of where action is needed

---

## 📌 Important Notes

- **Centralized SLA Calculator** (`utils/sla-calculator.ts`) still uses VIREMENT_EXECUTE for overall reporting
- **Alerts System** uses two-phase tracking for operational monitoring
- **Both are correct** - they serve different purposes:
  - Centralized: Overall process metrics
  - Alerts: Operational action tracking

---

## 🚀 Next Steps for Frontend

1. Update SLA column to show phase-specific information
2. Add tooltip/popup with full SLA breakdown
3. Use different icons for Phase 1 vs Phase 2 alerts
4. Add filter to show only Finance delays or only Gestionnaire delays
5. Update dashboard to show separate metrics for each phase

---

## 📞 Support

For questions about the two-phase SLA system, contact the development team.
