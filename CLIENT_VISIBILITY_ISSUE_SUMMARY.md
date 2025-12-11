# CLIENT VISIBILITY ISSUE - DIAGNOSIS & FIX

## 🔴 PROBLEM IDENTIFIED

### Current Situation:
- **5 Clients total** in the system
- **Mohamed Ben Ali** (CHEF_EQUIPE) sees 2 clients ✅
- **Leila Mansouri** (GESTIONNAIRE_SENIOR) sees 0 clients ❌
- **Mohamed Gharbi** (GESTIONNAIRE_SENIOR) sees 0 clients ❌

### Root Causes:

#### 1. **Wrong User Roles**
Users assigned as Team Leaders have `GESTIONNAIRE_SENIOR` role instead of `CHEF_EQUIPE`:
- **Leila Mansouri** (senior2@ars.tn) - ID: `6b68a596-ba7e-4d7b-9c81-5b3a0b829e64`
  - Team Leader for: Client AMI Assurances, Client COMAR
  - Chargé de Compte for: Client AMI Assurances, Client COMAR
  - Current Role: `GESTIONNAIRE_SENIOR` ❌
  - Should be: `CHEF_EQUIPE` ✅

- **Mohamed Gharbi** (senior1@ars.tn) - ID: `6d62cd9a-6cad-4a95-9d7d-ede13312148c`
  - Team Leader for: Client GAT Assurances
  - Chargé de Compte for: Client GAT Assurances
  - Current Role: `GESTIONNAIRE_SENIOR` ❌
  - Should be: `CHEF_EQUIPE` ✅

#### 2. **Incomplete Visibility Logic**
The `client.service.ts` (lines 186-192) only checks `gestionnaires` relation:

```typescript
if (userRole === 'CHEF_EQUIPE' || userRole === 'GESTIONNAIRE') {
  where.gestionnaires = {
    some: { id: userId }
  };
}
```

**Missing checks:**
- ❌ `Client.chargeCompteId` (Chargé de Compte)
- ❌ `Contract.teamLeaderId` (Team Leader)
- ❌ `Contract.assignedManagerId` (Assigned Manager)

---

## ✅ SOLUTION OPTIONS

### **Option 1: Fix User Roles** (Recommended - Quick Fix)
Update Leila Mansouri and Mohamed Gharbi to `CHEF_EQUIPE` role.

**Pros:**
- Quick fix
- Aligns with their actual responsibilities
- No code changes needed

**Cons:**
- Doesn't fix the underlying visibility logic issue

### **Option 2: Fix Visibility Logic** (Comprehensive Fix)
Update `client.service.ts` to check ALL relationships:
- Client.chargeCompteId
- Client.gestionnaires
- Contract.teamLeaderId
- Contract.assignedManagerId

**Pros:**
- Fixes the root cause
- Works for any role (CHEF_EQUIPE, GESTIONNAIRE_SENIOR, etc.)
- More flexible for future changes

**Cons:**
- Requires code changes
- More complex query

### **Option 3: Both** (Best Solution)
1. Fix user roles for immediate resolution
2. Fix visibility logic for long-term robustness

---

## 📊 EXPECTED VISIBILITY AFTER FIX

### Super Admin (fd4cb2d7-bc96-4ecb-9a3e-3489b46606cd)
✅ Should see ALL 5 clients

### Mohamed Ben Ali (654e3808-0d53-4da5-9691-67b332954fb2) - CHEF_EQUIPE
✅ Should see 2 clients:
- Client STAR Assurances (Chargé de Compte + Team Leader + Manager)
- client22 (Chargé de Compte)

### Leila Mansouri (6b68a596-ba7e-4d7b-9c81-5b3a0b829e64) - After fix to CHEF_EQUIPE
✅ Should see 2 clients:
- Client AMI Assurances (Chargé de Compte + Team Leader + Manager)
- Client COMAR (Chargé de Compte + Team Leader + Manager)

### Mohamed Gharbi (6d62cd9a-6cad-4a95-9d7d-ede13312148c) - After fix to CHEF_EQUIPE
✅ Should see 1 client:
- Client GAT Assurances (Chargé de Compte + Team Leader + Manager)

### Fatma Trabelsi (ddbaa101-e9fc-41e3-b2db-a78f10066ff5) - CHEF_EQUIPE
✅ Should see 0 clients (no assignments yet)

---

## 🛠️ FIX SCRIPTS AVAILABLE

1. **`fix-chef-roles.js`** - Updates user roles to CHEF_EQUIPE
2. **`diagnose-client-visibility.js`** - Shows current state
3. **`check-missing-chefs.js`** - Identifies users needing role updates

---

## 📝 NEXT STEPS

1. Run `node scripts/fix-chef-roles.js` to update roles
2. Verify with `node scripts/diagnose-client-visibility.js`
3. Update `client.service.ts` with comprehensive visibility logic (optional but recommended)
