# 🧪 Gestionnaire Dashboard - Complete Functionality Test Guide

## 📊 **Current Test Data Available:**
- **10 Total Dossiers** assigned to test gestionnaire
- **3 Different Clients:**
  - Test Client ARS (5 dossiers: BDX-2024-001 to BDX-2024-005)
  - Société Delta (3 dossiers: DLT-2024-001 to DLT-2024-003)
  - Compagnie Epsilon (2 dossiers: EPS-2024-001 to EPS-2024-002)

---

## 🔍 **1. Search & Filter Functionality**

### **Search Tests:**
1. **Search by Reference:**
   - Type "BDX" → Should show 5 results from Test Client ARS
   - Type "DLT" → Should show 3 results from Société Delta
   - Type "EPS" → Should show 2 results from Compagnie Epsilon

2. **Search by Client Name:**
   - Type "Delta" → Should show Société Delta dossiers
   - Type "Epsilon" → Should show Compagnie Epsilon dossiers
   - Type "Test Client" → Should show Test Client ARS dossiers

3. **Search by GED Reference:**
   - Type "GED-0001" → Should show specific dossier
   - Type "GED-DLT" → Should show Delta dossiers
   - Type "GED-EPS" → Should show Epsilon dossiers

### **Filter Tests:**
1. **Société Dropdown:**
   - Should show: "Toutes les sociétés", "Test Client ARS", "Société Delta", "Compagnie Epsilon"
   - Select "Société Delta" + search "DLT" → Should filter to Delta only
   - Select "Compagnie Epsilon" + search → Should filter to Epsilon only

### **Expected Results:**
- ✅ Search results appear in table below search bar
- ✅ Results show: Référence, Réf GED, Société, Type, Statut, Date
- ✅ Pagination works (5 results per page)

---

## 📋 **2. Corbeille Globale Card**

### **Expected Display:**
- **Total Dossiers:** 10
- **Breakdown:**
  - Prestation: ~5-6 dossiers
  - Réclamation: ~2-3 dossiers  
  - Complément Dossier: ~2-3 dossiers

### **Visual Test:**
- ✅ Red gradient background
- ✅ Folder icon (📁)
- ✅ Large total number display
- ✅ Three breakdown columns with numbers

---

## 📄 **3. Derniers Dossiers Ajoutés Table**

### **Expected Data:**
- **10 rows** showing recent dossiers
- **Columns filled with real data:**
  - Réf Dossier: BDX-2024-xxx, DLT-2024-xxx, EPS-2024-xxx
  - Réf GED: GED-0001, GED-DLT-001, GED-EPS-001, etc.
  - Société: Test Client ARS, Société Delta, Compagnie Epsilon
  - Compagnie: Same as Société
  - Nom: Assuré 1, Delta Assuré 1, Epsilon Assuré 1, etc.
  - Prénom: Bénéficiaire 1-1, Delta Bénéficiaire 1-1, etc.
  - Type: Prestation, Réclamation, Complément Dossier
  - Statut: ASSIGNE, EN_COURS (with colored tags)
  - Date dépôt: Recent dates

### **Action Buttons:**
- **👁️ View Button:** Should navigate to `/bordereaux/{id}`
- **✏️ Edit Button:** Should open edit modal (placeholder)

---

## 🗂️ **4. Personal Corbeille Tabs**

### **En cours Tab:**
- **Expected:** BS from assigned bordereaux in EN_COURS or ASSIGNE status
- **Columns:** Numéro BS, Réf GED, Nom, Prénom, Compagnie, Société, Statut, Échéance, Date dépôt, Montant, Actions
- **Action Buttons:**
  - **Traiter:** Navigate to `/bs/{id}/processing`
  - **Marquer traité:** Mark BS as processed
  - **Retourner:** Return to chef d'équipe

### **Traités Tab:**
- **Expected:** BS marked as TRAITE
- **No action buttons** (read-only)

### **Retournés Tab:**
- **Expected:** BS returned to chef
- **Full action buttons available**

### **Priorités IA Tab:**
- **Expected:** AI-suggested priority order
- **Blue tag:** "Recommandations intelligentes"
- **Info alert** about AI analysis

---

## ⚙️ **5. Action Buttons Functionality**

### **Search Actions Button:**
- **Click:** Should log "Opening bulk actions menu"
- **Future:** Will open modal for bulk operations

### **Table Action Buttons:**
- **View (👁️):** Navigate to bordereau detail page
- **Edit (✏️):** Open edit modal
- **Traiter:** Navigate to BS processing page
- **Marquer traité:** Update BS status + refresh data
- **Retourner:** Return BS to chef + refresh data

---

## 🧪 **Complete Test Sequence:**

1. **Login** with `gestionnaire@test.com` / `password123`
2. **Verify Global Basket** shows 10 total dossiers
3. **Test Search:**
   - Search "BDX" → 5 results
   - Search "Delta" → 3 results
   - Search "Epsilon" → 2 results
4. **Test Filters:**
   - Select "Société Delta" → dropdown populated
   - Search with filter → filtered results
5. **Check Recent Dossiers Table:**
   - 10 rows with real data
   - All columns populated
   - Action buttons clickable
6. **Test Personal Corbeille:**
   - En cours tab → BS data visible
   - Action buttons functional
   - Other tabs accessible
7. **Test All Buttons:**
   - Search button → results appear
   - Actions button → console log
   - View buttons → navigation
   - Process buttons → console logs + refresh

---

## ✅ **Success Criteria:**
- All data displays correctly (no "No data" messages)
- Search returns accurate results
- Filters work properly
- All buttons are clickable and functional
- Navigation works correctly
- Console shows appropriate logs for actions
- Data refreshes after actions

---

## 🐛 **Common Issues to Check:**
- Empty tables → Check user authentication
- Search not working → Check API endpoints
- Buttons not clickable → Check event handlers
- Navigation errors → Check route definitions
- Data not refreshing → Check API calls in handlers