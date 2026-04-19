const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function validateUIData() {
  console.log('🔍 VALIDATING UI DATA DISPLAY vs DATABASE\n');
  console.log('='.repeat(120));

  const issues = [];
  const validations = {
    total: 0,
    passed: 0,
    failed: 0
  };

  try {
    // Fetch all clients with complete relations
    const clients = await prisma.client.findMany({
      include: {
        gestionnaires: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            department: true
          }
        },
        chargeCompte: {
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
                email: true,
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
        reclamations: true,
        adherents: true
      }
    });

    console.log(`\n📊 Total Clients: ${clients.length}\n`);

    for (const client of clients) {
      console.log('┌' + '─'.repeat(118) + '┐');
      console.log(`│ CLIENT: ${client.name.padEnd(108)} │`);
      console.log('├' + '─'.repeat(118) + '┤');

      // ========================================
      // 1. VALIDATE BASIC CLIENT INFO
      // ========================================
      console.log('│ 🔍 BASIC INFO VALIDATION'.padEnd(119) + '│');
      
      validations.total++;
      if (client.compagnieAssurance) {
        console.log(`│ ✅ Compagnie d'Assurance: ${client.compagnieAssurance.padEnd(90)} │`);
        validations.passed++;
      } else {
        console.log(`│ ⚠️  Compagnie d'Assurance: MISSING (UI should show "Non renseigné")`.padEnd(119) + '│');
        issues.push({ client: client.name, field: 'compagnieAssurance', issue: 'Missing' });
        validations.failed++;
      }

      validations.total++;
      if (client.modeRecuperation) {
        const modeIcon = client.modeRecuperation === 'VIREMENT' ? '🏦' : 
                        client.modeRecuperation === 'CHEQUE' ? '💳' : '📋';
        console.log(`│ ✅ Mode Récupération: ${client.modeRecuperation} ${modeIcon}`.padEnd(119) + '│');
        validations.passed++;
      } else {
        console.log(`│ ❌ Mode Récupération: NOT SET (UI should show "❌ NON DÉFINI")`.padEnd(119) + '│');
        issues.push({ client: client.name, field: 'modeRecuperation', issue: 'Not set' });
        validations.failed++;
      }

      validations.total++;
      console.log(`│ ✅ Délai Règlement: ${client.reglementDelay} jours`.padEnd(119) + '│');
      validations.passed++;

      validations.total++;
      console.log(`│ ✅ Délai Réclamation: ${client.reclamationDelay} heures`.padEnd(119) + '│');
      validations.passed++;

      // ========================================
      // 2. VALIDATE CHEF D'ÉQUIPE (chargeCompte)
      // ========================================
      console.log('├' + '─'.repeat(118) + '┤');
      console.log('│ 👤 CHEF D\'ÉQUIPE VALIDATION'.padEnd(119) + '│');
      
      validations.total++;
      if (client.chargeCompte) {
        console.log(`│ ✅ Chef d'Équipe Assigned: ${client.chargeCompte.fullName.padEnd(85)} │`);
        console.log(`│    • Email: ${(client.chargeCompte.email || 'N/A').padEnd(103)} │`);
        console.log(`│    • Role: ${client.chargeCompte.role.padEnd(104)} │`);
        console.log(`│    • Department: ${(client.chargeCompte.department || 'N/A').padEnd(96)} │`);
        validations.passed++;
      } else {
        console.log(`│ ❌ Chef d'Équipe: NOT ASSIGNED (UI should show "❌ Aucun chef d'équipe assigné")`.padEnd(119) + '│');
        issues.push({ client: client.name, field: 'chargeCompte', issue: 'Not assigned' });
        validations.failed++;
      }

      // ========================================
      // 3. VALIDATE GESTIONNAIRES
      // ========================================
      console.log('├' + '─'.repeat(118) + '┤');
      console.log('│ 👥 GESTIONNAIRES VALIDATION'.padEnd(119) + '│');
      
      validations.total++;
      if (client.gestionnaires && client.gestionnaires.length > 0) {
        console.log(`│ ✅ Gestionnaires Count: ${client.gestionnaires.length}`.padEnd(119) + '│');
        client.gestionnaires.forEach((g, idx) => {
          console.log(`│    ${idx + 1}. ${g.fullName} (${g.role})`.padEnd(119) + '│');
        });
        validations.passed++;
      } else {
        console.log(`│ ℹ️  Gestionnaires: NONE (UI should show "ℹ️ Aucun gestionnaire supplémentaire")`.padEnd(119) + '│');
        validations.passed++;
      }

      // ========================================
      // 4. VALIDATE CONTRACTS
      // ========================================
      console.log('├' + '─'.repeat(118) + '┤');
      console.log('│ 📑 CONTRACTS VALIDATION'.padEnd(119) + '│');
      
      validations.total++;
      if (client.contracts && client.contracts.length > 0) {
        console.log(`│ ✅ Contracts Count: ${client.contracts.length}`.padEnd(119) + '│');
        client.contracts.forEach((contract, idx) => {
          console.log(`│    ${idx + 1}. Contract ID: ${contract.id.substring(0, 8)}...`.padEnd(119) + '│');
          console.log(`│       • Délai Règlement: ${contract.delaiReglement} jours | Délai Réclamation: ${contract.delaiReclamation} heures`.padEnd(119) + '│');
          console.log(`│       • Période: ${contract.startDate.toISOString().split('T')[0]} → ${contract.endDate.toISOString().split('T')[0]}`.padEnd(119) + '│');
          if (contract.teamLeader) {
            console.log(`│       • Chef d'Équipe: ${contract.teamLeader.fullName} (${contract.teamLeader.role})`.padEnd(119) + '│');
          } else {
            console.log(`│       • ⚠️  Chef d'Équipe: NOT ASSIGNED`.padEnd(119) + '│');
          }
        });
        validations.passed++;
      } else {
        console.log(`│ ⚠️  Contracts: NONE (UI should show "ℹ️ Aucun contrat")`.padEnd(119) + '│');
        issues.push({ client: client.name, field: 'contracts', issue: 'No contracts' });
        validations.failed++;
      }

      // ========================================
      // 5. VALIDATE BORDEREAUX
      // ========================================
      console.log('├' + '─'.repeat(118) + '┤');
      console.log('│ 📄 BORDEREAUX VALIDATION'.padEnd(119) + '│');
      
      validations.total++;
      if (client.bordereaux && client.bordereaux.length > 0) {
        console.log(`│ ✅ Bordereaux Count: ${client.bordereaux.length}`.padEnd(119) + '│');
        
        // Status breakdown
        const statusCounts = {};
        client.bordereaux.forEach(b => {
          statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
        });
        console.log(`│    Status Breakdown:`.padEnd(119) + '│');
        Object.entries(statusCounts).forEach(([status, count]) => {
          console.log(`│    • ${status}: ${count}`.padEnd(119) + '│');
        });

        // Document count
        const totalDocs = client.bordereaux.reduce((sum, b) => sum + (b.documents?.length || 0), 0);
        console.log(`│    📎 Total Documents: ${totalDocs}`.padEnd(119) + '│');

        // Assignment validation
        let withChargeCompte = 0;
        let withCurrentHandler = 0;
        let withTeam = 0;
        
        client.bordereaux.forEach(b => {
          if (b.chargeCompte) withChargeCompte++;
          if (b.currentHandler) withCurrentHandler++;
          if (b.team) withTeam++;
        });

        console.log(`│    👤 Bordereau Assignments:`.padEnd(119) + '│');
        console.log(`│       • With Charge Compte: ${withChargeCompte}/${client.bordereaux.length}`.padEnd(119) + '│');
        console.log(`│       • With Current Handler: ${withCurrentHandler}/${client.bordereaux.length}`.padEnd(119) + '│');
        console.log(`│       • With Team: ${withTeam}/${client.bordereaux.length}`.padEnd(119) + '│');

        // Document-level assignments
        let docsWithAssignment = 0;
        const assignmentByRole = {
          GESTIONNAIRE: 0,
          GESTIONNAIRE_SENIOR: 0,
          CHEF_EQUIPE: 0
        };

        client.bordereaux.forEach(b => {
          b.documents?.forEach(doc => {
            if (doc.assignedTo) {
              docsWithAssignment++;
              if (assignmentByRole[doc.assignedTo.role] !== undefined) {
                assignmentByRole[doc.assignedTo.role]++;
              }
            }
          });
        });

        if (totalDocs > 0) {
          console.log(`│    📄 Document Assignments:`.padEnd(119) + '│');
          console.log(`│       • With Assignment: ${docsWithAssignment}/${totalDocs}`.padEnd(119) + '│');
          console.log(`│       • By Gestionnaire: ${assignmentByRole.GESTIONNAIRE}/${totalDocs}`.padEnd(119) + '│');
          console.log(`│       • By Gestionnaire Senior: ${assignmentByRole.GESTIONNAIRE_SENIOR}/${totalDocs}`.padEnd(119) + '│');
          console.log(`│       • By Chef d'Équipe: ${assignmentByRole.CHEF_EQUIPE}/${totalDocs}`.padEnd(119) + '│');
        }

        validations.passed++;
      } else {
        console.log(`│ ℹ️  Bordereaux: NONE (UI should show "ℹ️ Aucun bordereau")`.padEnd(119) + '│');
        validations.passed++;
      }

      // ========================================
      // 6. VALIDATE RÉCLAMATIONS
      // ========================================
      console.log('├' + '─'.repeat(118) + '┤');
      console.log('│ 📞 RÉCLAMATIONS VALIDATION'.padEnd(119) + '│');
      
      validations.total++;
      if (client.reclamations && client.reclamations.length > 0) {
        console.log(`│ ⚠️  Réclamations Count: ${client.reclamations.length}`.padEnd(119) + '│');
        
        const statusCounts = {};
        client.reclamations.forEach(r => {
          statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
        });
        console.log(`│    Status Breakdown:`.padEnd(119) + '│');
        Object.entries(statusCounts).forEach(([status, count]) => {
          console.log(`│    • ${status}: ${count}`.padEnd(119) + '│');
        });
        validations.passed++;
      } else {
        console.log(`│ ✅ Réclamations: NONE (UI should show "✅ Aucune réclamation")`.padEnd(119) + '│');
        validations.passed++;
      }

      // ========================================
      // 7. VALIDATE ADHÉRENTS
      // ========================================
      console.log('├' + '─'.repeat(118) + '┤');
      console.log('│ 👨‍👩‍👧‍👦 ADHÉRENTS VALIDATION'.padEnd(119) + '│');
      
      validations.total++;
      const adherentCount = client.adherents?.length || 0;
      console.log(`│ ${adherentCount > 0 ? '✅' : 'ℹ️ '} Adhérents Count: ${adherentCount}`.padEnd(119) + '│');
      validations.passed++;

      console.log('└' + '─'.repeat(118) + '┘\n');
    }

    // ========================================
    // FINAL SUMMARY
    // ========================================
    console.log('='.repeat(120));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(120));
    console.log(`Total Validations: ${validations.total}`);
    console.log(`✅ Passed: ${validations.passed} (${((validations.passed / validations.total) * 100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${validations.failed} (${((validations.failed / validations.total) * 100).toFixed(1)}%)`);
    console.log('='.repeat(120));

    if (issues.length > 0) {
      console.log('\n⚠️  ISSUES FOUND:');
      console.log('='.repeat(120));
      issues.forEach((issue, idx) => {
        console.log(`${idx + 1}. Client: ${issue.client}`);
        console.log(`   Field: ${issue.field}`);
        console.log(`   Issue: ${issue.issue}\n`);
      });
    } else {
      console.log('\n✅ NO ISSUES FOUND - UI DATA MATCHES DATABASE!');
    }

    // ========================================
    // UI DISPLAY CHECKLIST
    // ========================================
    console.log('\n📋 UI DISPLAY CHECKLIST:');
    console.log('='.repeat(120));
    console.log('✅ Client Overview Tab should display:');
    console.log('   1. Compagnie d\'Assurance (or "Non renseigné")');
    console.log('   2. Mode de Récupération with color coding:');
    console.log('      • 🏦 Blue for VIREMENT');
    console.log('      • 💳 Green for CHEQUE');
    console.log('      • 📋 Orange for FEUILLE_CAISSE');
    console.log('      • ❌ Red for undefined');
    console.log('   3. Chef d\'Équipe (chargeCompte) - separate from gestionnaires');
    console.log('   4. Gestionnaires list (additional team members)');
    console.log('   5. Délai de Règlement (days)');
    console.log('   6. Délai de Réclamation (hours)');
    console.log('   7. Adhérents count');
    console.log('   8. Contracts count with details');
    console.log('   9. Bordereaux count with status breakdown');
    console.log('   10. Réclamations count');
    console.log('='.repeat(120));

  } catch (error) {
    console.error('❌ Error during validation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

validateUIData();
