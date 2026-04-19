# UI Data Validation Script

## Purpose
This script validates that the frontend UI is displaying correct data by comparing what should be shown in the UI with the actual database data.

## What It Validates

### 1. Basic Client Information
- ✅ Compagnie d'Assurance (should show "Non renseigné" if missing)
- ✅ Mode de Récupération (should show "❌ NON DÉFINI" if not set)
- ✅ Délai de Règlement (in days)
- ✅ Délai de Réclamation (in hours)

### 2. Chef d'Équipe (chargeCompte)
- ✅ Assignment status
- ✅ Full name, email, role, department
- ✅ Should be displayed separately from gestionnaires

### 3. Gestionnaires
- ✅ Count of additional gestionnaires
- ✅ List with names and roles
- ✅ Should show "ℹ️ Aucun gestionnaire supplémentaire" if none

### 4. Contracts
- ✅ Contract count
- ✅ Contract details (delays, dates)
- ✅ Chef d'Équipe assignment per contract

### 5. Bordereaux
- ✅ Total count
- ✅ Status breakdown (A_SCANNER, EN_COURS, etc.)
- ✅ Document count
- ✅ Assignment levels:
  - Chef de Compte
  - Current Handler
  - Team
- ✅ Document-level assignments:
  - Gestionnaire
  - Gestionnaire Senior
  - Chef d'Équipe

### 6. Réclamations
- ✅ Count
- ✅ Status breakdown
- ✅ Should show "✅ Aucune réclamation" if none

### 7. Adhérents
- ✅ Total count

## How to Run

```bash
cd D:\ARS\server
node scripts/validate-ui-data.js
```

## Output Format

The script provides:

1. **Detailed Client-by-Client Validation**
   - Shows what data exists in database
   - Indicates what should be displayed in UI
   - Flags missing or incorrect data

2. **Validation Summary**
   - Total validations performed
   - Pass/Fail statistics
   - Success percentage

3. **Issues List**
   - All problems found
   - Client name, field, and issue description

4. **UI Display Checklist**
   - Complete list of what UI should show
   - Color coding guidelines
   - Display format requirements

## Expected UI Behavior

### Mode de Récupération Display
- 🏦 **VIREMENT** - Blue color
- 💳 **CHEQUE** - Green color
- 📋 **FEUILLE_CAISSE** - Orange color
- ❌ **Not Set** - Red color with "NON DÉFINI"

### Chef d'Équipe vs Gestionnaires
- **Chef d'Équipe (chargeCompte)**: Single person, displayed prominently
- **Gestionnaires**: Additional team members, displayed as a list

### Empty States
- "Non renseigné" for missing basic info
- "❌ Aucun chef d'équipe assigné" for no chef
- "ℹ️ Aucun gestionnaire supplémentaire" for no gestionnaires
- "ℹ️ Aucun contrat" for no contracts
- "ℹ️ Aucun bordereau" for no bordereaux
- "✅ Aucune réclamation" for no réclamations

## Comparison with Frontend

After running this script, compare the output with:

1. **ClientOverviewTab Component** (`frontend/src/pages/clients/index.tsx`)
   - Check if all fields are displayed
   - Verify color coding matches
   - Confirm empty states are correct

2. **Client List View**
   - Verify counts match
   - Check status indicators
   - Confirm filtering works correctly

3. **Client Detail View**
   - Validate all sections show correct data
   - Check relationships (contracts, bordereaux, etc.)
   - Verify assignment displays

## Common Issues to Look For

1. ❌ **Mode de Récupération not set** - 73 clients need this
2. ❌ **Chef d'Équipe not assigned** - 74 clients need this
3. ⚠️ **Missing contact information** - Email, phone, address
4. ⚠️ **Contracts without Chef d'Équipe** - Some contracts missing team leader
5. ⚠️ **Bordereaux without assignments** - Documents not assigned to handlers

## Next Steps

If issues are found:

1. **Update Database**
   - Set Mode de Récupération for clients
   - Assign Chef d'Équipe where missing
   - Add missing contact information

2. **Fix Frontend**
   - Ensure all fields are displayed
   - Add missing color coding
   - Implement proper empty states

3. **Verify Backend**
   - Check DTOs include all fields
   - Verify API responses are complete
   - Ensure relations are properly loaded

## Related Files

- **Validation Script**: `server/scripts/validate-ui-data.js`
- **Enhanced Analysis**: `server/scripts/check-mode-recuperation-enhanced.js`
- **Frontend Component**: `frontend/src/pages/clients/index.tsx`
- **Client Type**: `frontend/src/types/client.d.ts`
- **Backend Service**: `server/src/client/client.service.ts`
- **DTOs**: `server/src/client/dto/`
