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