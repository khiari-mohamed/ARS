const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedSuiviVirement() {
  console.log('🌱 SEEDING SUIVI VIREMENT DATA');
  console.log('==============================\n');

  try {
    // Get existing clients and donneurs d'ordre
    const clients = await prisma.client.findMany({ take: 5 });
    const donneursOrdre = await prisma.donneurOrdre.findMany({ take: 3 });
    
    if (clients.length === 0 || donneursOrdre.length === 0) {
      console.log('❌ No clients or donneurs d\'ordre found. Creating basic data first...');
      
      // Create basic clients if none exist
      if (clients.length === 0) {
        await prisma.client.createMany({
          data: [
            { name: 'STAR ASSURANCES', reglementDelay: 30, reclamationDelay: 15, email: 'star@assurance.tn', phone: '71234567', address: 'Tunis' },
            { name: 'GAT ASSURANCE', reglementDelay: 25, reclamationDelay: 10, email: 'gat@assurance.tn', phone: '71234568', address: 'Sfax' },
            { name: 'LLOYD TUNISIEN', reglementDelay: 35, reclamationDelay: 20, email: 'lloyd@assurance.tn', phone: '71234569', address: 'Sousse' },
            { name: 'COMAR ASSURANCE', reglementDelay: 30, reclamationDelay: 15, email: 'comar@assurance.tn', phone: '71234570', address: 'Monastir' },
            { name: 'MAGHREBIA VIE', reglementDelay: 40, reclamationDelay: 25, email: 'maghrebia@assurance.tn', phone: '71234571', address: 'Ariana' }
          ]
        });
        console.log('✅ Created 5 clients');
      }
      
      // Create basic donneurs d'ordre if none exist
      if (donneursOrdre.length === 0) {
        await prisma.donneurOrdre.createMany({
          data: [
            { nom: 'ARS TUNISIE', rib: '12345678901234567890', banque: 'Banque Centrale de Tunisie', structureTxt: 'STRUCTURE_1', statut: 'ACTIF' },
            { nom: 'FINANCE ARS', rib: '09876543210987654321', banque: 'BIAT', structureTxt: 'STRUCTURE_2', statut: 'ACTIF' },
            { nom: 'TRESORERIE ARS', rib: '11111111111111111111', banque: 'STB', structureTxt: 'STRUCTURE_1', statut: 'ACTIF' }
          ]
        });
        console.log('✅ Created 3 donneurs d\'ordre');
      }
      
      // Refresh data
      const newClients = await prisma.client.findMany({ take: 5 });
      const newDonneurs = await prisma.donneurOrdre.findMany({ take: 3 });
      clients.push(...newClients);
      donneursOrdre.push(...newDonneurs);
    }

    // Create sample bordereaux for linking
    const sampleBordereaux = [];
    for (let i = 0; i < 8; i++) {
      const client = clients[i % clients.length];
      const bordereau = await prisma.bordereau.create({
        data: {
          reference: `BDX-SUIVI-${Date.now()}-${String(i + 1).padStart(3, '0')}`,
          clientId: client.id,
          dateReception: new Date(Date.now() - (i * 2 * 24 * 60 * 60 * 1000)), // Spread over last 16 days
          statut: i < 4 ? 'TRAITE' : 'EN_COURS',
          nombreBS: Math.floor(Math.random() * 10) + 1,
          delaiReglement: 30,
          dateCloture: i < 4 ? new Date(Date.now() - (i * 24 * 60 * 60 * 1000)) : null
        }
      });
      sampleBordereaux.push(bordereau);
    }
    console.log('✅ Created 8 sample bordereaux');

    // Create diverse OrdreVirement records with all required fields
    const ordresVirement = [
      // 1. Executed with recovery
      {
        reference: `OV-${new Date().getFullYear()}-001`,
        donneurOrdreId: donneursOrdre[0].id,
        bordereauId: sampleBordereaux[0].id,
        dateCreation: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        dateTraitement: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        utilisateurSante: 'user-sante-1',
        utilisateurFinance: 'user-finance-1',
        etatVirement: 'EXECUTE',
        dateEtatFinal: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        commentaire: 'Virement exécuté avec succès',
        montantTotal: 15750.50,
        nombreAdherents: 25,
        motifObservation: null,
        demandeRecuperation: true,
        dateDemandeRecuperation: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        montantRecupere: true,
        dateMontantRecupere: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      // 2. Rejected with motif
      {
        reference: `OV-${new Date().getFullYear()}-002`,
        donneurOrdreId: donneursOrdre[1].id,
        bordereauId: sampleBordereaux[1].id,
        dateCreation: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        dateTraitement: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        utilisateurSante: 'user-sante-2',
        utilisateurFinance: 'user-finance-2',
        etatVirement: 'REJETE',
        dateEtatFinal: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        commentaire: 'Virement rejeté par la banque',
        montantTotal: 8920.00,
        nombreAdherents: 15,
        motifObservation: 'RIB invalide pour 3 adhérents - Correction nécessaire avant réinjection',
        demandeRecuperation: false,
        dateDemandeRecuperation: null,
        montantRecupere: false,
        dateMontantRecupere: null
      },
      // 3. In progress
      {
        reference: `OV-${new Date().getFullYear()}-003`,
        donneurOrdreId: donneursOrdre[0].id,
        bordereauId: sampleBordereaux[2].id,
        dateCreation: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        dateTraitement: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        utilisateurSante: 'user-sante-1',
        utilisateurFinance: 'user-finance-1',
        etatVirement: 'EN_COURS_EXECUTION',
        dateEtatFinal: null,
        commentaire: 'En cours de traitement par la banque',
        montantTotal: 22340.75,
        nombreAdherents: 35,
        motifObservation: null,
        demandeRecuperation: false,
        dateDemandeRecuperation: null,
        montantRecupere: false,
        dateMontantRecupere: null
      },
      // 4. Partially executed with recovery request
      {
        reference: `OV-${new Date().getFullYear()}-004`,
        donneurOrdreId: donneursOrdre[2].id,
        bordereauId: sampleBordereaux[3].id,
        dateCreation: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        dateTraitement: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        utilisateurSante: 'user-sante-3',
        utilisateurFinance: 'user-finance-2',
        etatVirement: 'EXECUTE_PARTIELLEMENT',
        dateEtatFinal: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        commentaire: 'Exécution partielle - 80% des virements traités',
        montantTotal: 31200.00,
        nombreAdherents: 50,
        motifObservation: 'Solde insuffisant pour 10 adhérents - Traitement en attente',
        demandeRecuperation: true,
        dateDemandeRecuperation: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        montantRecupere: false,
        dateMontantRecupere: null
      },
      // 5. Not executed (recent)
      {
        reference: `OV-${new Date().getFullYear()}-005`,
        donneurOrdreId: donneursOrdre[1].id,
        bordereauId: sampleBordereaux[4].id,
        dateCreation: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        dateTraitement: null,
        utilisateurSante: 'user-sante-2',
        utilisateurFinance: null,
        etatVirement: 'NON_EXECUTE',
        dateEtatFinal: null,
        commentaire: 'En attente de traitement',
        montantTotal: 12450.25,
        nombreAdherents: 20,
        motifObservation: null,
        demandeRecuperation: false,
        dateDemandeRecuperation: null,
        montantRecupere: false,
        dateMontantRecupere: null
      },
      // 6. Manual entry (no bordereau)
      {
        reference: `OV-MANUAL-${new Date().getFullYear()}-001`,
        donneurOrdreId: donneursOrdre[0].id,
        bordereauId: null,
        dateCreation: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        dateTraitement: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        utilisateurSante: 'user-chef-equipe',
        utilisateurFinance: 'user-finance-1',
        etatVirement: 'EXECUTE',
        dateEtatFinal: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        commentaire: 'Entrée manuelle - Virement exceptionnel',
        montantTotal: 5000.00,
        nombreAdherents: 8,
        motifObservation: null,
        demandeRecuperation: false,
        dateDemandeRecuperation: null,
        montantRecupere: false,
        dateMontantRecupere: null
      },
      // 7. Blocked with detailed motif
      {
        reference: `OV-${new Date().getFullYear()}-006`,
        donneurOrdreId: donneursOrdre[2].id,
        bordereauId: sampleBordereaux[5].id,
        dateCreation: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        dateTraitement: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        utilisateurSante: 'user-sante-1',
        utilisateurFinance: 'user-finance-2',
        etatVirement: 'REJETE', // Using REJETE for blocked status
        dateEtatFinal: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        commentaire: 'Virement bloqué par la banque',
        montantTotal: 18750.00,
        nombreAdherents: 30,
        motifObservation: 'Compte donneur d\'ordre temporairement suspendu - Attente régularisation administrative',
        demandeRecuperation: true,
        dateDemandeRecuperation: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        montantRecupere: false,
        dateMontantRecupere: null
      },
      // 8. Recent execution with full recovery
      {
        reference: `OV-${new Date().getFullYear()}-007`,
        donneurOrdreId: donneursOrdre[1].id,
        bordereauId: sampleBordereaux[6].id,
        dateCreation: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        dateTraitement: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        utilisateurSante: 'user-sante-3',
        utilisateurFinance: 'user-finance-1',
        etatVirement: 'EXECUTE',
        dateEtatFinal: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        commentaire: 'Virement exécuté - Récupération complète',
        montantTotal: 9875.50,
        nombreAdherents: 16,
        motifObservation: null,
        demandeRecuperation: true,
        dateDemandeRecuperation: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        montantRecupere: true,
        dateMontantRecupere: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
      }
    ];

    // Insert all OrdreVirement records
    for (const ov of ordresVirement) {
      await prisma.ordreVirement.create({ data: ov });
    }

    console.log('✅ Created 8 diverse OrdreVirement records');

    // Create some VirementHistorique entries for tracking
    const ovRecords = await prisma.ordreVirement.findMany({
      where: { reference: { startsWith: `OV-${new Date().getFullYear()}` } }
    });

    for (const ov of ovRecords) {
      await prisma.virementHistorique.create({
        data: {
          ordreVirementId: ov.id,
          action: 'CREATION',
          ancienEtat: null,
          nouvelEtat: 'NON_EXECUTE',
          utilisateurId: ov.utilisateurSante,
          commentaire: 'Ordre de virement créé',
          dateAction: ov.dateCreation
        }
      });

      if (ov.etatVirement !== 'NON_EXECUTE') {
        await prisma.virementHistorique.create({
          data: {
            ordreVirementId: ov.id,
            action: 'CHANGEMENT_ETAT',
            ancienEtat: 'NON_EXECUTE',
            nouvelEtat: ov.etatVirement,
            utilisateurId: ov.utilisateurFinance,
            commentaire: `Changement d'état vers ${ov.etatVirement}`,
            dateAction: ov.dateTraitement || new Date()
          }
        });
      }
    }

    console.log('✅ Created historique entries');

    // Summary
    const totalOV = await prisma.ordreVirement.count();
    const ovByStatus = await prisma.ordreVirement.groupBy({
      by: ['etatVirement'],
      _count: { id: true }
    });

    console.log('\n📊 SEEDING SUMMARY');
    console.log('==================');
    console.log(`Total Ordres Virement: ${totalOV}`);
    console.log('\nBy Status:');
    ovByStatus.forEach(stat => {
      console.log(`  ${stat.etatVirement}: ${stat._count.id}`);
    });

    const withRecoveryRequest = await prisma.ordreVirement.count({
      where: { demandeRecuperation: true }
    });
    const withRecoveredAmount = await prisma.ordreVirement.count({
      where: { montantRecupere: true }
    });

    console.log(`\nRecovery Info:`);
    console.log(`  With recovery request: ${withRecoveryRequest}`);
    console.log(`  With recovered amount: ${withRecoveredAmount}`);

    console.log('\n🎉 SEEDING COMPLETED SUCCESSFULLY!');
    console.log('===================================');
    console.log('You can now view the Suivi Virement tab with realistic data.');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedSuiviVirement();