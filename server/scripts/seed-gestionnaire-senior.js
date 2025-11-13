const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creating GESTIONNAIRE_SENIOR user with test data...\n');

  const email = 'gestionnaire.senior@ars.tn';
  const password = 'Senior123@';
  const fullName = 'Gestionnaire Senior Test';

  try {
    // 1. Create or update user
    let gestionnaireUser;
    const existing = await prisma.user.findUnique({ where: { email } });
    
    if (existing) {
      console.log('⚠️  User already exists. Updating...\n');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      gestionnaireUser = await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          role: 'GESTIONNAIRE_SENIOR',
          active: true,
          department: 'SANTE',
          serviceType: 'SANTE'
        }
      });
    } else {
      console.log('✨ Creating new user...\n');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      gestionnaireUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          fullName,
          role: 'GESTIONNAIRE_SENIOR',
          department: 'SANTE',
          serviceType: 'SANTE',
          active: true,
          capacity: 30
        }
      });
    }
    console.log('✅ User ready!\n');

    // 2. Create test clients
    console.log('🏢 Creating test clients...');
    const clients = [];
    for (let i = 1; i <= 3; i++) {
      const client = await prisma.client.upsert({
        where: { name: `Client Senior ${i}` },
        update: { chargeCompteId: gestionnaireUser.id },
        create: {
          name: `Client Senior ${i}`,
          email: `client.senior${i}@test.tn`,
          phone: `+216 ${70 + i} 123 456`,
          address: `${i} Avenue Test, Tunis`,
          reglementDelay: 15 + (i * 5),
          reclamationDelay: 10 + i,
          status: 'active',
          chargeCompteId: gestionnaireUser.id
        }
      });
      clients.push(client);
    }
    console.log(`✅ Created ${clients.length} clients\n`);

    // 3. Create contracts
    console.log('📄 Creating contracts...');
    const contracts = [];
    for (let i = 0; i < clients.length; i++) {
      // Check if contract exists for this client
      let contract = await prisma.contract.findFirst({
        where: { 
          clientId: clients[i].id,
          codeAssure: `SENIOR-${1000 + i}`
        }
      });

      if (contract) {
        // Update existing contract
        contract = await prisma.contract.update({
          where: { id: contract.id },
          data: { 
            teamLeaderId: gestionnaireUser.id,
            assignedManagerId: gestionnaireUser.id
          }
        });
      } else {
        // Create new contract
        contract = await prisma.contract.create({
          data: {
            clientId: clients[i].id,
            clientName: clients[i].name,
            codeAssure: `SENIOR-${1000 + i}`,
            assignedManagerId: gestionnaireUser.id,
            teamLeaderId: gestionnaireUser.id,
            startDate: new Date('2024-01-01'),
            endDate: new Date('2025-12-31'),
            delaiReclamation: clients[i].reclamationDelay,
            delaiReglement: clients[i].reglementDelay,
            documentPath: `/contracts/senior_contract_${i + 1}.pdf`,
            version: 1
          }
        });
      }
      contracts.push(contract);
    }
    console.log(`✅ Created ${contracts.length} contracts\n`);

    // 4. Create bordereaux with different statuses
    console.log('📋 Creating bordereaux...');
    const types = ['BULLETIN_SOIN', 'COMPLEMENT_INFORMATION', 'ADHESION', 'RECLAMATION'];
    const statuses = ['ASSIGNE', 'EN_COURS', 'TRAITE', 'PRET_VIREMENT'];
    let bordereauxCount = 0;

    for (let clientIdx = 0; clientIdx < clients.length; clientIdx++) {
      for (let i = 0; i < 5; i++) {
        const type = types[i % types.length];
        const status = statuses[i % statuses.length];
        const dateReception = new Date(Date.now() - (i * 2 * 24 * 60 * 60 * 1000));
        
        const bordereau = await prisma.bordereau.create({
          data: {
            reference: `SENIOR-BDX-${String(bordereauxCount + 1).padStart(4, '0')}`,
            clientId: clients[clientIdx].id,
            contractId: contracts[clientIdx].id,
            type: type,
            dateReception: dateReception,
            dateReceptionBO: dateReception,
            dateDebutScan: new Date(dateReception.getTime() + 2 * 60 * 60 * 1000),
            dateFinScan: new Date(dateReception.getTime() + 4 * 60 * 60 * 1000),
            dateReceptionSante: new Date(dateReception.getTime() + 6 * 60 * 60 * 1000),
            nombreBS: 5 + i,
            statut: status,
            delaiReglement: clients[clientIdx].reglementDelay,
            chargeCompteId: gestionnaireUser.id,
            teamId: gestionnaireUser.id,
            currentHandlerId: gestionnaireUser.id,
            assignedToUserId: gestionnaireUser.id,
            scanStatus: 'SCANNE',
            completionRate: status === 'TRAITE' ? 100 : status === 'EN_COURS' ? 60 : 20,
            priority: (i % 3) + 1
          }
        });
        bordereauxCount++;

        // Create documents for each bordereau
        const numDocs = 3 + (i % 3);
        for (let docIdx = 1; docIdx <= numDocs; docIdx++) {
          await prisma.document.create({
            data: {
              name: `DOC-${bordereau.reference}-${docIdx}.pdf`,
              type: type,
              path: `/uploads/senior/${bordereau.reference}/doc_${docIdx}.pdf`,
              uploadedById: gestionnaireUser.id,
              bordereauId: bordereau.id,
              status: status === 'TRAITE' ? 'TRAITE' : status === 'EN_COURS' ? 'EN_COURS' : 'SCANNE',
              assignedToUserId: gestionnaireUser.id,
              assignedByUserId: gestionnaireUser.id,
              assignedAt: new Date(),
              priority: bordereau.priority,
              slaApplicable: true,
              pageCount: 1 + (docIdx % 3)
            }
          });
        }
      }
    }
    console.log(`✅ Created ${bordereauxCount} bordereaux with documents\n`);

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ GESTIONNAIRE_SENIOR DATA SEEDED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log('\n📊 Summary:');
    console.log(`   👤 User: ${fullName}`);
    console.log(`   🏢 Clients: ${clients.length}`);
    console.log(`   📄 Contracts: ${contracts.length}`);
    console.log(`   📋 Bordereaux: ${bordereauxCount}`);
    console.log(`   📄 Documents: ${bordereauxCount * 4} (approx)`);
    console.log('\n🔐 LOGIN CREDENTIALS:');
    console.log(`   📧 Email:    ${email}`);
    console.log(`   🔑 Password: ${password}`);
    console.log(`   👤 Role:     GESTIONNAIRE_SENIOR`);
    console.log('\n🚀 Login at: http://localhost:5173\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();