// Script to extract OV data from production database
// Run: node extract-ov-data.js VIR-20260323-0003

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function extractOVData(reference) {
  try {
    console.log(`🔍 Searching for OV: ${reference}`);
    
    const ov = await prisma.ordreVirement.findFirst({
      where: { reference },
      include: {
        donneurOrdre: true,
        bordereau: {
          include: {
            client: true,
            contract: true
          }
        },
        items: {
          include: {
            adherent: {
              include: {
                client: true
              }
            }
          }
        },
        documents: true
      }
    });

    if (!ov) {
      console.error(`❌ OV not found: ${reference}`);
      process.exit(1);
    }

    console.log(`✅ Found OV: ${ov.reference}`);
    console.log(`   - Items: ${ov.items?.length || 0}`);
    console.log(`   - Total: ${ov.montantTotal} TND`);
    console.log(`   - Bordereau: ${ov.bordereau?.reference || 'N/A'}`);
    console.log(`   - Client: ${ov.bordereau?.client?.name || 'N/A'}`);

    // Extract data for local import
    const exportData = {
      ordreVirement: {
        reference: ov.reference,
        montantTotal: ov.montantTotal,
        dateCreation: ov.dateCreation,
        etatVirement: ov.etatVirement,
        validationStatus: ov.validationStatus,
        utilisateurSante: ov.utilisateurSante
      },
      donneurOrdre: {
        nom: ov.donneurOrdre.nom,
        rib: ov.donneurOrdre.rib,
        banque: ov.donneurOrdre.banque,
        agence: ov.donneurOrdre.agence,
        address: ov.donneurOrdre.address
      },
      bordereau: ov.bordereau ? {
        reference: ov.bordereau.reference,
        nombreBS: ov.bordereau.nombreBS,
        dateReception: ov.bordereau.dateReception,
        statut: ov.bordereau.statut,
        client: {
          name: ov.bordereau.client?.name,
          email: ov.bordereau.client?.email
        },
        contract: ov.bordereau.contract ? {
          codeAssure: ov.bordereau.contract.codeAssure,
          delaiReglement: ov.bordereau.contract.delaiReglement
        } : null
      } : null,
      items: ov.items?.map(item => ({
        adherent: {
          matricule: item.adherent?.matricule,
          nom: item.adherent?.nom,
          prenom: item.adherent?.prenom,
          rib: item.adherent?.rib,
          statut: item.adherent?.statut,
          client: {
            name: item.adherent?.client?.name
          }
        },
        montant: item.montant,
        statut: item.statut,
        erreur: item.erreur
      })) || []
    };

    // Save to JSON file
    const filename = `ov-export-${reference}.json`;
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
    console.log(`\n✅ Data exported to: ${filename}`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Total adherents: ${exportData.items.length}`);
    console.log(`   - Total amount: ${exportData.ordreVirement.montantTotal} TND`);
    console.log(`   - Status: ${exportData.ordreVirement.etatVirement}`);
    
    // Generate SQL insert statements
    console.log(`\n📝 Generating SQL for local import...`);
    
    const sqlStatements = [];
    
    // Insert client if needed
    if (exportData.bordereau?.client) {
      sqlStatements.push(`
-- Insert client (if not exists)
INSERT INTO "Client" (id, name, email, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '${exportData.bordereau.client.name}',
  '${exportData.bordereau.client.email || 'test@example.com'}',
  NOW(),
  NOW()
) ON CONFLICT (name) DO NOTHING;
`);
    }
    
    // Insert adherents
    exportData.items.forEach((item, idx) => {
      sqlStatements.push(`
-- Insert adherent ${idx + 1}: ${item.adherent.nom} ${item.adherent.prenom}
INSERT INTO "Adherent" (id, matricule, nom, prenom, rib, statut, "clientId", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '${item.adherent.matricule}',
  '${item.adherent.nom}',
  '${item.adherent.prenom}',
  '${item.adherent.rib}',
  '${item.adherent.statut}',
  (SELECT id FROM "Client" WHERE name = '${item.adherent.client.name}' LIMIT 1),
  NOW(),
  NOW()
) ON CONFLICT (matricule, "clientId") DO NOTHING;
`);
    });
    
    const sqlFilename = `ov-import-${reference}.sql`;
    fs.writeFileSync(sqlFilename, sqlStatements.join('\n'));
    console.log(`✅ SQL exported to: ${sqlFilename}`);
    
    console.log(`\n🎯 To import locally:`);
    console.log(`   1. Copy ${filename} to your local machine`);
    console.log(`   2. Run: psql -U postgres -d ars_db -f ${sqlFilename}`);
    console.log(`   3. Test PDF generation with this data`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get reference from command line
const reference = process.argv[2];

if (!reference) {
  console.error('❌ Usage: node extract-ov-data.js <OV_REFERENCE>');
  console.error('   Example: node extract-ov-data.js VIR-20260323-0003');
  process.exit(1);
}

extractOVData(reference);
