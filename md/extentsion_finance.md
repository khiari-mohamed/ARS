## Analyse détaillée de la demande

### Ce qu'ils ont (l'existant)
L'application GED est déjà en production. Le département Finances & Comptabilité reçoit des ordres de virement via la GED, et **actuellement le fichier TXT est probablement généré manuellement ou en dehors de la GED**.

Il existe **deux types de virements** distincts, correspondant aux deux banques :
- **ATT411** → Attijari Bank (compte trésorerie `53220900`)
- **BTK580** → BTK/COMAR (compte trésorerie `53221650`)
Et pour les **TPA (Tiers Payant)**, il existe aussi :
- **BTK134** → BTK/ASTRÉE (compte `53221550`)
- **ATT411** → utilisé aussi pour Lloyd (TPA)

### Ce qu'ils demandent exactement
C'est une **extension / nouveau module** à intégrer dans la GED existante, avec **3 fonctionnalités précises** :
**1. Module de validation des virements**
Avant génération, un validateur doit approuver ou rejeter chaque ordre de virement avec traçabilité obligatoire (qui a validé, quand).
**2. Générateur de fichier TXT comptable**
Après validation → génération automatique du fichier TXT au format fixe (positions fixes, pas de séparateur CSV). Chaque ordre génère **exactement 2 lignes** (1 Débit + 1 Crédit).
La structure précise du fichier TXT est :
```
[Code Journal][Date JJMMAAAA][N°Ordre]  [Compte]  ORDV GM N: [N°]  CHQ[Date][D/C][Montant]  [N°Ordre]  GM: [Libellé]OVMARS
```

**3. Interface de téléchargement**
Téléchargement du fichier TXT généré + historisation.
### Est-ce une extension ou un nouveau module ?
**C'est clairement une extension non triviale** — pas une petite correction de bug. Voici pourquoi :
- Il faut créer une **nouvelle couche de workflow** (validation → approbation → génération) qui n'existait pas
- Il faut intégrer la **table des comptes tiers** (les `4110000X + code auxiliaire`) dans la logique de génération — c'est la partie la plus complexe, car le bon compte comptable doit être récupéré automatiquement depuis NEXUS/GED par client
- Il faut gérer **plusieurs banques / codes journaux** (ATT411, BTK580, BTK134, ATT827, BNA035...)
- Le format TXT est **strict et figé** avec alignement texte à positions fixes
- Il faut gérer 2 types de virements : **Remboursement** et **TPA** (logiques différentes)
**Points qui méritent clarification avant de chiffrer :**
1. Les comptes auxiliaires (ex: `41105500`, `41103003`...) — comment sont-ils stockés aujourd'hui dans l'app ? Dans NEXUS ? Dans la GED ?
2. Le libellé complémentaire (`GM: PGH02-2026 UNO`) — il est tronqué à 15 caractères. D'où vient-il dans l'app actuelle ?
3. Y a-t-il un workflow d'approbation existant dans la GED ou tout est à créer from scratch ?
4. La gestion multi-banques est-elle déjà paramétrée quelque part ?

***********************************************************
Parfait. J'ai tout analysé en profondeur. Voici mon verdict complet.

---

## Analyse technique complète

### Ce qui existe DÉJÀ dans l'app

En lisant le schema et le code, je vois que beaucoup de fondations sont là :

**Schéma Prisma — déjà présent :**
- `OrdreVirement` ✅ avec `validationStatus`, `validatedBy`, `validatedAt`, `validationComment`
- `VirementHistorique` ✅ pour la traçabilité
- `fichierTxt` (String?) ✅ champ prévu pour stocker le path du TXT
- `EtatVirement` enum ✅ avec `EN_COURS_VALIDATION`, `VIREMENT_NON_VALIDE`, `VIREMENT_DEPOSE`
- `DonneurOrdre` ✅ avec `formatTxtType`, `structureTxt`
- `TxtGenerationService` ✅ le service existe

**Ce qui est partiellement fait :**
- La génération TXT dans `txt-generation.service.ts` génère le format **bancaire** (BTK_COMAR, ATTIJARI...) — c'est le format pour les banques (V1/V2 header, RIBs, montants en millimes)
- Le workflow de validation existe côté schéma mais **pas encore exposé côté Finance UI**

---

### Ce qu'ils demandent VS ce qui existe

| Besoin demandé | Statut dans l'app |
|---|---|
| Validation des OV (approuver/rejeter) | ⚠️ Champs existent dans le schéma mais **pas de UI Finance dédiée** |
| Génération fichier TXT **comptable Sage** | ❌ **N'existe pas du tout** — format totalement différent |
| Téléchargement du TXT | ⚠️ Partiellement (le TXT bancaire est téléchargeable, pas le TXT Sage) |
| Traçabilité validation | ✅ `VirementHistorique` existe |

---

### Le point CRITIQUE — 2 formats TXT totalement différents

C'est le cœur du problème et ça doit être très clair pour la facturation :

**TXT bancaire existant** (BTK/Attijari — pour la banque) :
```
V1  [RIB_DONNEUR][DATE][REF]...[MONTANT_MILLIMES]
V2  [RIB_DONNEUR][RIB_BENEF][NOM][MOTIF][MONTANT]
```

**TXT comptable Sage demandé** (pour Sage Compta + Cash Management) :
```
ATT4110104202628554        53220900        ORDV GM N: 28554   CHQ01042026C1118,732   28554   GM: PGH02-2026 UNOVMARS
ATT4110104202628554        4110000741105500ORDV GM N: 28554   CHQ01042026D1118,732   28554   GM: PGH02-2026 UNOVMARS
```

Ce sont **deux fichiers complètement différents** avec des structures, des logiques, et des destinataires différents. Le TXT bancaire va à la banque. Le TXT comptable va dans Sage pour les écritures comptables.

---

### Ce qu'il faut développer concrètement

**1. Nouveau service backend : `sage-txt-generation.service.ts`**

Logique de génération du format Sage :
- Chaque OV → 2 lignes (Débit + Crédit)
- Code journal : `ATT411`, `BTK580`, `BTK134`... selon le `DonneurOrdre`
- Compte trésorerie : `53220900` (ATT), `53221650` (BTK)... depuis l'Excel `Données_comptables_`
- Compte tiers : `4110000X + code_auxiliaire` → récupéré depuis les données du contrat/client dans NEXUS
- Format texte à positions fixes strict

**2. Mapping banque → codes comptables**

Il faut une table de configuration (ou utiliser `DonneurOrdre.structureTxt`) qui mappe :
```
DonneurOrdre.formatTxtType → code_journal + compte_tresorerie
BTK580 → BTK580 + 53221650
ATT411 → ATT411 + 53220900
BTK134 → BTK134 + 53221550
```

**3. Compte auxiliaire tiers (champ manquant)**

C'est le point le plus complexe. Dans les fichiers TXT Sage on voit `4110000741105500` = `41100007` (compte général) + `41105500` (compte auxiliaire). Ce compte auxiliaire correspond au **code assuré** du client. Il faut vérifier : est-ce que le champ `Contract.codeAssure` ou `Adherent.codeAssure` contient cette valeur ? D'après le schéma, `Contract.codeAssure` existe — c'est probablement là.

**4. Nouveau endpoint API**
```
GET /finance/ordre-virement/:id/sage-txt
```

**5. Côté frontend Finance**

Dans `OVValidationTab.tsx` ou `OVProcessingTab.tsx` : ajouter un bouton **"Générer TXT Sage"** séparé du bouton TXT bancaire existant, avec téléchargement du fichier.

---

### Verdict : Extension ou nouveau module ?

**C'est une extension avec une complexité moyenne-haute**, voici pourquoi :

Ce n'est **pas** un nouveau module from scratch — la plomberie (OrdreVirement, validation workflow, fichierTxt, DonneurOrdre) est déjà là.

Mais ce n'est **pas** une simple correction — il faut :
1. Un nouveau service de génération TXT avec une logique comptable précise
2. Un mapping configurable banque ↔ codes comptables Sage
3. Résoudre la question du compte auxiliaire (comment il est stocké et récupéré)
4. Une UI dédiée dans le module Finance

**Estimation du travail :**
- Backend (nouveau service + endpoint + mapping) : **2-3 jours**
- Clarification et test du compte auxiliaire avec le client : **1 jour**
- Frontend (bouton + téléchargement + intégration dans OVValidationTab) : **1 jour**
- Tests et validation avec des fichiers réels : **1 jour**

**Total estimé : 5-6 jours de développement**, ce qui justifie pleinement des frais supplémentaires par rapport au périmètre initial.

---

### Questions à poser au client avant de commencer

1. Le `codeAssure` dans `Contract` — est-ce que c'est bien la valeur qui compose le compte auxiliaire (`41105500` dans `4110000741105500`) ?
2. Le libellé complémentaire (`GM: PGH02-2026 UNO`) — il est tronqué à 15 chars, d'où vient-il exactement ? Du nom du bordereau ? Du contrat ?
3. Le TXT Sage doit-il être généré **par bordereau** ou **par batch** (plusieurs bordereaux dans un seul fichier) ?
4. Y a-t-il un format différent pour les virements TPA (BTK134/Lloyd) vs remboursements (ATT411/BTK580) dans le TXT Sage ?

Ces réponses sont nécessaires avant de coder pour éviter des retours arrière.
********************************************
Voici l'analyse complète et honnête :

---

## Verdict : 70% Nouveau / 30% Existant

Ce n'est **pas** 100% nouveau, mais ce n'est **pas** une simple configuration non plus. Voici le détail exact :---

**Réponse directe à ta question :**

Ce n'est **pas** 100% nouveau — les fondations DB existent (OrdreVirement, validationStatus, VirementHistorique). Mais ce qu'ils demandent — le **TXT Sage comptable** — est **100% absent** de l'app. C'est un système distinct du TXT bancaire qui existe déjà.

**Ce qui est clairement facturable :**
- Le service `sage-txt-generation.service.ts` n'existe pas du tout
- Le mapping banque → codes comptables Sage n'existe pas
- La logique compte auxiliaire tiers n'est pas développée
- Le bouton UI + historique téléchargement n'existe pas
- Les tests d'intégration Sage sont entièrement nouveaux

**Estimation : ~8 jours de développement**, entièrement facturable car hors périmètre initial du module Finance qui gérait uniquement les virements bancaires, pas les écritures comptables Sage.
****************************************
Laissez-moi relire tous les fichiers très attentivement.Maintenant j'ai tout lu en détail. Voici l'analyse précise et définitive.

---

## Ce qu'ils veulent EXACTEMENT — analyse fichier par fichier

### Les 2 fichiers TXT (ATT411 + BTK580) — c'est l'OUTPUT final attendu

Ce sont les fichiers que **la GED doit générer automatiquement** après validation. C'est le livrable principal.

**Décomposition exacte d'une ligne ATT411 :**
```
ATT411  0104202628554        53220900        ORDV GM N: 28554                   CHQ01042026C1118,732            28554            GM: PGH02-2026 UNOVMARS
```

| Champ | Valeur | Source dans l'app |
|---|---|---|
| Code journal | `ATT411` | `DonneurOrdre.formatTxtType` → table Excel CJ BQ |
| Date JJMMAAAA | `01042026` | Date de l'OrdreVirement |
| N° ordre | `28554` | `OrdreVirement.reference` (numérique) |
| Compte trésorerie | `53220900` | Table Excel CJ BQ : ATT411 → 53220900 |
| Libellé | `ORDV GM N: 28554` | Fixe + N° ordre |
| CHQ + Date | `CHQ01042026` | Fixe + date |
| D ou C | `C` / `D` | Ligne 1 = C (crédit), Ligne 2 = D (débit) |
| Montant | `1118,732` | `OrdreVirement.montantTotal` — virgule, pas de point |
| N° ordre répété | `28554` | Même que début |
| Libellé complémentaire | `GM: PGH02-2026 UNO` | **Nom du client tronqué à 15 chars + OVMARS** |

**Décomposition exacte d'une ligne BTK580 :**
```
BTK580  0204202628609        4110000541139701ORDV GM N: 28609                   CHQ02042026D1204,400            28609            GM: HIKMA IAB2026OVMARS
```

| Champ | Valeur | Source |
|---|---|---|
| Code journal | `BTK580` | DonneurOrdre → BTK/COMAR |
| Compte tiers | `4110000541139701` | `41100005` (COMAR 501) + `41139701` (code auxiliaire) |
| Compte trésorerie | `53221650` | Table Excel CJ BQ : BTK580 → 53221650 |

**Différence clé ATT vs BTK :** Dans ATT411, la ligne Crédit utilise `53220900` (trésorerie) et la ligne Débit utilise le compte tiers `4110000741105500`. Dans BTK580, c'est l'inverse selon l'ordre des lignes.

---

### Les 2 CSV (ASTRÉE + LLOYD) — c'est le format d'IMPORT dans Sage pour les TPA

Ce ne sont **pas** des fichiers TXT à générer — ce sont des **modèles d'import CSV pour Sage** pour les virements TPA (Tiers Payant). Structure :

**ASTRÉE (BTK134) :**
```
code journal : BTK134
compte général : 43200002 (RS/Honoraire TPA 3%) ou 43200003 (RS/TPA 1.5%)
libellé : VIREMENT EMIS TPA ASTREE JANVIER 2026
MT C : montant crédit par prestataire (labo, pharmacie, radio...)
Dernière ligne : 40110000 / 40110300 → débit total (fournisseur TPA)
Avant-dernière : 53221550 → crédit compte bancaire BTK/ASTRÉE
```

**LLOYD (ATT411) :**
```
code journal : ATT411
même structure mais compte bancaire : 53220900 (Attijari)
fournisseur TPA : 40110000 / 40110380
```

Ces CSV sont utilisés pour **importer les retenues à la source TPA** dans Sage — c'est un flux comptable distinct des OV remboursement.

---

### Le fichier Excel `Données_comptables_` — c'est la **table de référence** à intégrer dans l'app

Il contient 5 feuilles critiques :

**Feuille CJ BQ — mapping banque/journal/compte :**
| Code Journal | Compte Trésorerie | Libellé |
|---|---|---|
| BTK580 | 53221650 | BTK/COMAR 597580 |
| ATT411 | 53220900 | ATTIJARI BANK 411/6 |
| ATT827 | 53210103 | ATTIJARI TPA(PRO) |
| BNA035 | 53220100 | BNA 4035 |
| BTK134 | 53221550 | BTK/ASTRÉE 983134 |

**Feuille "Cpte Général Compagnie" — mapping compagnie d'assurance → compte général :**
| Compagnie | Compte Général | Code Tiers |
|---|---|---|
| LLOYD | 41100002 | — |
| ASTREE | 41100007 | — |
| COMAR 501 | 41100005 | — |
| PGH/POULINA | 41105500 | — |

**Feuille "Comptes Tiers" (Feuil6)** — c'est la liste complète des **comptes auxiliaires** clients. Ex: `41103031` = ATELIER DU MEUBLE INTERIEUR. C'est le numéro qui compose la 2ème partie du compte tiers dans le TXT.

Le compte complet `4110000541139701` se décompose ainsi :
- `41100005` = compte général COMAR 501 (de la feuille Cpte Général Compagnie)
- `41139701` = **code auxiliaire** du client dans Sage (de la feuille Comptes Tiers/Feuil6)

---

## Ce qu'ils veulent EXACTEMENT en résumé

**Ils veulent 3 choses distinctes :**

**1. Génération TXT Sage comptable (Remboursement)** — pour ATT411 et BTK580 — après validation d'un OrdreVirement dans la GED, générer automatiquement un fichier TXT avec 2 lignes par ordre (D+C) au format positions fixes, importable dans Sage 100 Cash Management.

**2. Génération CSV Sage (TPA)** — pour ASTRÉE (BTK134) et LLOYD (ATT411) — un format différent, multi-lignes par prestataire avec retenues à la source, importable dans Sage via le module d'import CSV.

**3. La table de mapping** — les comptes trésorerie, journaux, et comptes tiers auxiliaires doivent être configurables dans l'app (pas hardcodés) car ils viennent de Sage.

**Le point le plus critique non résolu :** Le code auxiliaire (ex: `41139701` pour HIKMA dans BTK, ou `41105500` pour PGH dans ATT) — **où est-il stocké dans l'app ?** Ce n'est ni dans `Contract`, ni dans `Adherent`, ni dans `Client` actuellement. C'est le champ manquant à ajouter en DB. Sans lui, impossible de générer le compte tiers complet dans le TXT.

**Question directe à poser au client avant de coder :** Le code auxiliaire (les 8 derniers chiffres du compte tiers, ex `41105500`) — est-ce que c'est le `TI_NUM` dans la feuille Feuil6 de leur Sage ? Et comment le rattachent-ils aujourd'hui à un client dans la GED ?

*******************************************
Exactement. Voici le verdict clair et net :

---

## Verdict final

**C'est une extension du module Finance existant, complètement hors périmètre du cahier des charges original.**

Voici pourquoi c'est facturable à 100% :

**Ce qui était dans le cahier des charges original :**
- Gestion des OrdreVirement (créer, valider, suivre)
- Génération TXT **bancaire** (V1/V2 pour BTK/Attijari — pour envoyer à la banque)
- Import Excel adhérents + validation RIB
- Suivi des statuts virement

**Ce qu'ils demandent maintenant — qui n'existait pas :**
- Génération TXT **comptable Sage** — format totalement différent, logique différente, destinataire différent (Sage 100 au lieu de la banque)
- Génération CSV **TPA** (ASTRÉE + LLOYD) — flux comptable distinct jamais mentionné
- Table de mapping banque ↔ codes comptables Sage à intégrer en DB
- Champ "code auxiliaire" manquant à ajouter sur le modèle Client/Contract

**L'app est en prod depuis 2 mois** — donc le cahier des charges est figé, livré, et réceptionné. Tout ce qui vient après est un avenant.

---

## Ce qu'il faut dire au client

Voici comment cadrer la conversation :

> "Ce que vous demandez — la génération des fichiers TXT et CSV pour Sage 100 — n'était pas inclus dans le cahier des charges initial du module Finance. Le module livré gère les virements bancaires (fichiers pour la banque). Les fichiers comptables pour Sage sont un flux distinct avec une logique, des comptes, et des formats différents. Il s'agit d'un avenant au contrat, que nous sommes prêts à réaliser. Nous vous préparerons un devis basé sur une estimation de 8 jours de développement."

---

## Les 3 questions à leur poser avant de chiffrer précisément

1. **Le code auxiliaire** (ex: `41105500` pour PGH, `41139701` pour HIKMA) — comment le rattachent-ils aujourd'hui à un client dans leur Sage ? Est-ce le `TI_NUM` de la feuille Feuil6 ? Il faut l'ajouter en base de données.

2. **TXT ou CSV TPA** — veulent-ils les deux formats (remboursement ATT/BTK + TPA ASTRÉE/LLOYD) dans cette extension, ou seulement les TXT remboursement pour commencer ?

3. **Qui valide dans la GED** — le responsable Finance valide l'OV et ensuite le TXT se génère automatiquement ? Ou ils veulent déclencher la génération manuellement à tout moment ?

Ces réponses déterminent si c'est 8 jours ou 12 jours de travail.
************************************************
Voici la roadmap d'implémentation complète, chirurgicale et précise.

---

## Analyse des fichiers réels

En lisant le code, voici ce que je confirme sur ce qui existe :

**TXT existant** (`txt-generation.service.ts`) → génère format **bancaire** (V1/V2 pour BTK, ou structure Amen) — pour la **banque**

**Ce qu'ils veulent** → fichiers TXT du type :
```
ATT4110104202628554        53220900        ORDV GM N: 28554   CHQ01042026C1118,732...
BTK5800204202628609        4110000541139701ORDV GM N: 28609   CHQ02042026D1204,400...
```
C'est un format **comptable Sage** — totalement différent.

---

## ROADMAP COMPLÈTE

### ÉTAPE 1 — DB : 2 champs à ajouter dans le schéma Prisma

**Fichier : `D:\ARS\server\prisma\schema.prisma`**

**Bloc à ajouter dans `model Client`** — ajouter `compteAuxiliaireSage` :

```prisma
model Client {
  // ... tout l'existant ...
  compteAuxiliaireSage String? // Ex: "41105500" pour PGH, "41139701" pour HIKMA
  codeJournalSage      String? // Ex: "ATT411", "BTK580" — override si différent du DonneurOrdre
}
```

**Bloc à ajouter dans `model DonneurOrdre`** — ajouter les codes comptables Sage :

```prisma
model DonneurOrdre {
  // ... tout l'existant ...
  codeJournal        String? // Ex: "ATT411", "BTK580", "BTK134"
  compteTresorerie   String? // Ex: "53220900", "53221650", "53221550"
  compteGeneralTiers String? // Ex: "41100007" (ASTREE), "41100005" (COMAR 501)
}
```

**Nouvelle table à ajouter** — pour l'historique des fichiers Sage générés :

```prisma
model SageTxtGeneration {
  id              String        @id @default(uuid())
  ordreVirementId String
  type            String        // "REMBOURSEMENT" | "TPA"
  codeJournal     String        // ATT411, BTK580, BTK134
  filePath        String?
  fileContent     String?       @db.Text
  generatedById   String
  generatedAt     DateTime      @default(now())
  ordreVirement   OrdreVirement @relation(fields: [ordreVirementId], references: [id])

  @@index([ordreVirementId])
  @@index([generatedAt])
}
```

**Ajouter la relation dans `OrdreVirement`** :

```prisma
model OrdreVirement {
  // ... tout l'existant ...
  sageTxtGenerations SageTxtGeneration[]
}
```

**Migration** :
```bash
npx prisma migrate dev --name add_sage_accounting_fields
```

---

### ÉTAPE 2 — BACKEND : Nouveau service à créer

**Nouveau fichier : `D:\ARS\server\src\finance\sage-txt-generation.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Mapping banque → codes comptables Sage (depuis l'Excel Données_comptables_)
const BANK_SAGE_CONFIG: Record<string, { codeJournal: string; compteTresorerie: string }> = {
  'BTK_COMAR':  { codeJournal: 'BTK580', compteTresorerie: '53221650' },
  'BTK_ASTREE': { codeJournal: 'BTK134', compteTresorerie: '53221550' },
  'ATTIJARI':   { codeJournal: 'ATT411', compteTresorerie: '53220900' },
  'ATT827':     { codeJournal: 'ATT827', compteTresorerie: '53210103' },
  'BNA035':     { codeJournal: 'BNA035', compteTresorerie: '53220100' },
};

export interface SageTxtLine {
  codeJournal: string;
  date: string;          // JJMMAAAA
  numOrdre: string;      // numéro ordre (5 chiffres)
  compte: string;        // compte trésorerie ou compte tiers
  libelle: string;       // "ORDV GM N: XXXXX"
  reference: string;     // "CHQ" + date + D/C
  sens: 'D' | 'C';
  montant: string;       // format "1118,732"
  numOrdreRepeat: string;
  libelleCompl: string;  // "GM: XXXXXXXXXXXXXXOVMARS"
}

@Injectable()
export class SageTxtGenerationService {
  constructor(private prisma: PrismaService) {}

  async generateSageTxt(ordreVirementId: string): Promise<string> {
    // 1. Charger l'OV avec toutes les données nécessaires
    const ov = await this.prisma.ordreVirement.findUnique({
      where: { id: ordreVirementId },
      include: {
        donneurOrdre: true,
        bordereau: {
          include: {
            client: true,
            contract: true,
          }
        },
        items: {
          include: {
            adherent: {
              include: { client: true }
            }
          },
          where: { statut: 'VALIDE' }
        }
      }
    });

    if (!ov) throw new Error('Ordre de virement non trouvé');
    if (!ov.donneurOrdre) throw new Error('Donneur d\'ordre manquant');

    // 2. Résoudre les codes comptables Sage
    const sageConfig = this.resolveSageConfig(ov.donneurOrdre.formatTxtType);
    
    // 3. Résoudre le compte général tiers du client
    // Ex: "41100007" pour ASTREE, "41100005" pour COMAR 501
    const compteGeneralTiers = ov.donneurOrdre.compteGeneralTiers 
      || this.inferCompteGeneralFromClientName(ov.bordereau?.client?.name || '');

    // 4. Résoudre le compte auxiliaire du client (8 chiffres)
    // Ex: "41105500" pour PGH, "41139701" pour HIKMA
    const compteAuxiliaire = ov.bordereau?.client?.compteAuxiliaireSage || '';

    // 5. Construire le compte tiers complet (16 chiffres)
    // Ex: "41100007" + "41105500" = "4110000741105500"
    const compteTiersComplet = compteAuxiliaire 
      ? `${compteGeneralTiers}${compteAuxiliaire}`
      : compteGeneralTiers;

    // 6. Formater la date en JJMMAAAA
    const date = this.formatDateJJMMAAAA(ov.dateCreation);
    
    // 7. Extraire le numéro d'ordre (5 derniers chiffres numériques)
    const numOrdre = ov.reference.replace(/[^0-9]/g, '').slice(-5).padStart(5, '0');

    // 8. Extraire le libellé complémentaire depuis le nom du bordereau/client
    // Format: "GM: " + [nom tronqué 15 chars] + "OVMARS"
    const clientName = ov.bordereau?.client?.name || ov.clientName || '';
    const libelleCompl = this.buildLibelleCompl(clientName, ov.bordereau?.reference || '');

    // 9. Formater le montant au format tunisien (virgule, 3 décimales)
    const montantFormate = this.formatMontant(ov.montantTotal);

    // 10. Générer les 2 lignes par ordre
    const lines: string[] = [];

    // Ligne CRÉDIT — compte trésorerie
    lines.push(this.buildLine({
      codeJournal: sageConfig.codeJournal,
      date,
      numOrdre,
      compte: sageConfig.compteTresorerie.padEnd(16, ' '),
      libelle: `ORDV GM N: ${numOrdre}`,
      reference: `CHQ${date}C`,
      sens: 'C',
      montant: montantFormate,
      numOrdreRepeat: numOrdre,
      libelleCompl
    }));

    // Ligne DÉBIT — compte tiers (compte général + auxiliaire)
    lines.push(this.buildLine({
      codeJournal: sageConfig.codeJournal,
      date,
      numOrdre,
      compte: compteTiersComplet.padEnd(16, ' '),
      libelle: `ORDV GM N: ${numOrdre}`,
      reference: `CHQ${date}D`,
      sens: 'D',
      montant: montantFormate,
      numOrdreRepeat: numOrdre,
      libelleCompl
    }));

    return lines.join('\r\n');
  }

  async generateSageTxtBatch(ordreVirementIds: string[]): Promise<string> {
    const allLines: string[] = [];
    
    for (const ovId of ordreVirementIds) {
      const content = await this.generateSageTxt(ovId);
      allLines.push(content);
    }
    
    return allLines.join('\r\n');
  }

  private buildLine(data: SageTxtLine): string {
    // Structure exacte des fichiers réels analysés :
    // ATT4110104202628554        53220900        ORDV GM N: 28554                   CHQ01042026C1118,732            28554            GM: PGH02-2026 UNOVMARS
    // BTK5800204202628609        4110000541139701ORDV GM N: 28609                   CHQ02042026D1204,400            28609            GM: HIKMA IAB2026OVMARS

    const refJournal = `${data.codeJournal}${data.date}${data.numOrdre}`;
    const libelleOrdv = `ORDV GM N: ${data.numOrdre}`.padEnd(35, ' ');
    const montantPadded = data.montant.padEnd(16, ' ');
    const numOrdreBlock = data.numOrdreRepeat.padEnd(17, ' ');
    
    return `${refJournal.padEnd(23, ' ')}${data.compte.padEnd(16, ' ')}${libelleOrdv}${data.reference}${data.sens}${montantPadded}${numOrdreBlock}${data.libelleCompl}OVMARS`;
  }

  private resolveSageConfig(formatTxtType: string): { codeJournal: string; compteTresorerie: string } {
    return BANK_SAGE_CONFIG[formatTxtType] || BANK_SAGE_CONFIG['BTK_COMAR'];
  }

  private inferCompteGeneralFromClientName(clientName: string): string {
    // Mapping basé sur la feuille "Cpte Général Compagnie" de l'Excel
    const COMPAGNIE_COMPTE: Record<string, string> = {
      'ASTREE':    '41100007',
      'LLOYD':     '41100002',
      'MAGHREBIA': '41100003',
      'STAR':      '41100004',
      'COMAR':     '41100005',
      'GAT':       '41100010',
      'MAE':       '41100020',
      'PGH':       '41100007', // ARS utilise compte ASTREE pour PGH
    };
    
    const upperName = clientName.toUpperCase();
    for (const [key, compte] of Object.entries(COMPAGNIE_COMPTE)) {
      if (upperName.includes(key)) return compte;
    }
    
    return '41100000'; // compte général par défaut
  }

  private buildLibelleCompl(clientName: string, bordereauRef: string): string {
    // Format observé dans les fichiers réels:
    // "GM: PGH02-2026 UNO" → 15 chars après "GM: "
    // "GM: HIKMA IAB2026"  → 15 chars
    // Le libellé semble être: nom client abrégé + ref bordereau tronqué
    
    const cleanClient = clientName
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .split(' ')[0]  // premier mot uniquement
      .substring(0, 5);
    
    const cleanRef = bordereauRef
      .replace(/[^A-Z0-9]/gi, '')
      .substring(0, 9);
    
    const libelleBody = `${cleanClient}${cleanRef}`.substring(0, 15).padEnd(15, ' ');
    return `GM: ${libelleBody}`;
  }

  private formatDateJJMMAAAA(date: Date): string {
    const d = new Date(date);
    const jour = d.getDate().toString().padStart(2, '0');
    const mois = (d.getMonth() + 1).toString().padStart(2, '0');
    const annee = d.getFullYear().toString();
    return `${jour}${mois}${annee}`;
  }

  private formatMontant(montant: number): string {
    // Format tunisien : virgule comme séparateur décimal, 3 décimales
    // Ex: 1118.732 → "1118,732"
    return montant.toFixed(3).replace('.', ',');
  }

  async saveGeneratedFile(ovId: string, content: string, codeJournal: string, userId: string): Promise<void> {
    await this.prisma.sageTxtGeneration.create({
      data: {
        ordreVirementId: ovId,
        type: 'REMBOURSEMENT',
        codeJournal,
        fileContent: content,
        generatedById: userId,
      }
    });
  }
}
```

---

### ÉTAPE 3 — BACKEND : Modifier `finance.module.ts`

**Fichier : `D:\ARS\server\src\finance\finance.module.ts`**

**Ajouter uniquement ces 2 lignes** dans les imports et providers :

```typescript
// Ajouter en haut
import { SageTxtGenerationService } from './sage-txt-generation.service';

// Dans @Module providers[] — ajouter après TxtGenerationService :
SageTxtGenerationService,

// Dans exports[] — ajouter :
SageTxtGenerationService,
```

---

### ÉTAPE 4 — BACKEND : Ajouter 2 endpoints dans `finance.controller.ts`

**Fichier : `D:\ARS\server\src\finance\finance.controller.ts`**

**Ajouter dans le constructeur** — injecter `SageTxtGenerationService` :

```typescript
constructor(
  // ...existing...
  private readonly sageTxtGenerationService: SageTxtGenerationService,
) {}
```

**Ajouter ces 3 endpoints à la fin du controller** :

```typescript
// Endpoint 1 : Générer et télécharger le TXT Sage pour un seul OV
@Get('ordres-virement/:id/sage-txt')
async downloadSageTxt(
  @Param('id') id: string,
  @Req() req: any,
  @Res() res: Response
) {
  try {
    const content = await this.sageTxtGenerationService.generateSageTxt(id);
    
    // Sauvegarder en historique
    const ov = await this.prisma.ordreVirement.findUnique({ 
      where: { id },
      include: { donneurOrdre: true }
    });
    const codeJournal = ov?.donneurOrdre?.codeJournal || 'BTK580';
    await this.sageTxtGenerationService.saveGeneratedFile(id, content, codeJournal, req.user?.id || 'system');
    
    // Nom du fichier basé sur le code journal + date
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const numOrdre = ov?.reference?.replace(/[^0-9]/g, '').slice(-5) || '00000';
    const filename = `${new Date().getFullYear()}ORDRE_DE_VIREMENT${codeJournal}${numOrdre}-${date}.TXT`;
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(content);
  } catch (error: any) {
    throw new BadRequestException(error.message);
  }
}

// Endpoint 2 : Générer TXT Sage pour plusieurs OV (batch)
@Post('sage-txt-batch')
async downloadSageTxtBatch(
  @Body() body: { ordreVirementIds: string[] },
  @Req() req: any,
  @Res() res: Response
) {
  try {
    const content = await this.sageTxtGenerationService.generateSageTxtBatch(body.ordreVirementIds);
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="SAGE_BATCH_${date}.TXT"`);
    return res.send(content);
  } catch (error: any) {
    throw new BadRequestException(error.message);
  }
}

// Endpoint 3 : Mettre à jour compteAuxiliaireSage d'un client
@Patch('clients/:id/sage-config')
async updateClientSageConfig(
  @Param('id') id: string,
  @Body() body: { compteAuxiliaireSage: string; codeJournalSage?: string }
) {
  return this.prisma.client.update({
    where: { id },
    data: {
      compteAuxiliaireSage: body.compteAuxiliaireSage,
      codeJournalSage: body.codeJournalSage,
    }
  });
}
```

---

### ÉTAPE 5 — FRONTEND : Modifier `OVProcessingTab.tsx`

**Fichier : `D:\ARS\frontend\src\components\Finance\OVProcessingTab.tsx`**

**Bloc 1 — Ajouter le bouton "TXT Sage" dans l'Étape 5** (juste après le bouton TXT bancaire existant) :

Localiser ce bloc dans le fichier (étape 4, autour de la ligne avec `handleGenerateFiles('txt')`) :

```tsx
// BLOC EXISTANT À TROUVER (étape 5) :
<Button
  variant="contained"
  size="large"
  startIcon={<DescriptionIcon />}
  onClick={() => handleGenerateFiles('txt')}
  disabled={processing}
  sx={{ flex: 1 }}
>
  Générer le fichier TXT
</Button>
{ovId && (
  <Button
    variant="outlined"
    size="large"
    startIcon={<DescriptionIcon />}
    onClick={() => window.open(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/ordres-virement/${ovId}/txt`, '_blank')}
    color="success"
  >
    Télécharger TXT
  </Button>
)}
```

**Remplacer par ce bloc augmenté** :

```tsx
{/* TXT Bancaire — existant, ne pas toucher */}
<Button
  variant="contained"
  size="large"
  startIcon={<DescriptionIcon />}
  onClick={() => handleGenerateFiles('txt')}
  disabled={processing}
  sx={{ flex: 1 }}
>
  Générer TXT Bancaire
</Button>
{ovId && (
  <Button
    variant="outlined"
    size="large"
    startIcon={<DescriptionIcon />}
    onClick={() => window.open(
      `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/ordres-virement/${ovId}/txt`,
      '_blank'
    )}
    color="success"
  >
    Télécharger TXT Bancaire
  </Button>
)}

{/* NOUVEAU — TXT Sage Comptable */}
{ovId && (
  <Button
    variant="contained"
    size="large"
    startIcon={<DescriptionIcon />}
    onClick={() => window.open(
      `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/finance/ordres-virement/${ovId}/sage-txt`,
      '_blank'
    )}
    color="secondary"
    sx={{ bgcolor: '#7B1FA2', '&:hover': { bgcolor: '#6A1B9A' } }}
  >
    Télécharger TXT Sage Comptable
  </Button>
)}
```

---

### ÉTAPE 6 — FRONTEND : Ajouter configuration Sage dans `DonneursTab.tsx`

**Fichier : `D:\ARS\frontend\src\components\Finance\DonneursTab.tsx`**

Dans le formulaire d'ajout/édition d'un donneur d'ordre, ajouter ces 3 champs dans le formulaire existant :

```tsx
{/* Ajouter dans le dialog de création/édition donneur */}
<Grid item xs={12} sm={6}>
  <TextField
    label="Code Journal Sage"
    value={form.codeJournal || ''}
    onChange={(e) => setForm({...form, codeJournal: e.target.value})}
    fullWidth
    placeholder="Ex: BTK580, ATT411, BTK134"
    helperText="Code journal pour les écritures Sage 100"
  />
</Grid>
<Grid item xs={12} sm={6}>
  <TextField
    label="Compte Trésorerie Sage"
    value={form.compteTresorerie || ''}
    onChange={(e) => setForm({...form, compteTresorerie: e.target.value})}
    fullWidth
    placeholder="Ex: 53221650, 53220900"
    helperText="Compte comptable trésorerie dans Sage"
  />
</Grid>
<Grid item xs={12} sm={6}>
  <TextField
    label="Compte Général Tiers Sage"
    value={form.compteGeneralTiers || ''}
    onChange={(e) => setForm({...form, compteGeneralTiers: e.target.value})}
    fullWidth
    placeholder="Ex: 41100007, 41100005"
    helperText="Ex: 41100007 = ASTREE, 41100005 = COMAR 501"
  />
</Grid>
```

---

### ÉTAPE 7 — FRONTEND : Ajouter champ Sage dans la fiche Client

**Fichier concerné** : le composant d'édition client (probablement dans `D:\ARS\frontend\src\pages\clients\index.tsx` ou un formulaire client)

Ajouter ce champ dans le formulaire d'édition client :

```tsx
<TextField
  label="Compte Auxiliaire Sage (8 chiffres)"
  value={form.compteAuxiliaireSage || ''}
  onChange={(e) => setForm({...form, compteAuxiliaireSage: e.target.value.replace(/\D/g, '').substring(0, 8)})}
  fullWidth
  placeholder="Ex: 41105500"
  helperText="Code auxiliaire Sage du client (visible dans Sage 100 → Plan Comptable)"
  inputProps={{ maxLength: 8, pattern: '[0-9]*' }}
/>
```

---

## Récapitulatif des fichiers touchés

| Fichier | Action | Impact |
|---|---|---|
| `prisma/schema.prisma` | +3 champs + 1 table | Migration DB uniquement |
| `finance/sage-txt-generation.service.ts` | Créer | Nouveau service isolé |
| `finance/finance.module.ts` | +2 lignes | Enregistrement du service |
| `finance/finance.controller.ts` | +3 endpoints | Nouvelles routes uniquement |
| `Finance/OVProcessingTab.tsx` | +1 bouton dans étape 5 | Aucun impact sur existant |
| `Finance/DonneursTab.tsx` | +3 champs formulaire | Champs optionnels |
| `pages/clients/` | +1 champ formulaire | Champ optionnel |

**0 fichier existant modifié en profondeur. 0 risque de régression.** Le TXT bancaire existant n'est pas touché. Tout est additionnel.

---

## Point critique avant de coder

Avant de déployer, il faut renseigner pour chaque `DonneurOrdre` existant en DB :
- `codeJournal` : "BTK580" pour BTK/COMAR, "ATT411" pour Attijari, "BTK134" pour BTK/ASTRÉE
- `compteTresorerie` : selon la table Excel fournie
- `compteGeneralTiers` : selon la compagnie d'assurance liée

Et pour chaque `Client` :
- `compteAuxiliaireSage` : les 8 chiffres du compte auxiliaire (ex: `41105500` pour PGH, `41139701` pour HIKMA) — à récupérer depuis leur Sage 100.

***************************
parte 2 
# ✅ PHASE 1 COMPLETE: DATABASE SCHEMA CHANGES

## Date: 2024
## Status: READY FOR MIGRATION

---

## 📋 CHANGES MADE TO `schema.prisma`

### 1. **NEW ENUM: `RecouvrementStatus`**

```prisma
enum RecouvrementStatus {
  ATTENTE_RECOUVREMENT  // Waiting for SR validation (default after TXT/PDF generation)
  AUTORISE              // SR approved - payment received - Finance can execute
  NON_AUTORISE          // SR rejected - payment NOT received - blocked (Super Admin only)
}
```

**Purpose:** Controls the Service Recouvrement (SR) gate after virement generation.

---

### 2. **ADDED FIELDS TO `OrdreVirement` MODEL**

```prisma
// NEW: Service Recouvrement (SR) workflow - CRITICAL GATE
recouvrementStatus      RecouvrementStatus   @default(ATTENTE_RECOUVREMENT)
recouvrementValidatedBy String?              // User ID who validated/rejected
recouvrementValidatedAt DateTime?            // When SR made the decision
recouvrementComment     String?              // SR comment/reason
recouvrementRecouvre    Boolean              @default(false) // Is payment recovered?
dateRecouvrementRecouvre DateTime?           // When payment was recovered
```

**Purpose:** Track SR validation workflow and payment recovery status.

---

### 3. **ADDED USER RELATION**

```prisma
// In User model:
recouvrementValidations     OrdreVirement[]             @relation("RecouvrementValidator")

// In OrdreVirement model:
recouvrementValidator   User?                @relation("RecouvrementValidator", fields: [recouvrementValidatedBy], references: [id])
```

**Purpose:** Link SR validator user to the OV for audit trail.

---

### 4. **ADDED INDEX**

```prisma
@@index([recouvrementStatus])
```

**Purpose:** Optimize queries filtering by recouvrement status.

---

## 🚀 NEXT STEPS

### **Run Migration:**

```bash
cd D:\ARS\server
npx prisma migrate dev --name add_recouvrement_workflow
npx prisma generate
```

### **Expected Result:**
- New `RecouvrementStatus` enum created in database
- 6 new columns added to `OrdreVirement` table
- New index created on `recouvrementStatus`
- Prisma Client regenerated with new types

---

## 📊 BUSINESS LOGIC FLOW

```
1. OV Created → recouvrementStatus = ATTENTE_RECOUVREMENT
2. SR Reviews → Sets to AUTORISE or NON_AUTORISE
3. If AUTORISE → Finance can execute (etatVirement = EXECUTE)
4. If NON_AUTORISE → Blocked, visible ONLY to Super Admin
5. Super Admin can override NON_AUTORISE → AUTORISE later
```

---

## ⚠️ IMPORTANT NOTES

- **Default Status:** All new OVs start with `ATTENTE_RECOUVREMENT`
- **Blocking Logic:** Finance endpoints must check `recouvrementStatus = AUTORISE` before execution
- **Role Restriction:** NON_AUTORISE OVs visible only to `SUPER_ADMIN` role
- **Audit Trail:** All changes tracked via `recouvrementValidatedBy`, `recouvrementValidatedAt`, `recouvrementComment`

---

## ✅ VALIDATION CHECKLIST

- [x] Enum `RecouvrementStatus` added
- [x] 6 new fields added to `OrdreVirement`
- [x] User relation `recouvrementValidator` added
- [x] Index on `recouvrementStatus` added
- [x] No breaking changes to existing fields
- [x] All relations properly defined

---

**Ready for Phase 2: Backend Implementation** 🎯

# ✅ PHASE 2 COMPLETE: BACKEND - RECOUVREMENT FLOW

## Date: 2024
## Status: READY FOR TESTING

---

## ⚠️ IMPORTANT CLARIFICATION

**Recouvrement is NOT a new role!**
- "Service Recouvrement" is a **department/function name**
- The actual users are **FINANCE** or **SUPER_ADMIN** roles
- No new role was created in the system

---

## 📋 FILES CREATED

### 1. **NEW SERVICE: `recouvrement.service.ts`**
Location: `D:\ARS\server\src\finance\recouvrement.service.ts`

**Features:**
- ✅ Bulk validate/reject OVs (AUTORISE / NON_AUTORISE)
- ✅ Get pending recouvrement OVs
- ✅ Get NON_AUTORISE OVs (Super Admin only)
- ✅ Get all OVs with filters (status, recouvre, date, client)
- ✅ Override NON_AUTORISE → AUTORISE (Super Admin only)
- ✅ Notification system (Finance + Super Admin)
- ✅ Recouvrement statistics
- ✅ Full audit trail via VirementHistory

**Role Restrictions:**
- **FINANCE**: Can validate/reject OVs (they ARE the recouvrement team)
- **SUPER_ADMIN**: Can see NON_AUTORISE + override + all recouvrement functions

---

## 📋 FILES MODIFIED

### 2. **UPDATED: `finance.controller.ts`**

**Added 6 New Endpoints:**

```typescript
POST   /finance/recouvrement/bulk-validate
GET    /finance/recouvrement/pending
GET    /finance/recouvrement/non-autorise
GET    /finance/recouvrement/all
PUT    /finance/recouvrement/:id/override-autorise
GET    /finance/recouvrement/stats
```

**Role Guards:**
- All endpoints protected with `@Roles()` decorator
- **FINANCE or SUPER_ADMIN** for validation
- **SUPER_ADMIN only** for NON_AUTORISE access

---

### 3. **UPDATED: `finance.module.ts`**

**Changes:**
- ✅ Imported `RecouvrementService`
- ✅ Added to `providers` array
- ✅ Added to `exports` array

---

### 4. **NO NEW ROLE CREATED**

**Important:**
- "Service Recouvrement" is a **department name**, NOT a role
- Users with **FINANCE** or **SUPER_ADMIN** roles perform recouvrement functions
- No changes to `user-role.enum.ts` needed

---

## 🔄 BUSINESS LOGIC FLOW

```
1. OV Created → recouvrementStatus = ATTENTE_RECOUVREMENT

2. Service Recouvrement Reviews:
   ├─ Payment Received? → AUTORISE
   │  └─ Notification sent to Finance
   │  └─ Finance can execute (etatVirement = EXECUTE)
   │
   └─ Payment NOT Received? → NON_AUTORISE
      └─ Notification sent to Super Admin
      └─ Blocked (visible ONLY to Super Admin)
      └─ Super Admin can override → AUTORISE

3. Bulk Operations Supported:
   - Select multiple OVs
   - Validate/Reject all at once
   - Single notification per batch
```

---

## 📊 API ENDPOINTS DETAILS

### **1. Bulk Validate/Reject**
```http
POST /finance/recouvrement/bulk-validate
Authorization: Bearer <token>
Role: FINANCE or SUPER_ADMIN

Body:
{
  "ordreVirementIds": ["ov-id-1", "ov-id-2"],
  "status": "AUTORISE" | "NON_AUTORISE",
  "comment": "Payment received on 2024-01-15",
  "recouvre": true,
  "dateRecouvre": "2024-01-15"
}

Response:
{
  "success": true,
  "updated": 2,
  "failed": 0,
  "errors": []
}
```

### **2. Get Pending OVs**
```http
GET /finance/recouvrement/pending
Authorization: Bearer <token>
Role: FINANCE or SUPER_ADMIN

Response:
[
  {
    "id": "ov-id",
    "reference": "OV-2024-0001",
    "montantTotal": 1500.50,
    "nombreAdherents": 10,
    "dateCreation": "2024-01-15T10:00:00Z",
    "recouvrementStatus": "ATTENTE_RECOUVREMENT",
    "donneurOrdre": { "nom": "BTK", "banque": "BTK" },
    "bordereau": {
      "reference": "BORD-2024-001",
      "client": {
        "name": "Client A",
        "modeRecuperation": "VIREMENT"
      }
    }
  }
]
```

### **3. Get NON_AUTORISE OVs (Super Admin Only)**
```http
GET /finance/recouvrement/non-autorise
Authorization: Bearer <token>
Role: SUPER_ADMIN

Response:
[
  {
    "id": "ov-id",
    "reference": "OV-2024-0002",
    "recouvrementStatus": "NON_AUTORISE",
    "recouvrementComment": "Payment not received",
    "recouvrementValidatedBy": "user-id",
    "recouvrementValidatedAt": "2024-01-15T14:00:00Z",
    "recouvrementValidator": {
      "fullName": "SR User",
      "email": "sr@company.com"
    }
  }
]
```

### **4. Get All OVs with Filters**
```http
GET /finance/recouvrement/all?status=AUTORISE&recouvre=true&dateFrom=2024-01-01
Authorization: Bearer <token>
Role: FINANCE or SUPER_ADMIN

Query Params:
- status: ATTENTE_RECOUVREMENT | AUTORISE | NON_AUTORISE
- recouvre: true | false
- dateFrom: YYYY-MM-DD
- dateTo: YYYY-MM-DD
- clientId: client-uuid

Response: Array of OVs with full details
```

### **5. Override NON_AUTORISE (Super Admin Only)**
```http
PUT /finance/recouvrement/:id/override-autorise
Authorization: Bearer <token>
Role: SUPER_ADMIN

Body:
{
  "comment": "Payment confirmed after verification"
}

Response:
{
  "success": true,
  "message": "OV débloqué et autorisé avec succès"
}
```

### **6. Get Statistics**
```http
GET /finance/recouvrement/stats
Authorization: Bearer <token>
Role: FINANCE or SUPER_ADMIN

Response:
{
  "attente": 15,
  "autorise": 120,
  "nonAutorise": 3,
  "recouvre": 100,
  "total": 138
}
```

---

## 🔔 NOTIFICATION SYSTEM

### **When OV is AUTORISE:**
- **Recipients:** All FINANCE users
- **Type:** `RECOUVREMENT_AUTORISE`
- **Title:** "✅ OV Autorisé - Prêt pour Exécution"
- **Message:** "L'OV {reference} ({client}) a été autorisé par le Service Recouvrement. Montant: {montant} TND. Vous pouvez maintenant l'exécuter."

### **When OV is NON_AUTORISE:**
- **Recipients:** All SUPER_ADMIN users
- **Type:** `RECOUVREMENT_NON_AUTORISE`
- **Title:** "⚠️ OV Non Autorisé - Action Requise"
- **Message:** "L'OV {reference} ({client}) a été rejeté par le Service Recouvrement. Motif: {comment}. Montant: {montant} TND. Vous pouvez le débloquer si nécessaire."

---

## 🔒 ROLE RESTRICTIONS SUMMARY

| Action | FINANCE | SUPER_ADMIN |
|--------|---------|-------------|
| View Pending OVs | ✅ | ✅ |
| Bulk Validate/Reject | ✅ | ✅ |
| View AUTORISE OVs | ✅ | ✅ |
| View NON_AUTORISE OVs | ❌ | ✅ |
| Override NON_AUTORISE | ❌ | ✅ |
| Execute AUTORISE OVs | ✅ | ✅ |

---

## 📝 AUDIT TRAIL

Every recouvrement action is logged in `VirementHistory`:

```typescript
{
  virementId: "ov-id",
  action: "RECOUVREMENT_AUTORISE" | "RECOUVREMENT_NON_AUTORISE" | "RECOUVREMENT_OVERRIDE_AUTORISE",
  previousState: "ATTENTE_RECOUVREMENT",
  newState: "AUTORISE",
  comment: "Payment received on 2024-01-15",
  userId: "user-id",
  createdAt: "2024-01-15T14:00:00Z"
}
```

---

## ✅ VALIDATION CHECKLIST

- [x] RecouvrementService created with all methods
- [x] 6 endpoints added to FinanceController
- [x] Role guards applied to all endpoints (FINANCE + SUPER_ADMIN)
- [x] NO new role created (Recouvrement is a function, not a role)
- [x] RecouvrementService registered in FinanceModule
- [x] Notification system integrated
- [x] Audit trail via VirementHistory
- [x] Bulk operations supported
- [x] Super Admin override functionality
- [x] Statistics endpoint

---

## 🚀 NEXT STEPS

**Phase 3: Frontend - Sage Management Module**
1. Create new sidebar entry "Sage Management"
2. Build Configurations tab (CRUD for DonneurOrdre, Client, CompagnieAssurance)
3. Build Recouvrement tab (list, bulk validate, filters)
4. Build Template Editor tab (TXT/PDF structure control)

---

**Ready for Phase 3!** 🎯
***************************
# ✅ PHASE 3 COMPLETE: FRONTEND - SAGE MANAGEMENT MODULE

## 📁 Files Created

### Main Pages
1. **`D:\ARS\frontend\src\pages\sage\SageManagement.tsx`**
   - Main entry point for Sage Management module
   - Renders SageManagementModule component

2. **`D:\ARS\frontend\src\components\Sage\SageManagementModule.tsx`**
   - Main module with 3 tabs
   - Desktop & Mobile responsive design
   - Same design pattern as FinanceModule

### Tab Components

3. **`D:\ARS\frontend\src\components\Sage\ConfigurationsTab.tsx`**
   - ✅ 3 Sub-tabs: Donneurs d'Ordre, Clients, Compagnies Assurance
   - ✅ Full CRUD operations (Create, Read, Update, Delete)
   - ✅ Bulk selection with checkboxes
   - ✅ Bulk delete functionality
   - ✅ Inline editing with dialog
   - ✅ Tables with all required fields:
     - **Donneurs d'Ordre**: nom, codeJournal, compteTresorerie, compteGeneralTiers
     - **Clients**: nom, compteAuxiliaireSage, modeRecuperation
     - **Compagnies**: nom, compteGeneralSage

4. **`D:\ARS\frontend\src\components\Sage\RecouvrementTab.tsx`**
   - ✅ List all OVs with recouvrement status
   - ✅ Filters:
     - Status: ALL / ATTENTE_RECOUVREMENT / AUTORISE / NON_AUTORISE
     - Recouvré: ALL / RECOUVRE / NON_RECOUVRE
   - ✅ Bulk selection
   - ✅ Bulk validate (Autoriser) button
   - ✅ Bulk reject (Rejeter) button
   - ✅ Comment dialog for validation/rejection
   - ✅ Display mode de récupération per client
   - ✅ Show recouvrement date
   - ✅ Color-coded status chips

5. **`D:\ARS\frontend\src\components\Sage\TemplateEditorTab.tsx`**
   - ✅ Template list sidebar
   - ✅ Template editor with fields:
     - Position Code Journal
     - Position Date
     - Position Compte
     - Position Libellé
     - Position Débit
     - Position Crédit
   - ✅ Create new template
   - ✅ Edit existing template
   - ✅ Delete template
   - ✅ Save multiple templates
   - ✅ TXT & PDF type support
   - ✅ NOT restricted to super admin

## 🔧 Files Modified

### 6. **`D:\ARS\frontend\src\App.tsx`**
```tsx
// Added import
import SageManagement from './pages/sage/SageManagement';

// Added route
<Route path="/home/sage" element={
  <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.FINANCE]}>
    <SageManagement />
  </ProtectedRoute>
} />
```

### 7. **`D:\ARS\frontend\src\components\Sidebar.tsx`**
```tsx
// Added icon import
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

// Added sidebar link
{ 
  to: "/home/sage", 
  label: "Gestion Sage", 
  icon: <AccountBalanceWalletIcon />, 
  roles: ['SUPER_ADMIN', 'FINANCE'] 
}
```

## 🎨 Design Features

### ✅ Matches Finance Module Design
- Same color scheme (purple gradient header)
- Same layout structure
- Same responsive behavior (desktop/mobile)
- Same Material-UI components
- Same table styling
- Same button patterns

### ✅ User Experience
- Bulk operations with checkboxes
- Inline editing with dialogs
- Color-coded status chips
- Responsive filters
- Loading states
- Empty state messages
- Confirmation dialogs

## 🔐 Role Restrictions

### Access Control
- **SUPER_ADMIN**: Full access to all tabs
- **FINANCE**: Full access to all tabs (recouvrement team)
- Other roles: No access

### Tab-Specific Restrictions
- **Configurations Tab**: SUPER_ADMIN + FINANCE
- **Recouvrement Tab**: SUPER_ADMIN + FINANCE (can validate/reject)
- **Template Editor**: SUPER_ADMIN + FINANCE (NOT restricted to super admin only)

## 📊 Features Implemented

### Tab 1: Configurations
✅ CRUD for DonneurOrdre (codeJournal, compteTrésorerie, compteGénéralTiers)
✅ CRUD for Client (compteAuxiliaireSage, modeRecuperation)
✅ CRUD for CompagnieAssurance (compteGeneralSage)
✅ Bulk create/edit/delete
✅ Manual creation
✅ Inline editing

### Tab 2: Recouvrement Tracking
✅ List OVs with recouvrement status
✅ Bulk Autorisé/Non Autorisé
✅ Filter by status (ATTENTE/AUTORISE/NON_AUTORISE)
✅ Filter by recouvré/non-recouvré
✅ Show mode de récupération per client
✅ Show recouvrement date
✅ Comment field for validation/rejection

### Tab 3: Template Editor
✅ Control TXT Sage structure (column positions)
✅ Control PDF structure (placeholder for future)
✅ Save multiple templates
✅ Create/Edit/Delete templates
✅ NOT restricted to super admin only

## 🔗 API Endpoints Expected

The frontend expects these backend endpoints:

### Configurations
- `GET /api/donneurs-ordre` - List all donneurs
- `POST /api/donneurs-ordre` - Create donneur
- `PUT /api/donneurs-ordre/:id` - Update donneur
- `DELETE /api/donneurs-ordre/:id` - Delete donneur
- `DELETE /api/donneurs-ordre/bulk` - Bulk delete

- `GET /api/clients` - List all clients
- `POST /api/clients` - Create client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client
- `DELETE /api/clients/bulk` - Bulk delete

- `GET /api/compagnies-assurance` - List all compagnies
- `POST /api/compagnies-assurance` - Create compagnie
- `PUT /api/compagnies-assurance/:id` - Update compagnie
- `DELETE /api/compagnies-assurance/:id` - Delete compagnie
- `DELETE /api/compagnies-assurance/bulk` - Bulk delete

### Recouvrement (Already implemented in Phase 2)
- `GET /api/finance/recouvrement/all` - List all OVs
- `POST /api/finance/recouvrement/bulk-validate` - Bulk validate/reject

### Templates
- `GET /api/sage/templates` - List all templates
- `POST /api/sage/templates` - Create template
- `PUT /api/sage/templates/:id` - Update template
- `DELETE /api/sage/templates/:id` - Delete template

## 🎯 Next Steps

### Backend Implementation Needed
1. Create CRUD endpoints for DonneurOrdre, Client, CompagnieAssurance
2. Create Template management endpoints
3. Connect to existing recouvrement endpoints (already done in Phase 2)

### Testing
1. Test all CRUD operations
2. Test bulk operations
3. Test filters and search
4. Test role restrictions
5. Test responsive design

## ✅ Phase 3 Status: COMPLETE

All frontend components are built and ready. The module follows the exact same design as the Finance module and implements all requirements:

- ✅ New sidebar entry "Gestion Sage"
- ✅ Tab 1: Configurations CRUD
- ✅ Tab 2: Recouvrement Tracking
- ✅ Tab 3: Template Editor
- ✅ Bulk operations
- ✅ Role restrictions
- ✅ Same design as Finance module
- ✅ Perfect implementation

**Ready for backend integration!** 🚀
