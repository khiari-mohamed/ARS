# 📘 Guide Complet : Gestion des Adhérents et des Virements Bancaires – ARS Tunisie
Résumé Exécutif
Le système garantit des virements 100% sécurisés en:
- Isolant strictement les données par client (impossible de mélanger)
- Utilisant le RIB de la base quand Excel perd la précision
- Bloquant les transactions sans adhérent en base
- Générant un fichier TXT incluant le nom de la société
**Précision: 95-100% selon la qualité des données Excel**


## 1. Introduction
Le module de gestion des virements de l’ARS Tunisie permet d’automatiser la préparation des ordres de virement à partir de fichiers Excel, tout en garantissant la **sécurité des données** et l’**exactitude des informations bancaires**. Ce guide détaille le fonctionnement du système, depuis l’ajout des adhérents jusqu’à la génération du fichier TXT final, en passant par la validation intelligente des RIB et l’**isolation stricte entre les clients**.

**Objectifs principaux :**
- Rapprocher automatiquement les lignes Excel avec les adhérents en base.
- Utiliser le RIB de la base lorsque le fichier Excel perd la précision (format nombre).
- Empêcher toute confusion entre les clients grâce à l’isolation par `clientId`.
- Alerter l’utilisateur en cas de divergence nécessitant une vérification manuelle.
- Générer un fichier TXT conforme aux spécifications bancaires, incluant le nom de la société (client) pour chaque ligne.

## Workflow Rapide (3 Étapes)

1. **Préparer** → Importer adhérents (Excel massif recommandé)
2. **Créer** → Bordereau lié au client
3. **Générer** → Upload Excel virement → Validation auto → TXT

**Temps estimé: 5-10 minutes pour 1000 lignes**
## 2. Architecture Générale du Système
┌─────────────────────────────────────────────────────────────────┐
│                    BASE DE DONNÉES ADHÉRENTS                    │
│  ┌──────────────┬──────────┬─────────┬──────────────────────┐  │
│  │ Matricule    │ Client   │ Nom     │ RIB (20 chiffres)    │  │
│  ├──────────────┼──────────┼─────────┼──────────────────────┤  │
│  │ 13542        │ HPE      │ IBTISSEM│ 11002003113801378869 │  │
│  │ 66759        │ HPE      │ HANEN   │ 17002000000362000000 │  │
│  │ 10816089     │ PGH      │ MOHAMED │ 25042000000051544401 │  │
│  └──────────────┴──────────┴─────────┴──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
                    ┌─────────┴─────────┐
                    │  Isolation Client │
                    │  (Sécurité 100%)  │
                    └─────────┬─────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BORDEREAU                                   │
│  Référence: H-BULLETIN-2026-71302                              │
│  Client: HPE ←─────────────────────────────────────────────┐   │
│  Date: 28/01/2026                                          │   │
│  Nombre BS: 4                                              │   │
└────────────────────────────────────────────────────────────┼───┘
                                                             │
                              ▼                              │
┌─────────────────────────────────────────────────────────────────┐
│                    EXCEL VIREMENT                               │
│  ┌──────────────┬──────────┐                                   │
│  │ Matricule    │ Montant  │                                   │
│  ├──────────────┼──────────┤                                   │
│  │ 13542        │ 4103     │                                   │
│  │ 66759        │ 4103     │                                   │
│  └──────────────┴──────────┘                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VALIDATION AUTOMATIQUE                       │
│  1. Récupère client du bordereau → HPE                         │
│  2. Cherche adhérent: WHERE matricule=13542 AND client=HPE     │
│  3. Trouve adhérent ✅                                          │
│  4. Utilise RIB de la base de données (si Excel imprécis) ✅   │
│  5. Statut: VALIDE ✅                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GÉNÉRATION DU FICHIER TXT                    │
│  Chaque ligne inclut le nom du client (société) comme préfixe   │
│  Exemple : "PGH   APM2026VIR-20260306-0007 du 06032026 ..."    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Flux Détaillé du Traitement

### 3.1. Ajout des Adhérents

Le système propose deux méthodes pour alimenter la base des adhérents.

#### ✅ Ajout Manuel

L’utilisateur saisit un à un les adhérents via un formulaire dédié.

```
Finance → Adhérents → + Ajouter un adhérent

┌──────────────────────────────────────┐
│ 📝 Formulaire Adhérent               │
├──────────────────────────────────────┤
│ Matricule : 13542                     │
│ Société   : HPE (liste déroulante)    │
│ Nom       : IBTISSEM                   │
│ Prénom    : LAKHNACH                    │
│ RIB       : 11002003113801378869        │
│ Code assuré : 4103                      │
│ N° contrat  : A70240017                  │
│ Assurance   : HPE                        │
│ Statut      : Actif                      │
└──────────────────────────────────────┘
```

- Validation automatique : matricule unique **pour ce client**, RIB = 20 chiffres.
- Alerte possible si RIB déjà utilisé par un autre adhérent (cas exceptionnel accepté).

#### ✅ Import Massif (Recommandé)

Pour plusieurs adhérents, l’import d’un fichier Excel structuré est plus efficace.

```
Finance → Adhérents → 📁 Importer fichier

┌──────────────────────────────────────────────────────────────────┐
│ 📄 Fichier Excel Adhérents (colonnes obligatoires)             │
├──────────┬─────────┬─────────┬─────────┬──────────────────────┤
│Matricule │ Société │ Nom     │ Prénom  │ RIB                  │
├──────────┼─────────┼─────────┼─────────┼──────────────────────┤
│13542     │ HPE     │IBTISSEM │LAKHNACH │11002003113801378869  │
│66759     │ HPE     │HANEN    │HSSAINIA │17002000000362000000  │
│99901     │ HPE     │MOHAMED  │FATNASSI │17002000000287400000  │
└──────────┴─────────┴─────────┴─────────┴──────────────────────┘
```

Le système valide chaque ligne et affiche un bilan à la fin : nombre d’adhérents créés, erreurs (matricule dupliqué, RIB invalide…).

### 3.2. Création du Bordereau

Le bordereau est un document qui regroupe plusieurs bulletins de situation (BS) et qui est associé à un **client unique**.

```
Bordereaux → Nouveau Bordereau

┌──────────────────────────────────────┐
│ 📋 Bordereau                         │
├──────────────────────────────────────┤
│ Référence : H-BULLETIN-2026-71302    │
│ Client    : HPE  ←───────────────────┘
│ Date      : 28/01/2026
│ Nombre BS : 4
└──────────────────────────────────────┘
```

Ce lien client est crucial : il déterminera le périmètre des adhérents lors de l’import du virement et fournira le nom de la société qui figurera dans le fichier TXT final.

### 3.3. Import du Fichier Excel de Virement

L’utilisateur sélectionne le bordereau concerné, puis télécharge un fichier Excel contenant **au minimum** les colonnes `Matricule` et `Montant`.

```
Finance → Ordre de Virement → Sélectionner Bordereau

Bordereau sélectionné : H-BULLETIN-2026-71302 (HPE)

📄 Fichier Excel Virement :
┌──────────────┬────────────────┐
│ Matricule    │ Montant        │
├──────────────┼────────────────┤
│ 13542        │ 4103           │
│ 66759        │ 4103           │
│ 99901        │ 4103           │
└──────────────┴────────────────┘
```

Le fichier peut aussi contenir des colonnes `Nom`, `Prénom`, `RIB`. Si présentes, ces données seront utilisées en priorité (sauf cas particulier pour le RIB).

### 💡 Excel Minimal Accepté

Le système accepte un fichier Excel **très simple** contenant uniquement :

```
┌──────────────┬────────────────┐
│ Matricule    │ Montant        │
├──────────────┼────────────────┤
│ 13542        │ 4103           │
│ 66759        │ 4103           │
│ 99901        │ 4103           │
└──────────────┴────────────────┘
```

**Dans ce cas :**
- ✅ Le système cherche l'adhérent en base avec le matricule
- ✅ Récupère automatiquement : Nom, Prénom, RIB, Code assuré, etc.
- ✅ Statut : **VALIDE** (si adhérent existe pour ce client)
- ❌ Statut : **ERREUR** (si adhérent n'existe pas)

**Avantage :** Fichier Excel ultra-léger, toutes les données viennent de la base (source de vérité).

**Condition :** Les adhérents doivent être créés en base **avant** l'import du virement.

**Exemple de résultat :**

```
Bordereau : H-BULLETIN-2026-71302 (Client: HPE)
Excel : Matricule 13542, Montant 4103

→ Système cherche : WHERE matricule=13542 AND clientId=HPE
→ Trouve adhérent ✅
→ Récupère de la DB :
   - Nom: IBTISSEM
   - Prénom: LAKHNACH
   - RIB: 11002003113801378869
   - Code assuré: 4103
   - Numéro contrat: A70240017
→ Statut: VALIDE ✅
```

### 3.4. Validation Automatique par Ligne

Pour chaque ligne du fichier, le système exécute le processus suivant :

```
┌──────────────────────────────────────┐
│ 1. Récupération du client            │
│    (depuis le bordereau)             │
│    → Client = HPE                     │
└────────────┬─────────────────────────┘
             ▼
┌──────────────────────────────────────┐
│ 2. Recherche adhérent en base        │
│    WHERE matricule = 13542           │
│      AND clientId = HPE              │
└────────────┬─────────────────────────┘
             │
        ┌────┴───────────────────┐
        │                        │
   ✅ Trouvé                 ❌ Non trouvé
        │                        │
        ▼                        ▼
┌────────────────────┐   ┌────────────────────┐
│ Données DB :       │   │ Données Excel       │
│ - nom, prénom      │   │ (si colonnes        │
│ - RIB              │   │  présentes)         │
└─────────┬──────────┘   └─────────┬──────────┘
          │                         │
          └────────────┬────────────┘
                       ▼
┌──────────────────────────────────────┐
│ 3. Traitement du RIB (cf. §4)       │
└──────────────────────────────────────┘
                       ▼
┌──────────────────────────────────────┐
│ 4. Attribution d’un statut :        │
│    ✅ VALIDE                         │
│    ⚠️ ALERTE                         │
│    ❌ ERREUR                         │
└──────────────────────────────────────┘
```

---

## 4. Logique de Gestion du RIB

Le RIB est l’information la plus sensible. Le système applique une règle de priorité intelligente pour garantir qu’un RIB valide soit toujours utilisé.

### 4.1. Détection de la Perte de Précision

Lorsque Excel stocke un nombre de 20 chiffres au format **nombre**, il arrondit les derniers chiffres à zéro. Le système détecte cette situation en cherchant une séquence d’au moins 8 zéros consécutifs en fin de chaîne.

**Exemple :**
- RIB saisi : `11002003113801378869`
- RIB lu par Excel (format nombre) : `11002000000000000000` → **perte de précision détectée**

### 4.2. Arbre de Décision pour le RIB

```
                         ┌─────────────────┐
                         │ Excel RIB a-t-il│
                         │ perdu précision?│
                         └────────┬────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                   OUI                         NON
                    │                           │
                    ▼                           ▼
         ┌──────────────────────┐    ┌──────────────────────┐
         │ Adhérent trouvé      │    │ Excel RIB valide     │
         │ dans la base ?       │    │ (20 chiffres) ?      │
         └──────┬───────────────┘    └──────┬───────────────┘
                │                            │
        ┌───────┴────────┐          ┌────────┴────────┐
       OUI              NON        OUI               NON
        │                │          │                  │
        ▼                ▼          ▼                  ▼
   ┌────────┐      ┌────────┐  ┌────────┐      ┌────────────┐
   │UTILISER │      │UTILISER│  │UTILISER│      │UTILISER RIB│
   │RIB DB   │      │RIB     │  │RIB     │      │de la base  │
   │✅       │      │Excel   │  │Excel   │      │si existant,│
   └────────┘      │(⚠️)    │  │✅      │      │sinon ❌    │
                   └────────┘  └────────┘      └────────────┘
        │                │          │                  │
        ▼                ▼          ▼                  ▼
   Statut:          Statut:     Statut:           Statut:
   VALIDE           ALERTE      VALIDE             VALIDE si DB,
   Message:         Message:    (sauf si           sinon ERREUR
   "RIB DB utilisé"  "RIB Excel  RIB Excel ≠
                     imprécis"   RIB DB → ALERTE"
```

### 4.3. Cas concrets

| Cas | Excel RIB | Perte précision ? | Adhérent DB ? | RIB utilisé | Statut | Message |
|-----|-----------|-------------------|---------------|-------------|--------|---------|
| 1 | 11002003113801378869 (texte) | Non | Oui | Excel | ✅ VALIDE | - |
| 2 | 11002003113801378869 (texte) | Non | Non | Excel | ✅ VALIDE | "Adhérent non trouvé" |
| 3 | 11002000000000000000 (nombre) | Oui | Oui | DB | ✅ VALIDE | "RIB DB utilisé" |
| 4 | 11002000000000000000 (nombre) | Oui | Non | ❌ BLOQUÉ | ❌ ERREUR | "Ajouter adhérent ou formater RIB comme TEXTE" |
| 5 | 11002003113801378869 (texte) | Non | Oui (RIB différent) | Excel | ⚠️ ALERTE | "RIB Excel différent du RIB DB" |
| 6 | (colonne absente) | - | Oui | DB | ✅ VALIDE | "RIB DB utilisé" |
| 7 | (colonne absente) | - | Non | Aucun | ❌ ERREUR | "RIB manquant" |
| **8** | **(Excel minimal : Matricule + Montant uniquement)** | **-** | **Oui** | **DB** | **✅ VALIDE** | **"Toutes données récupérées de la DB"** |

---

## 5. Sécurité : Isolation Client

Un des principes fondamentaux du système est l’**isolation stricte des données par client**. Chaque adhérent est rattaché à un client via la clé étrangère `clientId`. Lors de la validation, la recherche de l’adhérent se fait **toujours** avec le client du bordereau.

```
Base de données :
┌──────────────┬──────────┬──────────────────────┐
│ Matricule    │ Client   │ RIB                  │
├──────────────┼──────────┼──────────────────────┤
│ 13542        │ HPE      │ 11002003113801378869 │
│ 13542        │ FIELDCORE│ 25042000000051544401 │ ← même matricule
│ 13542        │ PGH      │ 17002000000362000000 │ ← clients différents
└──────────────┴──────────┴──────────────────────┘

Bordereau HPE :
Recherche : matricule = 13542 AND clientId = HPE
✅ Trouve : RIB 11002003113801378869
❌ Ignore : les RIB de FIELDCORE et PGH

Bordereau FIELDCORE :
Recherche : matricule = 13542 AND clientId = FIELDCORE
✅ Trouve : RIB 25042000000051544401
❌ Ignore : les autres

🔐 GARANTIE : Aucun risque d’utiliser le RIB d’un autre client.
```

---

## 6. Bonnes Pratiques Utilisateur

### ✅ À FAIRE

1. **Ajouter les adhérents avant de créer les virements**  
   - L’idéal : importer la liste complète des adhérents en début de mois.

2. **Formater la colonne RIB en TEXTE dans Excel**  
   - Sélectionner la colonne → Format des cellules → Texte, puis saisir les RIB.  
   - Cela évite toute perte de précision.

3. **Vérifier le client du bordereau**  
   - Le bordereau détermine le périmètre des adhérents éligibles et le nom de la société qui apparaîtra dans le fichier TXT.

4. **Utiliser l’import massif pour plusieurs adhérents**  
   - Gain de temps et fiabilité accrue.

5. **Lire attentivement les messages d’alerte**  
   - Un statut `ALERTE` indique une situation qui mérite une vérification humaine avant validation définitive.

### ❌ À ÉVITER

1. **Saisir les RIB comme des nombres dans Excel**  
   - Exemple : entrer `11002003113801378869` sans apostrophe → Excel le convertit en `1.1002E+19` et perd les 5-8 derniers chiffres.

2. **Mélanger les clients dans un même fichier virement**  
   - Toujours filtrer par client en amont.

3. **Ignorer les erreurs**  
   - Un statut `ERREUR` bloque la génération du virement ; il faut corriger la ligne (ajouter l’adhérent, corriger le RIB, etc.) avant de poursuivre.

---

## 7. Dépannage des Erreurs Fréquentes

### ❌ "Adhérent non trouvé"

**Causes possibles :**
- L’adhérent n’a pas été créé pour ce client.
- Le matricule est erroné dans le fichier Excel.
- Le bordereau est associé à un mauvais client.

**Solutions :**
1. Vérifier le client du bordereau.
2. Ajouter l’adhérent manquant via l’interface.
3. Réimporter le fichier.

### ❌ "RIB Excel imprécis et adhérent manquant"

**Cause :** Le RIB Excel a perdu sa précision (format nombre) et l’adhérent n’existe pas en base pour fournir un RIB fiable.

**Solution :**
- Ajouter l’adhérent en base avec son RIB correct, **ou**
- Re-formater le fichier Excel avec la colonne RIB en Texte et ressaisir les RIB.

### ⚠️ "RIB Excel différent du RIB DB"

**Cause :** Le RIB fourni dans Excel ne correspond pas à celui enregistré en base (les deux sont valides, mais différents).

**Solution :**
- Vérifier quel RIB est le bon.
- Si le RIB Excel est correct, mettre à jour la base.
- Si le RIB base est correct, corriger le fichier Excel.
- Après correction, réimporter.

### ❌ "RIB manquant ou invalide"

**Cause :** Aucun RIB n’est fourni (ni dans Excel, ni en base) ou le RIB fourni ne fait pas 20 chiffres.

**Solution :**
- Ajouter le RIB dans le fichier Excel (colonne dédiée) ou créer l’adhérent en base avec son RIB.

---

## 8. Génération du Fichier TXT de Virement

Une fois la validation terminée et toutes les lignes en statut `VALIDE` (ou `ALERTE` après vérification manuelle), l’utilisateur peut **générer le fichier TXT** qui sera transmis à la banque.

### 8.1. Contenu du fichier TXT

Le fichier TXT respecte un format spécifique (exemple : format BTK/COMAR). Chaque ligne de virement contient :

- Les coordonnées bancaires (RIB, nom, prénom, montant)
- Un **préfixe de 5 caractères** représentant la **société (client)** à laquelle appartient l’adhérent.

Ce préfixe est extrait du nom du client associé au bordereau, et non de l’Excel. Il est converti en majuscules, nettoyé des caractères spéciaux, et tronqué/pad à 5 caractères.

**Exemple de ligne TXT :**
```
V2  0810400012345678901211002003113801378869IBTISSEM LAKHNACH             13542000000000000000202603060001000PGH   APM2026VIR-20260306-0007 du 06032026 OV GM n VIR-20260306-0007 
                                                                                                                    ^^^^^
                                                                                                                 Société (PGH)
```

### 8.2. Origine du champ "Société"

Le nom de la société est déterminé dans l’ordre de priorité suivant :

1. **Client du bordereau** (via `adherent.client.name`) – c’est la source principale et la plus fiable.
2. **Assurance de l’adhérent** (`adherent.assurance`) – utilisé si le client n’est pas renseigné.
3. **Nom du donneur d’ordre** – fallback ultime.

Dans la pratique, grâce à l’isolation client, c’est toujours le client du bordereau qui est utilisé.

### 8.3. Processus de génération

```
Validation terminée → Bouton "Générer TXT"

Le système assemble :
- Les données de l’ordre de virement (référence, date)
- Pour chaque ligne validée :
   - RIB (provenant de la base ou de l’Excel)
   - Nom et prénom (priorité Excel puis DB)
   - Matricule
   - Montant
   - Société (client du bordereau)

→ Fichier TXT prêt à être téléchargé et envoyé à la banque.
```

---

## 9. Conclusion

Le système de gestion des virements de l’ARS Tunisie offre une **automatisation fiable et sécurisée** du processus, tout en laissant une **traçabilité claire** et des **alertes pertinentes**. L’isolation client garantit l’intégrité des données, la gestion intelligente du RIB compense les limitations d’Excel, et le fichier TXT généré intègre correctement le nom de la société pour chaque virement.

En suivant les bonnes pratiques décrites dans ce guide, les utilisateurs peuvent traiter des milliers de lignes en toute confiance, avec un taux de réussite proche de 100 %.

**Version : 1.1 – Mars 2026**



---

## 🛡️ Annexe : Résolution d'un Problème Critique

### ❌ Problème identifié dans l'ancien système

Avant les modifications, le système recherchait les adhérents **uniquement par matricule**, sans tenir compte du client. Cela créait un risque majeur :

```
❌ ANCIEN SYSTÈME (AVANT):

Base de données :
┌──────────┬──────────┬──────────────────────┐
│ Matricule│ Client   │ RIB                  │
├──────────┼──────────┼──────────────────────┤
│ 1        │ Company X│ 11111111111111111111 │
│ 1        │ Company Y│ 22222222222222222222 │
└──────────┴──────────┴──────────────────────┘

Bordereau : Company X
Excel : Matricule = 1

Recherche : WHERE matricule = 1  (❌ PAS DE clientId!)
→ Trouve les DEUX adhérents
→ Prend le premier (aléatoire)
→ Peut prendre Company Y par erreur! 💥
→ Argent envoyé à la mauvaise personne! 💸
```

### ✅ Solution implémentée (système actuel)

```
✅ NOUVEAU SYSTÈME (ACTUEL):

Bordereau : Company X (clientId = xxx-xxx-xxx)
Excel : Matricule = 1

Recherche : WHERE matricule = 1 AND clientId = xxx-xxx-xxx
✅ Trouve UNIQUEMENT l'adhérent de Company X
✅ RIB: 11111111111111111111 (correct)
✅ Argent envoyé à la bonne personne! ✅

🔒 IMPOSSIBLE de mélanger les clients, même avec des matricules identiques.
```

**Code de sécurité :**

```typescript
const adherent = await prisma.adherent.findFirst({
  where: {
    matricule: matricule,
    clientId: bordereauClientId  // ← Isolation stricte!
  }
});
```

**Résultat :** Le système garantit maintenant qu'un virement créé pour un bordereau de Company X ne pourra **JAMAIS** utiliser les données d'un adhérent de Company Y, même si les deux ont le même matricule.
