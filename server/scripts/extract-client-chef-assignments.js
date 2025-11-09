const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function extractClientChefAssignments() {
  try {
    console.log('🔍 Extracting Client and Chef d\'équipe assignments...\n');

    // Get all clients with their charge de compte and contracts
    const clients = await prisma.client.findMany({
      include: {
        chargeCompte: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            teamLeaderId: true,
            teamLeader: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true
              }
            }
          }
        },
        contracts: {
          include: {
            assignedManager: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                teamLeaderId: true,
                teamLeader: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    role: true
                  }
                }
              }
            },
            teamLeader: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true
              }
            }
          }
        },
        gestionnaires: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            teamLeaderId: true,
            teamLeader: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true
              }
            }
          }
        }
      }
    });

    console.log(`📊 Total Clients: ${clients.length}\n`);
    console.log('=' .repeat(100));

    const results = [];

    for (const client of clients) {
      const clientData = {
        clientId: client.id,
        clientName: client.name,
        status: client.status,
        chargeCompte: null,
        chefEquipeFromChargeCompte: null,
        contracts: [],
        gestionnaires: [],
        chefsEquipe: new Set()
      };

      // Charge de compte info
      if (client.chargeCompte) {
        clientData.chargeCompte = {
          id: client.chargeCompte.id,
          name: client.chargeCompte.fullName,
          email: client.chargeCompte.email,
          role: client.chargeCompte.role
        };

        if (client.chargeCompte.teamLeader) {
          clientData.chefEquipeFromChargeCompte = {
            id: client.chargeCompte.teamLeader.id,
            name: client.chargeCompte.teamLeader.fullName,
            email: client.chargeCompte.teamLeader.email,
            role: client.chargeCompte.teamLeader.role
          };
          clientData.chefsEquipe.add(client.chargeCompte.teamLeader.id);
        }
      }

      // Contract info
      for (const contract of client.contracts) {
        const contractInfo = {
          contractId: contract.id,
          assignedManager: null,
          chefEquipeFromManager: null,
          chefEquipeFromContract: null
        };

        if (contract.assignedManager) {
          contractInfo.assignedManager = {
            id: contract.assignedManager.id,
            name: contract.assignedManager.fullName,
            email: contract.assignedManager.email,
            role: contract.assignedManager.role
          };

          if (contract.assignedManager.teamLeader) {
            contractInfo.chefEquipeFromManager = {
              id: contract.assignedManager.teamLeader.id,
              name: contract.assignedManager.teamLeader.fullName,
              email: contract.assignedManager.teamLeader.email
            };
            clientData.chefsEquipe.add(contract.assignedManager.teamLeader.id);
          }
        }

        if (contract.teamLeader) {
          contractInfo.chefEquipeFromContract = {
            id: contract.teamLeader.id,
            name: contract.teamLeader.fullName,
            email: contract.teamLeader.email
          };
          clientData.chefsEquipe.add(contract.teamLeader.id);
        }

        clientData.contracts.push(contractInfo);
      }

      // Gestionnaires info
      for (const gest of client.gestionnaires) {
        const gestInfo = {
          id: gest.id,
          name: gest.fullName,
          email: gest.email,
          role: gest.role,
          chefEquipe: null
        };

        if (gest.teamLeader) {
          gestInfo.chefEquipe = {
            id: gest.teamLeader.id,
            name: gest.teamLeader.fullName,
            email: gest.teamLeader.email
          };
          clientData.chefsEquipe.add(gest.teamLeader.id);
        }

        clientData.gestionnaires.push(gestInfo);
      }

      clientData.chefsEquipe = Array.from(clientData.chefsEquipe);
      results.push(clientData);

      // Display
      console.log(`\n📋 CLIENT: ${client.name}`);
      console.log(`   ID: ${client.id}`);
      console.log(`   Status: ${client.status}`);
      
      if (clientData.chargeCompte) {
        console.log(`\n   👤 Chargé de Compte:`);
        console.log(`      - ${clientData.chargeCompte.name} (${clientData.chargeCompte.email})`);
        console.log(`      - Role: ${clientData.chargeCompte.role}`);
      }

      if (clientData.chefEquipeFromChargeCompte) {
        console.log(`\n   👨‍💼 Chef d'Équipe (via Chargé de Compte):`);
        console.log(`      - ${clientData.chefEquipeFromChargeCompte.name}`);
        console.log(`      - ${clientData.chefEquipeFromChargeCompte.email}`);
      }

      if (clientData.contracts.length > 0) {
        console.log(`\n   📄 Contracts (${clientData.contracts.length}):`);
        clientData.contracts.forEach((c, idx) => {
          console.log(`      Contract ${idx + 1}:`);
          if (c.chefEquipeFromContract) {
            console.log(`         Chef d'Équipe: ${c.chefEquipeFromContract.name}`);
          }
          if (c.chefEquipeFromManager) {
            console.log(`         Chef via Manager: ${c.chefEquipeFromManager.name}`);
          }
        });
      }

      if (clientData.gestionnaires.length > 0) {
        console.log(`\n   👥 Gestionnaires (${clientData.gestionnaires.length}):`);
        clientData.gestionnaires.forEach(g => {
          console.log(`      - ${g.name} (${g.email})`);
          if (g.chefEquipe) {
            console.log(`        Chef: ${g.chefEquipe.name}`);
          }
        });
      }

      if (clientData.chefsEquipe.length > 0) {
        console.log(`\n   ✅ Total Chefs d'Équipe assigned: ${clientData.chefsEquipe.length}`);
      } else {
        console.log(`\n   ⚠️  NO Chef d'Équipe assigned!`);
      }

      console.log('\n' + '-'.repeat(100));
    }

    // Summary
    console.log('\n\n📊 SUMMARY:');
    console.log('=' .repeat(100));
    
    const clientsWithChef = results.filter(c => c.chefsEquipe.length > 0);
    const clientsWithoutChef = results.filter(c => c.chefsEquipe.length === 0);
    
    console.log(`✅ Clients WITH Chef d'Équipe: ${clientsWithChef.length}`);
    console.log(`⚠️  Clients WITHOUT Chef d'Équipe: ${clientsWithoutChef.length}`);
    
    if (clientsWithoutChef.length > 0) {
      console.log('\n⚠️  Clients needing Chef assignment:');
      clientsWithoutChef.forEach(c => {
        console.log(`   - ${c.clientName} (ID: ${c.clientId})`);
      });
    }

    // Get all unique chefs
    const allChefs = new Set();
    results.forEach(r => r.chefsEquipe.forEach(c => allChefs.add(c)));
    
    console.log(`\n👨‍💼 Total unique Chefs d'Équipe: ${allChefs.size}`);

    // Export to JSON
    const fs = require('fs');
    const exportPath = './client-chef-assignments.json';
    fs.writeFileSync(exportPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Data exported to: ${exportPath}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

extractClientChefAssignments();
