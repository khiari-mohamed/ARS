const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyClientPaymentStats() {
  console.log('🔍 VERIFICATION DES STATISTIQUES DE PAIEMENT CLIENT');
  console.log('====================================================\n');

  try {
    // Get all clients
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        reglementDelay: true,
        reclamationDelay: true
      }
    });

    console.log(`📊 Nombre total de clients: ${clients.length}\n`);

    for (const client of clients) {
      console.log(`\n🏢 CLIENT: ${client.name}`);
      console.log('=' .repeat(50));
      
      // 1. PAYMENT STATISTICS (Finance Module Integration)
      console.log('\n📊 STATISTIQUES DE PAIEMENT (Module Finance):');
      
      // Get bordereaux with payment execution dates
      const bordereauxWithPayments = await prisma.bordereau.findMany({
        where: { 
          clientId: client.id,
          dateExecutionVirement: { not: null }
        },
        select: {
          id: true,
          reference: true,
          dateReception: true,
          dateExecutionVirement: true,
          delaiReglement: true,
          statut: true
        }
      });

      let paidOnTime = 0;
      let paidLate = 0;
      const totalPaid = bordereauxWithPayments.length;

      bordereauxWithPayments.forEach(bordereau => {
        if (bordereau.dateExecutionVirement && bordereau.dateReception) {
          const daysTaken = Math.floor(
            (bordereau.dateExecutionVirement.getTime() - bordereau.dateReception.getTime()) / (1000 * 60 * 60 * 24)
          );
          const deadline = bordereau.delaiReglement || client.reglementDelay;
          
          if (daysTaken <= deadline) {
            paidOnTime++;
          } else {
            paidLate++;
          }
        }
      });

      const onTimeRate = totalPaid > 0 ? (paidOnTime / totalPaid) * 100 : 0;

      console.log(`   • Payés dans les délais: ${paidOnTime}`);
      console.log(`   • Payés en retard: ${paidLate}`);
      console.log(`   • Total sinistres payés: ${totalPaid}`);
      console.log(`   • Taux de ponctualité: ${onTimeRate.toFixed(1)}%`);

      // Show sample data for verification
      if (bordereauxWithPayments.length > 0) {
        console.log('\n   📋 Échantillon de données:');
        bordereauxWithPayments.slice(0, 3).forEach(b => {
          const daysTaken = Math.floor(
            (b.dateExecutionVirement.getTime() - b.dateReception.getTime()) / (1000 * 60 * 60 * 24)
          );
          const deadline = b.delaiReglement || client.reglementDelay;
          const status = daysTaken <= deadline ? '✅ À temps' : '❌ En retard';
          console.log(`      - ${b.reference}: ${daysTaken}j (limite: ${deadline}j) ${status}`);
        });
      }

      // 2. RECLAMATION STATISTICS
      console.log('\n📞 STATISTIQUES DE RÉCLAMATIONS:');
      
      const reclamations = await prisma.reclamation.findMany({
        where: { clientId: client.id },
        select: {
          id: true,
          type: true,
          createdAt: true,
          updatedAt: true,
          status: true
        }
      });

      let handledOnTime = 0;
      let handledLate = 0;
      const totalHandled = reclamations.length;

      reclamations.forEach(reclamation => {
        if (reclamation.updatedAt && reclamation.createdAt && reclamation.updatedAt > reclamation.createdAt) {
          const hoursToHandle = Math.floor(
            (reclamation.updatedAt.getTime() - reclamation.createdAt.getTime()) / (1000 * 60 * 60)
          );
          
          if (hoursToHandle <= client.reclamationDelay) {
            handledOnTime++;
          } else {
            handledLate++;
          }
        }
      });

      const reclamationOnTimeRate = totalHandled > 0 ? (handledOnTime / totalHandled) * 100 : 0;

      console.log(`   • Traitées dans les délais: ${handledOnTime}`);
      console.log(`   • Traitées en retard: ${handledLate}`);
      console.log(`   • Total réclamations traitées: ${totalHandled}`);
      console.log(`   • Taux de ponctualité: ${reclamationOnTimeRate.toFixed(1)}%`);

      // Show sample reclamation data
      if (reclamations.length > 0) {
        console.log('\n   📋 Échantillon de réclamations:');
        reclamations.slice(0, 3).forEach(r => {
          if (r.updatedAt && r.createdAt && r.updatedAt > r.createdAt) {
            const hoursToHandle = Math.floor(
              (r.updatedAt.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60)
            );
            const status = hoursToHandle <= client.reclamationDelay ? '✅ À temps' : '❌ En retard';
            console.log(`      - ${r.type}: ${hoursToHandle}h (limite: ${client.reclamationDelay}h) ${status}`);
          }
        });
      }

      // 3. FINANCE MODULE INTEGRATION CHECK
      console.log('\n🔗 VÉRIFICATION INTÉGRATION MODULE FINANCE:');
      
      // Check for virements (Finance module data)
      const virements = await prisma.virement.findMany({
        where: {
          bordereau: {
            clientId: client.id
          }
        },
        include: {
          bordereau: {
            select: {
              reference: true,
              statut: true
            }
          }
        }
      });

      console.log(`   • Virements créés: ${virements.length}`);
      console.log(`   • Virements confirmés: ${virements.filter(v => v.confirmed).length}`);
      console.log(`   • Montant total virements: ${virements.reduce((sum, v) => sum + v.montant, 0).toFixed(2)} DT`);

      // Check for OV (Ordre de Virement) data
      const ordresVirement = await prisma.ordreVirement.findMany({
        where: {
          bordereau: {
            clientId: client.id
          }
        }
      });

      console.log(`   • Ordres de virement: ${ordresVirement.length}`);
      console.log(`   • OV exécutés: ${ordresVirement.filter(ov => ov.etatVirement === 'EXECUTE').length}`);

      // 4. DATA QUALITY CHECK
      console.log('\n🔍 CONTRÔLE QUALITÉ DES DONNÉES:');
      
      const totalBordereaux = await prisma.bordereau.count({
        where: { clientId: client.id }
      });

      const bordereauxWithoutPaymentDate = await prisma.bordereau.count({
        where: { 
          clientId: client.id,
          dateExecutionVirement: null,
          statut: { in: ['VIREMENT_EXECUTE', 'CLOTURE'] }
        }
      });

      console.log(`   • Total bordereaux: ${totalBordereaux}`);
      console.log(`   • Bordereaux sans date de paiement: ${bordereauxWithoutPaymentDate}`);
      console.log(`   • Couverture données paiement: ${((totalPaid / totalBordereaux) * 100).toFixed(1)}%`);

      if (bordereauxWithoutPaymentDate > 0) {
        console.log('   ⚠️  ATTENTION: Des bordereaux clôturés n\'ont pas de date d\'exécution de virement');
      }

      console.log('\n' + '='.repeat(50));
    }

    // 5. GLOBAL SUMMARY
    console.log('\n\n📈 RÉSUMÉ GLOBAL:');
    console.log('==================');

    const globalStats = await prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT c.id) as total_clients,
        COUNT(DISTINCT b.id) as total_bordereaux,
        COUNT(DISTINCT CASE WHEN b."dateExecutionVirement" IS NOT NULL THEN b.id END) as bordereaux_with_payment,
        COUNT(DISTINCT v.id) as total_virements,
        COUNT(DISTINCT CASE WHEN v.confirmed = true THEN v.id END) as confirmed_virements,
        COUNT(DISTINCT r.id) as total_reclamations
      FROM "Client" c
      LEFT JOIN "Bordereau" b ON c.id = b."clientId"
      LEFT JOIN "Virement" v ON b.id = v."bordereauId"
      LEFT JOIN "Reclamation" r ON c.id = r."clientId"
    `;

    const stats = globalStats[0];
    console.log(`• Clients total: ${stats.total_clients}`);
    console.log(`• Bordereaux total: ${stats.total_bordereaux}`);
    console.log(`• Bordereaux avec paiement: ${stats.bordereaux_with_payment}`);
    console.log(`• Virements total: ${stats.total_virements}`);
    console.log(`• Virements confirmés: ${stats.confirmed_virements}`);
    console.log(`• Réclamations total: ${stats.total_reclamations}`);

    const paymentCoverage = stats.total_bordereaux > 0 ? 
      (Number(stats.bordereaux_with_payment) / Number(stats.total_bordereaux)) * 100 : 0;
    
    console.log(`• Couverture paiement globale: ${paymentCoverage.toFixed(1)}%`);

    // 6. RECOMMENDATIONS
    console.log('\n💡 RECOMMANDATIONS:');
    console.log('====================');
    
    if (paymentCoverage < 50) {
      console.log('❌ CRITIQUE: Faible couverture des données de paiement');
      console.log('   → Vérifier l\'intégration avec le module Finance');
      console.log('   → S\'assurer que dateExecutionVirement est mise à jour lors des virements');
    } else if (paymentCoverage < 80) {
      console.log('⚠️  ATTENTION: Couverture des données de paiement modérée');
      console.log('   → Améliorer la synchronisation Finance → Bordereaux');
    } else {
      console.log('✅ EXCELLENT: Bonne couverture des données de paiement');
    }

    if (Number(stats.total_virements) < Number(stats.bordereaux_with_payment)) {
      console.log('⚠️  Incohérence: Plus de bordereaux avec paiement que de virements');
      console.log('   → Vérifier la logique de création des virements');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyClientPaymentStats().catch(console.error);