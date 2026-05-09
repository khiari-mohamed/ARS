// Import BTK Bordereau data into local database
// Run: node import-btk-bordereau.js

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function importBordereauData() {
  try {
    console.log('📦 Loading bordereau data...');
    const data = JSON.parse(fs.readFileSync('bordereau-export-BTK-BR-2026721437.json', 'utf8'));
    
    // 1. Create or get BTK client
    console.log('\n1️⃣ Creating BTK client...');
    const client = await prisma.client.upsert({
      where: { name: 'BTK' },
      update: {},
      create: {
        name: 'BTK',
        email: 'btk@example.com',
        phone: '',
        address: '',
        reglementDelay: 7,
        reclamationDelay: 30
      }
    });
    console.log(`✅ Client: ${client.name} (${client.id})`);
    
    // 2. Create contract
    console.log('\n2️⃣ Creating contract...');
    let contract = await prisma.contract.findFirst({
      where: {
        codeAssure: '10205',
        clientId: client.id
      }
    });
    
    if (!contract) {
      contract = await prisma.contract.create({
        data: {
          codeAssure: '10205',
          clientId: client.id,
          clientName: client.name,
          delaiReglement: 7,
          delaiReclamation: 30,
          documentPath: '',
          startDate: new Date(),
          endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        }
      });
    }
    console.log(`✅ Contract: ${contract.codeAssure}`);
    
    // 3. Create bordereau
    console.log('\n3️⃣ Creating bordereau...');
    const bordereau = await prisma.bordereau.upsert({
      where: { reference: data.bordereau.reference },
      update: {
        statut: data.bordereau.statut,
        nombreBS: data.bordereau.nombreBS
      },
      create: {
        reference: data.bordereau.reference,
        clientId: client.id,
        contractId: contract.id,
        nombreBS: data.bordereau.nombreBS,
        dateReception: new Date(data.bordereau.dateReception),
        statut: data.bordereau.statut,
        delaiReglement: data.bordereau.delaiReglement
      }
    });
    console.log(`✅ Bordereau: ${bordereau.reference}`);
    
    // 4. Create donneur d'ordre
    console.log('\n4️⃣ Creating donneur d\'ordre...');
    let donneurOrdre = await prisma.donneurOrdre.findFirst({
      where: { rib: data.ordresVirement[0].donneurOrdre.rib }
    });
    
    if (!donneurOrdre) {
      donneurOrdre = await prisma.donneurOrdre.create({
        data: {
          nom: data.ordresVirement[0].donneurOrdre.nom,
          rib: data.ordresVirement[0].donneurOrdre.rib,
          banque: data.ordresVirement[0].donneurOrdre.banque,
          structureTxt: 'STANDARD',
          formatTxtType: 'STANDARD',
          statut: 'ACTIF'
        }
      });
    }
    console.log(`✅ Donneur: ${donneurOrdre.nom}`);
    
    // 5. Create adherents
    console.log('\n5️⃣ Creating 62 adherents...');
    const items = data.ordresVirement[0].items;
    let adherentCount = 0;
    
    for (const item of items) {
      const adherent = await prisma.adherent.upsert({
        where: {
          matricule_clientId: {
            matricule: item.adherent.matricule,
            clientId: client.id
          }
        },
        update: {
          nom: item.adherent.nom,
          prenom: item.adherent.prenom,
          rib: item.adherent.rib,
          statut: item.adherent.statut
        },
        create: {
          matricule: item.adherent.matricule,
          nom: item.adherent.nom,
          prenom: item.adherent.prenom,
          rib: item.adherent.rib,
          statut: item.adherent.statut,
          clientId: client.id
        }
      });
      adherentCount++;
      if (adherentCount % 10 === 0) {
        console.log(`   ✅ Created ${adherentCount}/${items.length} adherents...`);
      }
    }
    console.log(`✅ Total adherents created: ${adherentCount}`);
    
    // 6. Create OV
    console.log('\n6️⃣ Creating ordre de virement...');
    const ov = data.ordresVirement[0];
    const ordreVirement = await prisma.ordreVirement.upsert({
      where: { reference: ov.reference },
      update: {
        montantTotal: ov.montantTotal,
        etatVirement: ov.etatVirement
      },
      create: {
        reference: ov.reference,
        donneurOrdreId: donneurOrdre.id,
        bordereauId: bordereau.id,
        montantTotal: ov.montantTotal,
        dateCreation: new Date(ov.dateCreation),
        etatVirement: ov.etatVirement,
        validationStatus: 'VALIDE',
        utilisateurSante: 'local-test-user'
      }
    });
    console.log(`✅ OV: ${ordreVirement.reference} (${ordreVirement.montantTotal} TND)`);
    
    // 7. Create virement items
    console.log('\n7️⃣ Creating virement items...');
    let itemCount = 0;
    
    for (const item of items) {
      const adherent = await prisma.adherent.findFirst({
        where: {
          matricule: item.adherent.matricule,
          clientId: client.id
        }
      });
      
      if (adherent) {
        await prisma.virementItem.create({
          data: {
            ordreVirementId: ordreVirement.id,
            adherentId: adherent.id,
            montant: item.montant,
            statut: item.statut
          }
        });
        itemCount++;
      }
    }
    console.log(`✅ Total virement items created: ${itemCount}`);
    
    console.log('\n🎉 Import completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Client: BTK`);
    console.log(`   - Bordereau: ${bordereau.reference}`);
    console.log(`   - OV: ${ordreVirement.reference}`);
    console.log(`   - Adherents: ${adherentCount}`);
    console.log(`   - Total: ${ordreVirement.montantTotal} TND`);
    console.log('\n🧪 Now test PDF generation with:');
    console.log(`   - OV ID: ${ordreVirement.id}`);
    console.log(`   - Reference: ${ordreVirement.reference}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importBordereauData();
