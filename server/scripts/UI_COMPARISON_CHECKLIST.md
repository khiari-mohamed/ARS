# UI vs Database Comparison Checklist

## How to Use This Checklist

1. Run the validation script: `node scripts/validate-ui-data.js`
2. Open the frontend UI in browser
3. Compare each section below

---

## ✅ Section 1: Client Basic Information

### Database Shows:
- Client Name
- Compagnie d'Assurance
- Mode de Récupération (VIREMENT/CHEQUE/FEUILLE_CAISSE or null)
- Délai de Règlement (number in days)
- Délai de Réclamation (number in hours)
- Email, Phone, Address (may be null)
- Status (active/inactive)

### UI Should Show:
- [ ] Client Name - displayed prominently
- [ ] Compagnie d'Assurance - or "Non renseigné" if null
- [ ] Mode de Récupération with color:
  - [ ] 🏦 Blue for VIREMENT
  - [ ] 💳 Green for CHEQUE
  - [ ] 📋 Orange for FEUILLE_CAISSE
  - [ ] ❌ Red "NON DÉFINI" if null
- [ ] Délai de Règlement: X jours
- [ ] Délai de Réclamation: X heures
- [ ] Email - or "Non renseigné"
- [ ] Phone - or "Non renseigné"
- [ ] Address - or "Non renseignée"
- [ ] Status badge (active/inactive)

---

## ✅ Section 2: Chef d'Équipe (Charge Compte)

### Database Shows:
- `chargeCompte` relation (User object)
- Fields: id, fullName, email, role, department

### UI Should Show:
- [ ] Section titled "Chef d'Équipe" or "Charge Compte"
- [ ] If assigned:
  - [ ] Full name
  - [ ] Email
  - [ ] Role badge
  - [ ] Department
- [ ] If not assigned:
  - [ ] "❌ Aucun chef d'équipe assigné"

**IMPORTANT**: This should be SEPARATE from gestionnaires list!

---

## ✅ Section 3: Gestionnaires (Additional Team Members)

### Database Shows:
- `gestionnaires` array (ClientGestionnaire relations)
- Each has: user { id, fullName, email, role, department }

### UI Should Show:
- [ ] Section titled "Gestionnaires"
- [ ] If exists:
  - [ ] Count: "Gestionnaires (X)"
  - [ ] List of names with roles
- [ ] If empty:
  - [ ] "ℹ️ Aucun gestionnaire supplémentaire"

**IMPORTANT**: This is DIFFERENT from Chef d'Équipe!

---

## ✅ Section 4: Contracts

### Database Shows:
- `contracts` array
- Each contract has:
  - id
  - reglementDelay
  - reclamationDelay
  - startDate, endDate
  - chefEquipe (User object)

### UI Should Show:
- [ ] Section titled "Contrats"
- [ ] Count: "Contrats (X)"
- [ ] For each contract:
  - [ ] Contract ID (truncated)
  - [ ] Délai Règlement: X jours
  - [ ] Délai Réclamation: X heures
  - [ ] Période: DD/MM/YYYY → DD/MM/YYYY
  - [ ] Chef d'Équipe: Name (Role)
- [ ] If no contracts:
  - [ ] "ℹ️ Aucun contrat"

---

## ✅ Section 5: Bordereaux

### Database Shows:
- `bordereaux` array
- Each has:
  - id, reference, status
  - chefDeCompte (User)
  - currentHandler (User)
  - team (Team)
  - documents array

### UI Should Show:
- [ ] Section titled "Bordereaux"
- [ ] Total count
- [ ] Status breakdown:
  - [ ] A_SCANNER: X
  - [ ] EN_COURS: X
  - [ ] FINALISE: X
  - [ ] etc.
- [ ] Document statistics:
  - [ ] Total documents count
  - [ ] Documents by type
- [ ] Assignment statistics:
  - [ ] With Chef de Compte: X/Total
  - [ ] With Current Handler: X/Total
  - [ ] With Team: X/Total
- [ ] Document-level assignments:
  - [ ] With Gestionnaire: X/Total
  - [ ] With Gestionnaire Senior: X/Total
  - [ ] With Chef d'Équipe: X/Total
- [ ] If no bordereaux:
  - [ ] "ℹ️ Aucun bordereau"

---

## ✅ Section 6: Réclamations

### Database Shows:
- `reclamations` array
- Each has: id, status, type, description, etc.

### UI Should Show:
- [ ] Section titled "Réclamations"
- [ ] If exists:
  - [ ] Count
  - [ ] Status breakdown
  - [ ] Link to view details
- [ ] If none:
  - [ ] "✅ Aucune réclamation"

---

## ✅ Section 7: Adhérents

### Database Shows:
- `adherents` array
- Count of members

### UI Should Show:
- [ ] Section titled "Adhérents"
- [ ] Count: "Adhérents: X"
- [ ] Link to view list (if count > 0)

---

## 🔍 Detailed Validation Steps

### Step 1: Pick a Client with Complete Data
Example: SUDGAZ, VITALAIT, or VIVO ENERGY (have Chef d'Équipe assigned)

1. Run validation script
2. Note the data shown for this client
3. Open UI and navigate to this client
4. Compare each field

### Step 2: Pick a Client with Missing Data
Example: Most clients (no Chef d'Équipe, no Mode Récupération)

1. Run validation script
2. Note what's missing
3. Open UI and verify empty states are shown correctly

### Step 3: Pick a Client with Bordereaux
Example: SICOM DISTRIBUTION or WEATHERFORD

1. Check bordereau count matches
2. Verify status breakdown
3. Check document counts
4. Validate assignment displays

### Step 4: Check Color Coding

Find clients with different Mode de Récupération:
- STLR: FEUILLE_CAISSE (should be 📋 Orange)
- TALOS: VIREMENT (should be 🏦 Blue)
- Others: Not set (should be ❌ Red)

---

## 🐛 Common UI Bugs to Look For

### Bug 1: Chef d'Équipe vs Gestionnaires Confusion
- [ ] Are they displayed as separate sections?
- [ ] Is chargeCompte shown as "Chef d'Équipe"?
- [ ] Are gestionnaires shown as additional team members?

### Bug 2: Mode de Récupération Display
- [ ] Is it shown at all?
- [ ] Are colors correct?
- [ ] Is "NON DÉFINI" shown when null?

### Bug 3: Empty States
- [ ] Are empty states friendly and informative?
- [ ] Do they use correct icons (❌, ℹ️, ✅)?
- [ ] Are they consistent across sections?

### Bug 4: Counts Mismatch
- [ ] Do contract counts match?
- [ ] Do bordereau counts match?
- [ ] Do document counts match?
- [ ] Do adhérent counts match?

### Bug 5: Missing Fields
- [ ] Is Compagnie d'Assurance displayed?
- [ ] Are all delay fields shown?
- [ ] Is contact info displayed (or "Non renseigné")?

---

## 📊 Expected Results

After running validation script, you should see:

### For Complete Clients (e.g., SUDGAZ):
```
✅ Compagnie d'Assurance: COMAR ASSURANCES
❌ Mode Récupération: NOT SET
✅ Délai Règlement: 5 jours
✅ Délai Réclamation: 48 heures
✅ Chef d'Équipe Assigned: Mohamed Frad
ℹ️  Gestionnaires: NONE
✅ Contracts Count: 1
ℹ️  Bordereaux: NONE
✅ Réclamations: NONE
✅ Adhérents Count: 0
```

### UI Should Match Exactly:
- Show COMAR ASSURANCES
- Show ❌ NON DÉFINI for Mode Récupération
- Show 5 jours and 48 heures
- Show Mohamed Frad as Chef d'Équipe
- Show "Aucun gestionnaire supplémentaire"
- Show 1 contract with details
- Show "Aucun bordereau"
- Show "Aucune réclamation"
- Show 0 adhérents

---

## ✅ Final Checklist

- [ ] All basic fields displayed correctly
- [ ] Chef d'Équipe section separate and correct
- [ ] Gestionnaires section separate and correct
- [ ] Mode de Récupération with proper colors
- [ ] All empty states friendly and informative
- [ ] Counts match database
- [ ] Relationships displayed correctly
- [ ] No console errors
- [ ] No missing data warnings
- [ ] Performance is acceptable

---

## 🚀 Next Actions

If validation fails:

1. **Frontend Issues**: Update `frontend/src/pages/clients/index.tsx`
2. **Backend Issues**: Update `server/src/client/client.service.ts`
3. **Type Issues**: Update `frontend/src/types/client.d.ts`
4. **Data Issues**: Run data migration scripts

If validation passes:

1. ✅ Mark as production-ready
2. 📝 Document any known limitations
3. 🎉 Celebrate!
