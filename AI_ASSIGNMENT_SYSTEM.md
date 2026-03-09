# 🤖 Système d'Assignation IA - Module Bulletin de Soins

## 📋 Vue d'ensemble

Système intelligent d'assignation et de rééquilibrage des dossiers basé sur l'analyse de la charge de travail, performances historiques et respect des SLA.

---

## 🎯 Fonctionnalités

### 1. **Suggestions d'Assignation IA**
- Classement des gestionnaires par score de disponibilité
- Recommandation du meilleur gestionnaire pour nouveaux dossiers
- Affichage des raisons de recommandation

### 2. **Suggestions de Rééquilibrage**
- Détection automatique des déséquilibres de charge
- Propositions de transferts BULK entre gestionnaires
- Calcul d'impact et priorité

### 3. **Modal Explicatif**
- Bouton "ℹ️ Comment ça marche ?" 
- Explication complète du système de scoring
- Diagrammes ASCII du flux
- Glossaire des termes

---

## 🔧 Backend

### Endpoints

#### **GET** `/api/bulletin-soin/ai-suggestions`
Retourne les suggestions d'assignation IA.

**Response:**
```json
{
  "suggestions": [
    {
      "assignee": "Marwen Jamazi",
      "score": 0.52,
      "confidence": "MEDIUM",
      "reasoning": [
        "Efficacité: 0%",
        "Charge: 25 éléments (25 docs, 0 BS, 0 bord, 0 récl)",
        "Retards: 0 éléments",
        "SLA: 100%"
      ]
    }
  ]
}
```

#### **GET** `/api/bulletin-soin/rebalancing-suggestions`
Retourne les suggestions de rééquilibrage.

**Response:**
```json
{
  "suggestions": [
    {
      "from": "Siwar Ben Ftima",
      "to": "Marwen Jamazi",
      "count": 52,
      "type": "documents",
      "priority": "URGENT",
      "impact": "Élevé",
      "reason": "Transférer 52 documents..."
    }
  ]
}
```

### Service: `bulletin-soin.service.ts`

**Algorithme de Scoring:**
```typescript
Score = (workloadScore × 40%) + (efficiencyScore × 25%) + 
        (slaScore × 20%) + (delayScore × 15%)
```

**Calculs:**
- `workloadScore = 1 - (currentLoad / maxLoad)`
- `efficiencyScore = completedTasks / totalAssigned`
- `slaScore = onTimeTasks / totalCompleted`
- `delayScore = 1 - (delayedTasks / totalAssigned)`

**Rééquilibrage:**
1. Identifier surchargés (charge > moyenne + 20%)
2. Trier par charge croissante
3. Transférer vers moins chargés
4. Éviter doublons d'assignation
5. Recalculer après chaque transfert

---

## 🎨 Frontend

### Composants

#### **AssignmentSuggestions.tsx**
- Affiche liste des gestionnaires classés par score
- Badge "RECOMMANDÉ" pour le meilleur
- Barre de progression du score
- Raisons de recommandation avec icônes

#### **RebalancingSuggestions.tsx**
- Cartes de suggestions de transfert
- Indicateurs de priorité (URGENT/MEDIUM/LOW)
- Flèches visuelles source → destination
- Compteur de documents à transférer

#### **EnhancedDashboard.tsx**
- Section "Module Bulletin de Soins"
- Bouton "Comment ça marche ?"
- Modal explicatif avec:
  - Formules de calcul
  - Diagrammes ASCII
  - Glossaire des termes

### Modal Explicatif

**Contenu:**
1. Système de Notation (formules)
2. Calcul de la Charge
3. Rééquilibrage Intelligent (algorithme)
4. Diagramme ASCII du flux
5. Glossaire (Efficacité, Charge, SLA, Retards, Score)

---

## 📊 Vérification

### Script: `verify-ai-counts.ts`

**Commande:**
```bash
npm run verify:ai
```

**Fonction:**
- Vérifie les comptes de documents par gestionnaire
- Compare frontend vs database
- Affiche breakdown par type
- Calcule efficacité réelle

**Output:**
```
👤 Marwen Jamazi
📁 Documents: 25 total
   - BULLETIN_SOIN: 21
   - COMPLEMENT_INFORMATION: 4
✅ TOTAL CHARGE: 25 éléments
📈 EFFICIENCY: 0% (0 completed / 25 total)
```

---

## 🔑 Points Clés

### Pondération des Critères
- **Charge: 40%** (priorité maximale)
- **Efficacité: 25%**
- **SLA: 20%**
- **Retards: 15%**

### Seuils
- Déséquilibre: charge > moyenne + 20%
- Score MEDIUM: 0.4 - 0.6
- Score HIGH: > 0.6
- Score LOW: < 0.4

### Types de Documents
- Documents (BULLETIN_SOIN, COMPLEMENT_INFORMATION)
- Bulletins de Soin (BS)
- Bordereaux
- Réclamations

---

## 📁 Fichiers Modifiés

**Backend:**
- `server/src/services/bulletin-soin.service.ts`
- `server/scripts/verify-ai-counts.ts`
- `server/package.json` (script verify:ai)

**Frontend:**
- `frontend/src/components/BS/AssignmentSuggestions.tsx`
- `frontend/src/components/BS/RebalancingSuggestions.tsx`
- `frontend/src/components/EnhancedDashboard.tsx`

---

## ✅ Tests de Validation

1. ✅ Scores calculés correctement (formule vérifiée)
2. ✅ Comptes documents = DB (script verify:ai)
3. ✅ Rééquilibrage distribue équitablement
4. ✅ Modal explicatif affiche toutes les infos
5. ✅ Frontend affiche données exactes

---

## 🚀 Améliorations Futures

- Prédiction de charge (workload prévu)
- Historique des performances par gestionnaire
- Suggestions basées sur type de dossier
- Machine learning pour optimisation continue
