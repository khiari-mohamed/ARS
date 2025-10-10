# 📊 STATUS SUMMARY - Document & Bordereau Status Flow

## 🔵 DOCUMENT STATUS (DocumentStatus enum)

### Available Statuses:
1. **UPLOADED** - Document just uploaded, not yet processed
2. **EN_COURS** - Document being processed/reviewed
3. **SCANNE** - Document has been scanned
4. **TRAITE** - Document processing completed
5. **REJETE** - Document rejected
6. **RETOUR_ADMIN** - Document returned to admin

### Document Status Flow:
```
UPLOADED → SCANNE → EN_COURS → TRAITE
                              ↓
                           REJETE / RETOUR_ADMIN
```

---

## 🟢 BORDEREAU STATUS (Statut enum)

### Complete Status List (19 statuses):

#### **BO Module:**
- `EN_ATTENTE` - Initial status when bordereau is received

#### **SCAN Module:**
- `A_SCANNER` - Ready to be scanned
- `SCAN_EN_COURS` - Scanning in progress
- `SCANNE` - Scanning completed

#### **Chef d'Équipe Module:**
- `A_AFFECTER` - Ready to be assigned to gestionnaire
- `ASSIGNE` - Assigned to gestionnaire
- `EN_COURS` - Being processed by gestionnaire
- `TRAITE` - Processing completed

#### **Finance Module:**
- `PRET_VIREMENT` - Ready for bank transfer
- `VIREMENT_EN_COURS` - Transfer in progress
- `VIREMENT_EXECUTE` - Transfer executed
- `VIREMENT_REJETE` - Transfer rejected
- `CLOTURE` - Closed
- `PAYE` - Paid

#### **Exception Statuses:**
- `EN_DIFFICULTE` - Has difficulties/issues
- `PARTIEL` - Partially processed
- `MIS_EN_INSTANCE` - Put on hold
- `REJETE` - Rejected
- `RETOURNE` - Returned

### Bordereau Status Flow:
```
EN_ATTENTE (BO)
    ↓
A_SCANNER (SCAN)
    ↓
SCAN_EN_COURS (SCAN)
    ↓
SCANNE (SCAN)
    ↓
A_AFFECTER (Chef d'Équipe)
    ↓
ASSIGNE (Chef d'Équipe)
    ↓
EN_COURS (Chef d'Équipe)
    ↓
TRAITE (Chef d'Équipe)
    ↓
PRET_VIREMENT (Finance)
    ↓
VIREMENT_EN_COURS (Finance)
    ↓
VIREMENT_EXECUTE (Finance)
    ↓
CLOTURE (Finance)
    ↓
PAYE (Finance)

Exception Paths:
- Any status → REJETE
- Any status → RETOURNE
- Any status → EN_DIFFICULTE
- Any status → MIS_EN_INSTANCE
```

---

## 📋 GED CORBEILLE TABS (Chef d'Équipe)

### Tab Filtering Logic:

#### **Tab 1: Traités**
Shows bordereaux with status:
- `TRAITE`
- `PAYE`
- `CLOTURE`

#### **Tab 2: En cours**
Shows bordereaux with status:
- `EN_COURS`
- `ASSIGNE`

#### **Tab 3: Non affectés**
Shows bordereaux with status:
- `A_AFFECTER`
- `A_SCANNER`
- `SCANNE`

#### **Tab 4: Retournés**
Shows bordereaux with status:
- `REJETE`
- `RETOURNE`

---

## 🎯 CURRENT DATA (Chef1 Example)

### Chef1 has 5 documents from 2 bordereaux:

#### Bordereau: "borderx" (Status: A_AFFECTER)
- BS-1.pdf (Document Status: SCANNE)
- BS-2.pdf (Document Status: SCANNE)
- borderx.pdf (Document Status: SCANNE)
- **Appears in:** Non affectés tab

#### Bordereau: "CLI-BULLETIN-2025-81397" (Status: REJETE)
- CLI-BULLETIN-2025-81397.pdf (Document Status: SCANNE)
- gg.pdf (Document Status: SCANNE)
- **Appears in:** Retournés tab

### Chef2 has 2 documents from 1 bordereau:

#### Bordereau: "tes2" (Status: EN_COURS)
- tes2.pdf (Document Status: SCANNE)
- BS-5766831.pdf (Document Status: TRAITE)
- **Appears in:** En cours tab

---

## 🔑 KEY POINTS

1. **Document Status** is independent - tracks individual document processing
2. **Bordereau Status** controls which GED tab the documents appear in
3. **Filtering** is done by `bordereau.statut`, NOT `document.status`
4. **Access Control** is by `contract.teamLeaderId` - each chef sees only their contracts
5. **Total Statuses:**
   - Document: 6 statuses
   - Bordereau: 19 statuses

---

## ✅ IMPLEMENTATION STATUS

- ✅ Schema correctly defines all statuses
- ✅ GED Corbeille filters by bordereau status
- ✅ Chef d'équipe sees only their team's data
- ✅ Dashboard shows correct counts per chef
- ✅ No hardcoded URLs - all use environment variables
