# Société Field Flow - TXT Generation

## Overview
The "société" (company/client name) field in the TXT file is **read from the bordereau linking**, NOT from the Excel file.

## Complete Data Flow

### 1. Data Source Priority
When generating TXT files, the société field is extracted with the following priority:

```typescript
societe = adherent.client?.name || adherent.assurance || ordreVirement.donneurOrdre.nom
```

**Priority Order:**
1. **`adherent.client.name`** - Primary source (from bordereau linking)
2. **`adherent.assurance`** - Secondary source (insurance company name)
3. **`ordreVirement.donneurOrdre.nom`** - Fallback (donneur d'ordre name)

### 2. Where Data is Stored

#### Database Schema
```prisma
model Adherent {
  id            String  @id @default(uuid())
  matricule     String
  nom           String
  prenom        String
  clientId      String  // Links to Client table
  rib           String
  assurance     String? // Insurance company name
  client        Client  @relation(fields: [clientId], references: [id])
}

model Client {
  id                   String  @id @default(uuid())
  name                 String  @unique  // THIS IS THE SOCIÉTÉ FIELD
  compagnieAssuranceId String?
  compagnieAssurance   CompagnieAssurance? @relation(...)
}
```

#### VirementItem Storage
When Excel is imported, the société data is temporarily stored in `VirementItem.erreur` as JSON:
```typescript
erreur: JSON.stringify({
  matricule: item.adherent.matricule,
  nom: item.adherent.nom,
  prenom: item.adherent.prenom,
  rib: item.adherent.rib,
  societe: item.adherent.assurance || item.adherent.client?.name
})
```

### 3. TXT Generation Process

#### File: `txt-generation.service.ts`
```typescript
async generateOVTxtFromOrderId(ordreVirementId: string): Promise<string> {
  // Fetch OV with adherent and client data
  const ordreVirement = await this.prisma.ordreVirement.findUnique({
    where: { id: ordreVirementId },
    include: {
      donneurOrdre: true,
      items: {
        include: {
          adherent: {
            include: {
              client: true  // ✅ This includes the société name
            }
          }
        }
      }
    }
  });

  // Map items to virement data
  const virements = ordreVirement.items
    .filter(item => item.statut === 'VALIDE')
    .map((item: any, index) => {
      const adherent = item.adherent;
      
      // ✅ SOCIÉTÉ COMES FROM BORDEREAU LINKING
      const societe = adherent.client?.name || adherent.assurance || ordreVirement.donneurOrdre.nom;
      
      return {
        reference: `${ordreVirement.reference}-${(index + 1).toString().padStart(3, '0')}`,
        montant: item.montant,
        rib: adherent.rib,
        nom: adherent.nom,
        prenom: adherent.prenom || '',
        matricule: adherent.matricule,
        societe  // ✅ Used in TXT generation
      };
    });

  return this.generateOVTxt({ donneurOrdre, virements, dateCreation, reference });
}
```

#### TXT Format (BTK/COMAR)
```typescript
private generateBTKComarFormat(data: OVTxtData): string {
  data.virements.forEach((virement) => {
    // ✅ Société is used here (first 5 chars, uppercase, padded)
    const societePrefix = (virement.societe || 'PGH')
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .substring(0, 5)
      .padEnd(5, ' ');
    
    // Example output: "PGH   APM2026VIR-20260306-0007 du 06032026 OV GM n VIR-20260306-0007"
    line += `${societePrefix} APM${dateStr.substring(0, 4)}${data.reference}...`;
  });
}
```

### 4. Example TXT Output

```
V1  0810400012345678901200000000VIR-20260306-0007000202603060001   0000011   788TND000000000045133000                  
V2  0810400012345678901211002003113801378869IBTISSEM LAKHNACH             13542000000000000000202603060001000PGH   APM2026VIR-20260306-0007 du 06032026 OV GM n VIR-20260306-0007 
                                                                                                                    ^^^^^ 
                                                                                                                    Société from bordereau
```

### 5. Verification

To verify the société field is correctly read from bordereau:

1. **Check Console Logs** during TXT generation:
   ```
   ✅ TXT Gen - Item 1: Société="PGH & FILIALES" (from client.name)
   ✅ TXT Gen - Item 2: Société="ASTREE" (from assurance)
   ```

2. **Database Query** to verify adherent-client linking:
   ```sql
   SELECT 
     a.matricule,
     a.nom,
     a.prenom,
     c.name as societe,
     a.assurance
   FROM "Adherent" a
   LEFT JOIN "Client" c ON a."clientId" = c.id
   WHERE a.matricule = '13542';
   ```

3. **Check VirementItem** for stored data:
   ```sql
   SELECT 
     vi.montant,
     vi.erreur,
     a.matricule,
     c.name as societe
   FROM "VirementItem" vi
   JOIN "Adherent" a ON vi."adherentId" = a.id
   JOIN "Client" c ON a."clientId" = c.id
   WHERE vi."ordreVirementId" = 'your-ov-id';
   ```

## Key Points

✅ **Société is ALWAYS read from `adherent.client.name` (bordereau linking)**
✅ **Excel file does NOT provide société** - it only provides matricule, montant, RIB
✅ **Adherent must exist in database** with correct `clientId` linking
✅ **Client.name is the société field** used in TXT generation
✅ **Default fallback is 'PGH'** if no client/assurance found

## Troubleshooting

If société appears incorrect in TXT:

1. **Check adherent-client linking:**
   ```typescript
   const adherent = await prisma.adherent.findUnique({
     where: { matricule: 'XXX' },
     include: { client: true }
   });
   console.log('Client name:', adherent.client?.name);
   ```

2. **Verify client exists:**
   ```typescript
   const client = await prisma.client.findUnique({
     where: { id: adherent.clientId }
   });
   console.log('Client:', client);
   ```

3. **Check console logs** during TXT generation for société source

## Related Files

- `server/src/finance/txt-generation.service.ts` - TXT generation logic
- `server/src/finance/ordre-virement.service.ts` - OV creation and item storage
- `server/src/finance/adherent.service.ts` - Adherent management
- `server/prisma/schema.prisma` - Database schema
