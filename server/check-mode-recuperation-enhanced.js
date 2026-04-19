const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkModeRecuperationEnhanced() {
  console.log('🔍 ENHANCED CLIENT ANALYSIS - Mode de Récupération & Complete Details\n');
  console.log('='.repeat(120));

  try {
    const clients = await prisma.client.findMany({
      where: {
        status: { not: 'deleted' }
      },
      include: {
        compagnieAssurance: true,
        chargeCompte: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            department: true
          }
        },
        gestionnaires: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            department: true
          }
        },
        contracts: {
          include: {
            teamLeader: {
              select: {
                id: true,
                fullName: true,
                role: true
              }
            },
            assignedManager: {
              select: {
                id: true,
                fullName: true,
                role: true
              }
            }
          }
        },
        bordereaux: {
          include: {
            chargeCompte: {
              select: {
                id: true,
                fullName: true,
                role: true
              }
            },
            currentHandler: {
              select: {
                id: true,
                fullName: true,
                role: true
              }
            },
            team: {
              select: {
                id: true,
                fullName: true,
                role: true
              }
            },
            documents: {
              include: {
                assignedTo: {
                  select: {
                    id: true,
                    fullName: true,
                    role: true
                  }
                }
              }
            }
          }
        },
        reclamations: {
          include: {
            assignedTo: {
              select: {
                id: true,
                fullName: true,
                role: true
              }
            }
          }
        },
        adherents: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    const withMode = clients.filter(c => c.modeRecuperation);
    const withoutMode = clients.filter(c => !c.modeRecuperation);

    // Summary Statistics
    console.log(`\n📊 GLOBAL SUMMARY:`);
    console.log(`   Total Clients: ${clients.length}`);
    console.log(`   ✅ With Mode de Récupération: ${withMode.length}`);
    console.log(`   ❌ Without Mode de Récupération: ${withoutMode.length}`);
    console.log('='.repeat(120));

    // Mode Breakdown
    console.log(`\n📈 MODE DE RÉCUPÉRATION BREAKDOWN:\n`);
    const modeStats = {
      VIREMENT: withMode.filter(c => c.modeRecuperation === 'VIREMENT').length,
      CHEQUE: withMode.filter(c => c.modeRecuperation === 'CHEQUE').length,
      FEUILLE_CAISSE: withMode.filter(c => c.modeRecuperation === 'FEUILLE_CAISSE').length,
      NULL: withoutMode.length
    };

    console.log(`   🏦 VIREMENT:        ${modeStats.VIREMENT} clients`);
    console.log(`   💳 CHEQUE:          ${modeStats.CHEQUE} clients`);
    console.log(`   📋 FEUILLE_CAISSE:  ${modeStats.FEUILLE_CAISSE} clients`);
    console.log(`   ❌ NULL/EMPTY:      ${modeStats.NULL} clients`);

    // Detailed Client Analysis
    console.log(`\n\n${'='.repeat(120)}`);
    console.log('📋 DETAILED CLIENT ANALYSIS');
    console.log('='.repeat(120));

    for (const client of clients) {
      console.log(`\n\n┌${'─'.repeat(118)}┐`);
      console.log(`│ CLIENT: ${client.name.padEnd(105)} │`);
      console.log(`├${'─'.repeat(118)}┤`);

      // Basic Info
      console.log(`│ 🆔 ID: ${client.id.padEnd(109)} │`);
      console.log(`│ 🏢 Compagnie: ${(client.compagnieAssurance?.nom || 'Non renseignée').padEnd(100)} │`);
      console.log(`│ 📧 Email: ${(client.email || 'Non renseigné').padEnd(106)} │`);
      console.log(`│ 📞 Phone: ${(client.phone || 'Non renseigné').padEnd(106)} │`);
      console.log(`│ 📍 Address: ${(client.address || 'Non renseignée').substring(0, 103).padEnd(103)} │`);
      console.log(`│ 🔄 Status: ${client.status.padEnd(105)} │`);
      
      // Mode de Récupération
      const modeLabel = client.modeRecuperation 
        ? `${client.modeRecuperation} ${client.modeRecuperation === 'VIREMENT' ? '🏦' : client.modeRecuperation === 'CHEQUE' ? '💳' : '📋'}`
        : '❌ NON DÉFINI';
      console.log(`│ 💰 Mode Récupération: ${modeLabel.padEnd(96)} │`);

      // Delays
      console.log(`│ ⏱️  Délai Règlement: ${String(client.reglementDelay).padEnd(98)} jours │`);
      console.log(`│ ⏱️  Délai Réclamation: ${String(client.reclamationDelay).padEnd(96)} heures │`);

      console.log(`├${'─'.repeat(118)}┤`);

      // Chef d'Équipe (Charge Compte)
      console.log(`│ 👤 CHEF D'ÉQUIPE (Charge Compte):`.padEnd(119) + ' │');
      if (client.chargeCompte) {
        console.log(`│    • Nom: ${client.chargeCompte.fullName.padEnd(106)} │`);
        console.log(`│    • Email: ${(client.chargeCompte.email || 'N/A').padEnd(104)} │`);
        console.log(`│    • Role: ${client.chargeCompte.role.padEnd(105)} │`);
        console.log(`│    • Department: ${(client.chargeCompte.department || 'N/A').padEnd(99)} │`);
      } else {
        console.log(`│    ❌ Aucun chef d'équipe assigné`.padEnd(119) + ' │');
      }

      console.log(`├${'─'.repeat(118)}┤`);

      // Gestionnaires
      console.log(`│ 👥 GESTIONNAIRES (${client.gestionnaires.length}):`.padEnd(119) + ' │');
      if (client.gestionnaires.length > 0) {
        client.gestionnaires.forEach((g, idx) => {
          console.log(`│    ${idx + 1}. ${g.fullName} (${g.role})`.padEnd(119) + ' │');
          console.log(`│       Email: ${(g.email || 'N/A').padEnd(106)} │`);
          console.log(`│       Department: ${(g.department || 'N/A').padEnd(99)} │`);
        });
      } else {
        console.log(`│    ℹ️  Aucun gestionnaire supplémentaire`.padEnd(119) + ' │');
      }

      console.log(`├${'─'.repeat(118)}┤`);

      // Contracts
      console.log(`│ 📑 CONTRATS (${client.contracts.length}):`.padEnd(119) + ' │');
      if (client.contracts.length > 0) {
        client.contracts.forEach((contract, idx) => {
          console.log(`│    ${idx + 1}. Contract ID: ${contract.id.substring(0, 8)}...`.padEnd(119) + ' │');
          console.log(`│       Délai Règlement: ${contract.delaiReglement} jours | Délai Réclamation: ${contract.delaiReclamation} heures`.padEnd(119) + ' │');
          console.log(`│       Période: ${new Date(contract.startDate).toLocaleDateString('fr-FR')} → ${new Date(contract.endDate).toLocaleDateString('fr-FR')}`.padEnd(119) + ' │');
          if (contract.teamLeader) {
            console.log(`│       Chef d'Équipe: ${contract.teamLeader.fullName} (${contract.teamLeader.role})`.padEnd(119) + ' │');
          }
          if (contract.assignedManager) {
            console.log(`│       Manager: ${contract.assignedManager.fullName} (${contract.assignedManager.role})`.padEnd(119) + ' │');
          }
        });
      } else {
        console.log(`│    ℹ️  Aucun contrat`.padEnd(119) + ' │');
      }

      console.log(`├${'─'.repeat(118)}┤`);

      // Bordereaux Statistics
      console.log(`│ 📄 BORDEREAUX (${client.bordereaux.length}):`.padEnd(119) + ' │');
      if (client.bordereaux.length > 0) {
        const bordereauxByStatus = client.bordereaux.reduce((acc, b) => {
          acc[b.statut] = (acc[b.statut] || 0) + 1;
          return acc;
        }, {});

        console.log(`│    Répartition par statut:`.padEnd(119) + ' │');
        Object.entries(bordereauxByStatus).forEach(([status, count]) => {
          console.log(`│       • ${status}: ${count}`.padEnd(119) + ' │');
        });

        // Document types in bordereaux
        const documentTypes = {};
        let totalDocuments = 0;
        let assignedDocuments = 0;
        const documentAssignments = { GESTIONNAIRE: 0, GESTIONNAIRE_SENIOR: 0, CHEF_EQUIPE: 0, OTHER: 0 };

        client.bordereaux.forEach(b => {
          b.documents.forEach(doc => {
            totalDocuments++;
            documentTypes[doc.type] = (documentTypes[doc.type] || 0) + 1;
            
            if (doc.assignedTo) {
              assignedDocuments++;
              if (doc.assignedTo.role === 'GESTIONNAIRE') {
                documentAssignments.GESTIONNAIRE++;
              } else if (doc.assignedTo.role === 'GESTIONNAIRE_SENIOR') {
                documentAssignments.GESTIONNAIRE_SENIOR++;
              } else if (doc.assignedTo.role === 'CHEF_EQUIPE') {
                documentAssignments.CHEF_EQUIPE++;
              } else {
                documentAssignments.OTHER++;
              }
            }
          });
        });

        console.log(`│    📎 Documents: ${totalDocuments} total`.padEnd(119) + ' │');
        if (totalDocuments > 0) {
          console.log(`│       Types de documents:`.padEnd(119) + ' │');
          Object.entries(documentTypes).forEach(([type, count]) => {
            console.log(`│          • ${type}: ${count}`.padEnd(119) + ' │');
          });

          console.log(`│       Affectations documents:`.padEnd(119) + ' │');
          console.log(`│          • Assignés: ${assignedDocuments}/${totalDocuments}`.padEnd(119) + ' │');
          console.log(`│          • GESTIONNAIRE: ${documentAssignments.GESTIONNAIRE}`.padEnd(119) + ' │');
          console.log(`│          • GESTIONNAIRE_SENIOR: ${documentAssignments.GESTIONNAIRE_SENIOR}`.padEnd(119) + ' │');
          console.log(`│          • CHEF_EQUIPE: ${documentAssignments.CHEF_EQUIPE}`.padEnd(119) + ' │');
          if (documentAssignments.OTHER > 0) {
            console.log(`│          • OTHER: ${documentAssignments.OTHER}`.padEnd(119) + ' │');
          }
        }

        // Bordereau-level assignments
        const bordereauxWithChef = client.bordereaux.filter(b => b.chargeCompte).length;
        const bordereauxWithHandler = client.bordereaux.filter(b => b.currentHandler).length;
        const bordereauxWithTeam = client.bordereaux.filter(b => b.team).length;

        console.log(`│    👤 Affectations bordereaux:`.padEnd(119) + ' │');
        console.log(`│       • Avec Chef de Compte: ${bordereauxWithChef}/${client.bordereaux.length}`.padEnd(119) + ' │');
        console.log(`│       • Avec Handler actuel: ${bordereauxWithHandler}/${client.bordereaux.length}`.padEnd(119) + ' │');
        console.log(`│       • Avec Team: ${bordereauxWithTeam}/${client.bordereaux.length}`.padEnd(119) + ' │');
      } else {
        console.log(`│    ℹ️  Aucun bordereau`.padEnd(119) + ' │');
      }

      console.log(`├${'─'.repeat(118)}┤`);

      // Réclamations
      console.log(`│ 📞 RÉCLAMATIONS (${client.reclamations.length}):`.padEnd(119) + ' │');
      if (client.reclamations.length > 0) {
        const reclamationsByStatus = client.reclamations.reduce((acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        }, {});

        const reclamationsBySeverity = client.reclamations.reduce((acc, r) => {
          acc[r.severity] = (acc[r.severity] || 0) + 1;
          return acc;
        }, {});

        console.log(`│    Par statut:`.padEnd(119) + ' │');
        Object.entries(reclamationsByStatus).forEach(([status, count]) => {
          console.log(`│       • ${status}: ${count}`.padEnd(119) + ' │');
        });

        console.log(`│    Par sévérité:`.padEnd(119) + ' │');
        Object.entries(reclamationsBySeverity).forEach(([severity, count]) => {
          console.log(`│       • ${severity}: ${count}`.padEnd(119) + ' │');
        });

        const assignedReclamations = client.reclamations.filter(r => r.assignedTo).length;
        console.log(`│    Assignées: ${assignedReclamations}/${client.reclamations.length}`.padEnd(119) + ' │');
      } else {
        console.log(`│    ✅ Aucune réclamation`.padEnd(119) + ' │');
      }

      console.log(`├${'─'.repeat(118)}┤`);

      // Adhérents
      console.log(`│ 👨‍👩‍👧‍👦 ADHÉRENTS: ${client.adherents.length}`.padEnd(119) + ' │');
      if (client.adherents.length > 0) {
        const activeAdherents = client.adherents.filter(a => a.statut === 'ACTIF').length;
        const inactiveAdherents = client.adherents.filter(a => a.statut !== 'ACTIF').length;
        console.log(`│    • Actifs: ${activeAdherents}`.padEnd(119) + ' │');
        console.log(`│    • Inactifs: ${inactiveAdherents}`.padEnd(119) + ' │');
      }

      console.log(`└${'─'.repeat(118)}┘`);
    }

    // Final Summary
    console.log(`\n\n${'='.repeat(120)}`);
    console.log('📊 FINAL STATISTICS');
    console.log('='.repeat(120));

    const totalBordereaux = clients.reduce((sum, c) => sum + c.bordereaux.length, 0);
    const totalDocuments = clients.reduce((sum, c) => 
      sum + c.bordereaux.reduce((docSum, b) => docSum + b.documents.length, 0), 0);
    const totalReclamations = clients.reduce((sum, c) => sum + c.reclamations.length, 0);
    const totalAdherents = clients.reduce((sum, c) => sum + c.adherents.length, 0);
    const totalContracts = clients.reduce((sum, c) => sum + c.contracts.length, 0);

    const clientsWithChef = clients.filter(c => c.chargeCompte).length;
    const clientsWithGestionnaires = clients.filter(c => c.gestionnaires.length > 0).length;
    const clientsWithContracts = clients.filter(c => c.contracts.length > 0).length;

    console.log(`\n📈 Global Metrics:`);
    console.log(`   • Total Bordereaux: ${totalBordereaux}`);
    console.log(`   • Total Documents: ${totalDocuments}`);
    console.log(`   • Total Réclamations: ${totalReclamations}`);
    console.log(`   • Total Adhérents: ${totalAdherents}`);
    console.log(`   • Total Contrats: ${totalContracts}`);
    console.log(`\n👥 Assignment Metrics:`);
    console.log(`   • Clients avec Chef d'Équipe: ${clientsWithChef}/${clients.length}`);
    console.log(`   • Clients avec Gestionnaires: ${clientsWithGestionnaires}/${clients.length}`);
    console.log(`   • Clients avec Contrats: ${clientsWithContracts}/${clients.length}`);

    console.log(`\n⚠️  ACTION ITEMS:`);
    if (withoutMode.length > 0) {
      console.log(`   • ${withoutMode.length} client(s) need Mode de Récupération to be set`);
    }
    if (clients.length - clientsWithChef > 0) {
      console.log(`   • ${clients.length - clientsWithChef} client(s) need Chef d'Équipe assignment`);
    }
    if (clients.length - clientsWithContracts > 0) {
      console.log(`   • ${clients.length - clientsWithContracts} client(s) need Contract setup`);
    }

    console.log('\n' + '='.repeat(120));
    console.log('✅ Enhanced analysis complete!\n');

  } catch (error) {
    console.error('❌ Error during enhanced analysis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkModeRecuperationEnhanced();
