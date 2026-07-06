const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function generateRib() {
  const prefix = ['08', '04', '10', '07', '11'][Math.floor(Math.random() * 5)];
  const suffix = String(Math.floor(Math.random() * 1e18)).padStart(18, '0');
  return `${prefix}${suffix}`;
}

function generateMatricule(clientName, index) {
  const prefix = (clientName || 'ARS').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  return `${prefix}-${String(index + 1).padStart(3, '0')}`;
}

function generateContractReference(contract, index) {
  const base = (contract.codeAssure || '0000').toString().replace(/[^A-Z0-9]/g, '').toUpperCase();
  return `BORD-${base}-${String(index + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
}

async function ensureSeedData() {
  console.log('🔎 Reading existing clients and contracts...');

  let clients = await prisma.client.findMany({
    include: {
      contracts: true,
    },
  });

  if (!clients.length) {
    console.log('No client found. Creating a fallback client and contract...');
    const createdClient = await prisma.client.create({
      data: {
        name: 'CLIENT DEMO ARS',
        reglementDelay: 30,
        reclamationDelay: 15,
        email: 'demo@ars.tn',
        phone: '00000000',
        address: 'Tunis',
        modeRecuperation: 'VIREMENT',
      },
    });

    const createdContract = await prisma.contract.create({
      data: {
        clientId: createdClient.id,
        clientName: createdClient.name,
        codeAssure: '4103',
        delaiReclamation: 15,
        delaiReglement: 30,
        documentPath: '/contracts/demo-contract.pdf',
        startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      },
    });

    clients = [{ ...createdClient, contracts: [createdContract] }];
  }

  console.log(`Found ${clients.length} client(s)`);

  let createdBordereaux = 0;
  let createdAdherents = 0;

  for (const client of clients) {
    const contracts = client.contracts && client.contracts.length ? client.contracts : [];

    if (!contracts.length) {
      console.log(`No contract found for client ${client.name}. Creating one...`);
      const createdContract = await prisma.contract.create({
        data: {
          clientId: client.id,
          clientName: client.name,
          codeAssure: '4103',
          delaiReclamation: client.reclamationDelay || 15,
          delaiReglement: client.reglementDelay || 30,
          documentPath: `/contracts/${client.name.replace(/\s+/g, '-').toLowerCase()}.pdf`,
          startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
        },
      });
      contracts.push(createdContract);
    }

    for (const contract of contracts) {
      const existingBordereau = await prisma.bordereau.findFirst({
        where: {
          clientId: client.id,
          contractId: contract.id,
        },
      });

      if (!existingBordereau) {
        const bordereau = await prisma.bordereau.create({
          data: {
            reference: generateContractReference(contract, createdBordereaux),
            clientId: client.id,
            contractId: contract.id,
            dateReception: new Date(),
            delaiReglement: contract.delaiReglement || client.reglementDelay || 30,
            statut: 'PRET_VIREMENT',
            nombreBS: 3,
            dateCloture: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
            scanStatus: 'SCANNE',
            completionRate: 100,
            documentStatus: 'NORMAL',
            priority: 1,
          },
        });
        createdBordereaux += 1;
        console.log(`Created bordereau ${bordereau.reference} for ${client.name} / ${contract.codeAssure || 'N/A'}`);
      } else {
        console.log(`Bordereau already exists for ${client.name} / ${contract.codeAssure || 'N/A'}`);
      }

      const adherentCount = 2;
      for (let i = 0; i < adherentCount; i += 1) {
        const matricule = generateMatricule(client.name, i);
        const existingAdherent = await prisma.adherent.findFirst({
          where: {
            matricule,
            clientId: client.id,
          },
        });

        if (!existingAdherent) {
          await prisma.adherent.create({
            data: {
              matricule,
              nom: `Nom${i + 1}`,
              prenom: `Prenom${i + 1}`,
              clientId: client.id,
              rib: generateRib(),
              codeAssure: contract.codeAssure || '4103',
              numeroContrat: contract.id.slice(0, 8).toUpperCase(),
              assurance: client.name,
              statut: 'ACTIF',
            },
          });
          createdAdherents += 1;
        }
      }
    }
  }

  console.log(`✅ Seed complete. Created ${createdBordereaux} bordereau(x) and ${createdAdherents} adherent(s).`);
}

ensureSeedData()
  .catch((error) => {
    console.error('❌ Error while seeding finance data:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
