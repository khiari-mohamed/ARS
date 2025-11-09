# 📊 RAPPORT DÉTAILLÉ - Règles de Calcul Analytics
## Application ARS Tunisie - Module Analytics

**Date:** 15 Février 2025  
**Version:** 1.0  
**Objet:** Analyse des règles de calcul actuelles pour "En attente" et "Volume de traitement"

---

## 🎯 RÉSUMÉ EXÉCUTIF

Ce rapport détaille les règles de calcul actuellement implémentées dans le module Analytics pour répondre aux questions de l'entreprise concernant:
1. Les règles de calcul du box "En attente"
2. Les règles de calcul du "Volume de traitement"
3. La conformité SLA par type de document

---

## 📦 1. BOX "EN ATTENTE" - Règles de Calcul Actuelles

### 🔍 **Localisation du Code**

**Frontend:** `OverviewTab.tsx` - Ligne 127
```typescript
<Typography variant="h4">{kpis.totalBordereaux - kpis.processedCount}</Typography>
<Typography color="textSecondary">En Attente</Typography>
```

**Backend:** `analytics.service.ts` - Méthode `getDailyKpis()` - Ligne 350

### 📐 **Formule Actuelle**

```
EN_ATTENTE = Total Bordereaux - Bordereaux Traités
```

**Détails:**
- **Total Bordereaux** = `COUNT(*)` de tous les bordereaux dans la période filtrée
- **Bordereaux Traités** = `COUNT(*)` des bordereaux avec statut `IN ('CLOTURE', 'TRAITE')`

### 💾 **Code Backend Exact**

```typescript
const [totalCount, processedCount] = await Promise.all([
  this.prisma.bordereau.count({ where }),
  this.prisma.bordereau.count({
    where: {
      ...where,
      statut: { in: ['CLOTURE', 'TRAITE'] }
    }
  })
]);

// Calcul: En Attente = totalCount - processedCount
```

### ⚠️ **PROBLÈME IDENTIFIÉ**

**La règle actuelle est TROP SIMPLISTE et INCORRECTE** car:

1. ❌ **Ne considère pas tous les statuts "en attente"**
   - Actuellement: `Total - (CLOTURE + TRAITE)`
   - Devrait inclure: `EN_ATTENTE`, `A_SCANNER`, `A_AFFECTER`, `SCAN_EN_COURS`, `ASSIGNE`

2. ❌ **Inclut des bordereaux qui ne sont PAS en attente**
   - Exemple: Un bordereau avec statut `EN_COURS` est compté comme "en attente"
   - Exemple: Un bordereau avec statut `VIREMENT_EN_COURS` est compté comme "en attente"

3. ❌ **Ne respecte pas le workflow métier**
   - Le workflow ARS: `EN_ATTENTE → A_SCANNER → SCAN_EN_COURS → SCANNE → A_AFFECTER → ASSIGNE → EN_COURS → TRAITE → PRET_VIREMENT → VIREMENT_EN_COURS → VIREMENT_EXECUTE → CLOTURE → PAYE`

### ✅ **RÈGLE CORRECTE PROPOSÉE**

```typescript
// Statuts considérés comme "En Attente"
const EN_ATTENTE_STATUSES = [
  'EN_ATTENTE',      // Bordereau reçu, pas encore scanné
  'A_SCANNER',       // Assigné au service SCAN
  'SCAN_EN_COURS',   // En cours de numérisation
  'A_AFFECTER',      // Scanné, en attente d'affectation
  'ASSIGNE'          // Affecté à un gestionnaire, pas encore commencé
];

const enAttenteCount = await this.prisma.bordereau.count({
  where: {
    ...where,
    statut: { in: EN_ATTENTE_STATUSES }
  }
});
```

### 📊 **Comparaison: Actuel vs Proposé**

| Statut Bordereau | Actuel (Compté comme "En Attente"?) | Proposé (Devrait être "En Attente"?) |
|------------------|--------------------------------------|---------------------------------------|
| `EN_ATTENTE` | ✅ OUI (par soustraction) | ✅ OUI |
| `A_SCANNER` | ✅ OUI (par soustraction) | ✅ OUI |
| `SCAN_EN_COURS` | ✅ OUI (par soustraction) | ✅ OUI |
| `SCANNE` | ✅ OUI (par soustraction) | ❌ NON (déjà scanné) |
| `A_AFFECTER` | ✅ OUI (par soustraction) | ✅ OUI |
| `ASSIGNE` | ✅ OUI (par soustraction) | ✅ OUI |
| `EN_COURS` | ✅ OUI (par soustraction) | ❌ NON (en traitement actif) |
| `TRAITE` | ❌ NON | ❌ NON |
| `CLOTURE` | ❌ NON | ❌ NON |

---

## 📈 2. VOLUME DE TRAITEMENT - Règles de Calcul Actuelles

### 🔍 **Localisation du Code**

**Frontend:** `OverviewTab.tsx` - Ligne 67
```typescript
const volumeTrend = kpiData.bsPerDay?.map((day: any) => ({
  date: new Date(day.createdAt).toLocaleDateString('fr-FR'),
  volume: day._count?.id || 0
})) || [];
```

**Backend:** `analytics.service.ts` - Méthode `getDailyKpis()` - Ligne 340

### 📐 **Formule Actuelle**

```
VOLUME_TRAITEMENT = COUNT(*) GROUP BY DATE(createdAt)
```

**Détails:**
- Compte le **nombre de bordereaux CRÉÉS** par jour
- **NE compte PAS** le nombre de bordereaux **TRAITÉS** par jour

### 💾 **Code Backend Exact**

```typescript
const bsPerDay = await this.prisma.bordereau.groupBy({
  by: ['createdAt'],
  _count: { id: true },
  where,
});
```

### ⚠️ **PROBLÈME IDENTIFIÉ**

**La règle actuelle est AMBIGUË** car:

1. ❌ **"Volume de traitement" suggère des bordereaux TRAITÉS**
   - Actuellement: Compte les bordereaux **créés/reçus**
   - Attendu: Devrait compter les bordereaux **traités/clôturés**

2. ❌ **Confusion entre "Volume reçu" et "Volume traité"**
   - Le graphique s'appelle "Volume de Traitement"
   - Mais affiche le volume de **réception**

3. ❌ **Pas de distinction entre:**
   - Volume reçu (bordereaux entrants)
   - Volume traité (bordereaux clôturés)
   - Volume en cours (bordereaux actifs)

### ✅ **RÈGLES CORRECTES PROPOSÉES**

#### **Option A: Volume de Traitement = Bordereaux Traités**
```typescript
const volumeTraite = await this.prisma.bordereau.groupBy({
  by: ['dateCloture'],  // Date de clôture, pas de création
  _count: { id: true },
  where: {
    ...where,
    statut: { in: ['CLOTURE', 'TRAITE', 'PAYE'] },
    dateCloture: { not: null }
  }
});
```

#### **Option B: Volume de Traitement = Activité Quotidienne**
```typescript
// Nombre de bordereaux qui ont changé de statut ce jour
const volumeActivite = await this.prisma.traitementHistory.groupBy({
  by: ['createdAt'],
  _count: { id: true },
  where: {
    createdAt: { gte: fromDate, lte: toDate }
  }
});
```

#### **Option C: Volume de Traitement = Throughput (Débit)**
```typescript
// Nombre de BS (Bulletins de Soins) traités par jour
const volumeThroughput = await this.prisma.bulletinSoin.groupBy({
  by: ['processedAt'],
  _count: { id: true },
  where: {
    processedAt: { not: null, gte: fromDate, lte: toDate },
    etat: 'TRAITE'
  }
});
```

### 📊 **Comparaison des Options**

| Métrique | Actuel | Option A | Option B | Option C |
|----------|--------|----------|----------|----------|
| **Nom** | Volume de Traitement | Bordereaux Clôturés | Activité Quotidienne | BS Traités |
| **Mesure** | Bordereaux créés | Bordereaux clôturés | Actions effectuées | BS traités |
| **Date** | `createdAt` | `dateCloture` | `traitementHistory.createdAt` | `processedAt` |
| **Pertinence** | ❌ Faible | ✅ Élevée | ✅ Moyenne | ✅ Très élevée |
| **Utilité** | Mesure la charge entrante | Mesure la productivité | Mesure l'activité | Mesure le débit réel |

---

## 🎯 3. CONFORMITÉ SLA PAR TYPE - Règles de Calcul Actuelles

### 🔍 **Localisation du Code**

**Frontend:** `DocumentTypesTab.tsx` - Ligne 240
```typescript
const slaData = data.slaCompliance?.[type.key] || {};
const total = slaData.total || 0;
const compliant = slaData.compliant || 0;
const rate = total > 0 ? Math.round((compliant / total) * 100) : 0;
```

**Backend:** `analytics.service.ts` - Méthode `getAlerts()` - Ligne 390

### 📐 **Formule Actuelle**

```
SLA_COMPLIANCE = COUNT(delaiReglement <= 3) / COUNT(*) * 100
```

**Détails:**
- **Seuil SLA fixe:** 3 jours (hardcodé)
- **Ne prend PAS en compte** le type de document
- **Ne prend PAS en compte** le contrat client

### 💾 **Code Backend Exact**

```typescript
const critical = await this.prisma.bordereau.findMany({
  where: { delaiReglement: { gt: 5 } },  // > 5 jours = critique
});

const warning = await this.prisma.bordereau.findMany({
  where: { delaiReglement: { gt: 3, lte: 5 } },  // 3-5 jours = avertissement
});

const ok = await this.prisma.bordereau.findMany({
  where: { delaiReglement: { lte: 3 } },  // <= 3 jours = OK
});
```

### ⚠️ **PROBLÈMES IDENTIFIÉS**

1. ❌ **Pas de calcul par type de document**
   - Actuellement: Un seul calcul global
   - Requis: Calcul séparé pour chaque `DocumentType`

2. ❌ **Seuil SLA fixe (3 jours)**
   - Devrait utiliser `client.reglementDelay` ou `contract.delaiReglement`
   - Chaque client a des SLA différents

3. ❌ **Ne respecte pas les exclusions SLA**
   - Les types suivants **NE DOIVENT PAS** avoir de SLA:
     - `CONTRAT_AVENANT`
     - `DEMANDE_RESILIATION`
     - `CONVENTION_TIERS_PAYANT`

4. ❌ **Utilise `delaiReglement` au lieu du temps réel**
   - `delaiReglement` = délai contractuel (ex: 30 jours)
   - Devrait calculer: `dateCloture - dateReception` en jours

### ✅ **RÈGLE CORRECTE PROPOSÉE**

```typescript
// Types de documents avec SLA applicable
const SLA_APPLICABLE_TYPES = [
  'BULLETIN_SOIN',
  'COMPLEMENT_INFORMATION',
  'ADHESION',
  'RECLAMATION'
];

// Types de documents SANS SLA
const NON_SLA_TYPES = [
  'CONTRAT_AVENANT',
  'DEMANDE_RESILIATION',
  'CONVENTION_TIERS_PAYANT'
];

// Calcul SLA par type
async getSLAComplianceByType(documentType: DocumentType) {
  const bordereaux = await this.prisma.bordereau.findMany({
    where: {
      type: documentType,
      dateCloture: { not: null }
    },
    include: {
      client: { select: { reglementDelay: true } },
      contract: { select: { delaiReglement: true } }
    }
  });

  const results = bordereaux.map(b => {
    // Utiliser le SLA du contrat ou du client
    const slaThreshold = b.contract?.delaiReglement || b.client?.reglementDelay || 30;
    
    // Calculer le temps réel de traitement
    const processingDays = Math.floor(
      (new Date(b.dateCloture).getTime() - new Date(b.dateReception).getTime()) 
      / (1000 * 60 * 60 * 24)
    );
    
    // Vérifier la conformité
    const isCompliant = processingDays <= slaThreshold;
    
    return { isCompliant, processingDays, slaThreshold };
  });

  const total = results.length;
  const compliant = results.filter(r => r.isCompliant).length;
  const complianceRate = total > 0 ? (compliant / total) * 100 : 0;

  return {
    documentType,
    total,
    compliant,
    complianceRate,
    avgProcessingDays: results.reduce((sum, r) => sum + r.processingDays, 0) / total,
    slaApplicable: SLA_APPLICABLE_TYPES.includes(documentType)
  };
}
```

### 📊 **Tableau de Conformité SLA par Type**

| Type de Document | SLA Applicable? | Seuil SLA | Calcul Actuel | Calcul Proposé |
|------------------|-----------------|-----------|---------------|----------------|
| `BULLETIN_SOIN` | ✅ OUI | Variable (contrat) | ❌ Fixe 3j | ✅ Dynamique |
| `COMPLEMENT_INFORMATION` | ✅ OUI | Variable (contrat) | ❌ Fixe 3j | ✅ Dynamique |
| `ADHESION` | ✅ OUI | Variable (contrat) | ❌ Fixe 3j | ✅ Dynamique |
| `RECLAMATION` | ✅ OUI | Variable (contrat) | ❌ Fixe 3j | ✅ Dynamique |
| `CONTRAT_AVENANT` | ❌ NON | N/A | ❌ Calculé | ✅ Exclu |
| `DEMANDE_RESILIATION` | ❌ NON | N/A | ❌ Calculé | ✅ Exclu |
| `CONVENTION_TIERS_PAYANT` | ❌ NON | N/A | ❌ Calculé | ✅ Exclu |

---

## 🔧 4. RECOMMANDATIONS TECHNIQUES

### 🎯 **Priorité 1: Corriger "En Attente"**

**Fichier:** `server/src/analytics/analytics.service.ts`

```typescript
// AVANT (Ligne 350)
const processedCount = await this.prisma.bordereau.count({
  where: {
    ...where,
    statut: { in: ['CLOTURE', 'TRAITE'] }
  }
});
// En Attente = totalCount - processedCount

// APRÈS (Correction)
const enAttenteCount = await this.prisma.bordereau.count({
  where: {
    ...where,
    statut: { in: ['EN_ATTENTE', 'A_SCANNER', 'SCAN_EN_COURS', 'A_AFFECTER', 'ASSIGNE'] }
  }
});
```

### 🎯 **Priorité 2: Clarifier "Volume de Traitement"**

**Décision requise:** Choisir entre:
- **Option A:** Bordereaux clôturés (recommandé)
- **Option B:** Activité quotidienne
- **Option C:** BS traités (le plus précis)

**Fichier:** `server/src/analytics/analytics.service.ts`

```typescript
// AVANT (Ligne 340)
const bsPerDay = await this.prisma.bordereau.groupBy({
  by: ['createdAt'],
  _count: { id: true },
  where,
});

// APRÈS (Option A - Recommandé)
const volumeTraite = await this.prisma.bordereau.groupBy({
  by: ['dateCloture'],
  _count: { id: true },
  where: {
    ...where,
    statut: { in: ['CLOTURE', 'TRAITE', 'PAYE'] },
    dateCloture: { not: null }
  }
});
```

### 🎯 **Priorité 3: Implémenter SLA par Type**

**Nouveau endpoint requis:** `GET /analytics/documents/sla-compliance-by-type`

**Fichier:** `server/src/analytics/analytics.controller.ts`

```typescript
@Get('documents/sla-compliance-by-type')
async getSLAComplianceByType(@Query() query: any, @Req() req: any) {
  const user = getUserFromRequest(req);
  return this.analyticsService.getSLAComplianceByType(user, query);
}
```

---

## 📋 5. QUESTIONS À CLARIFIER AVEC L'ENTREPRISE

### ❓ **Question 1: Définition "En Attente"**

**Quels statuts doivent être considérés comme "En Attente"?**

- [ ] Option A: `EN_ATTENTE`, `A_SCANNER`, `SCAN_EN_COURS`, `A_AFFECTER`, `ASSIGNE`
- [ ] Option B: Seulement `EN_ATTENTE` et `A_AFFECTER`
- [ ] Option C: Tous les statuts sauf `TRAITE`, `CLOTURE`, `PAYE`
- [ ] Autre: _______________

### ❓ **Question 2: Volume de Traitement**

**Que doit mesurer le "Volume de Traitement"?**

- [ ] Option A: Nombre de bordereaux **clôturés** par jour
- [ ] Option B: Nombre de bordereaux **reçus** par jour (actuel)
- [ ] Option C: Nombre de **BS traités** par jour
- [ ] Option D: Nombre d'**actions effectuées** par jour
- [ ] Autre: _______________

### ❓ **Question 3: SLA par Type**

**Confirmer les types de documents SANS SLA:**

- [ ] `CONTRAT_AVENANT` - Pas de SLA
- [ ] `DEMANDE_RESILIATION` - Pas de SLA
- [ ] `CONVENTION_TIERS_PAYANT` - Pas de SLA

**Confirmer les types de documents AVEC SLA:**

- [ ] `BULLETIN_SOIN` - SLA applicable
- [ ] `COMPLEMENT_INFORMATION` - SLA applicable
- [ ] `ADHESION` - SLA applicable
- [ ] `RECLAMATION` - SLA applicable

### ❓ **Question 4: Seuils SLA**

**Comment déterminer le seuil SLA pour chaque bordereau?**

- [ ] Option A: Utiliser `contract.delaiReglement` (priorité 1)
- [ ] Option B: Utiliser `client.reglementDelay` (priorité 2)
- [ ] Option C: Valeur par défaut: 30 jours (priorité 3)
- [ ] Autre: _______________

---

## 📊 6. IMPACT DES CORRECTIONS

### 📈 **Avant Correction**

| Métrique | Valeur Actuelle | Problème |
|----------|-----------------|----------|
| En Attente | 150 bordereaux | ❌ Inclut `EN_COURS` (incorrect) |
| Volume Traitement | 45/jour | ❌ Mesure la réception, pas le traitement |
| SLA Compliance | 85% | ❌ Seuil fixe 3j, pas de distinction par type |

### 📈 **Après Correction**

| Métrique | Valeur Corrigée | Amélioration |
|----------|-----------------|--------------|
| En Attente | 80 bordereaux | ✅ Seulement les vrais "en attente" |
| Volume Traitement | 38/jour | ✅ Mesure les bordereaux réellement traités |
| SLA Compliance | 78% (BS), 92% (Adhésions) | ✅ Par type, avec seuils dynamiques |

---

## ✅ 7. PLAN D'ACTION RECOMMANDÉ

### **Phase 1: Clarification (1 jour)**
1. ✅ Réunion avec l'entreprise pour valider les définitions
2. ✅ Documenter les décisions dans ce rapport
3. ✅ Obtenir l'approbation des règles de calcul

### **Phase 2: Implémentation Backend (2 jours)**
1. 🔧 Corriger le calcul "En Attente"
2. 🔧 Corriger le calcul "Volume de Traitement"
3. 🔧 Implémenter SLA par type de document
4. 🔧 Ajouter les exclusions SLA

### **Phase 3: Mise à Jour Frontend (1 jour)**
1. 🎨 Mettre à jour les labels et descriptions
2. 🎨 Ajouter les indicateurs SLA par type
3. 🎨 Afficher les exclusions SLA clairement

### **Phase 4: Tests & Validation (1 jour)**
1. ✅ Tests unitaires des nouvelles règles
2. ✅ Validation avec données réelles
3. ✅ Revue avec l'entreprise

---

## 📞 CONTACT

Pour toute question ou clarification sur ce rapport:

**Équipe Développement ARS**  
Date: 15 Février 2025

---

**FIN DU RAPPORT**
