const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkContracts() {
  console.log('\n📊 VÉRIFICATION DES CONTRATS\n');
  console.log('='.repeat(80));

  const bordereaux = await prisma.bordereau.findMany({
    include: {
      contract: true,
      client: true
    },
    orderBy: { dateReception: 'asc' },
    take: 10
  });

  console.log(`\n📋 Total bordereaux: ${bordereaux.length}\n`);

  bordereaux.forEach(b => {
    const age = Math.floor((Date.now() - b.dateReception.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`\n${b.reference}`);
    console.log(`  Client: ${b.client?.name || 'N/A'}`);
    console.log(`  Statut: ${b.statut}`);
    console.log(`  Âge: ${age} jours`);
    console.log(`  Contract ID: ${b.contractId || '❌ AUCUN'}`);
    
    if (b.contract) {
      console.log(`  ✅ Contrat trouvé:`);
      console.log(`     - Délai règlement: ${b.contract.delaiReglement} jours`);
      console.log(`     - Délai réclamation: ${b.contract.delaiReclamation} jours`);
      
      const deadlineHours = b.contract.delaiReglement * 24;
      const ageHours = age * 24;
      const percentConsumed = (ageHours / deadlineHours) * 100;
      
      console.log(`     - % délai consommé: ${percentConsumed.toFixed(1)}%`);
      
      if (percentConsumed >= 100) {
        console.log(`     - 🔴 CRITIQUE: Délai dépassé!`);
      } else if (percentConsumed >= 80) {
        console.log(`     - 🟠 WARNING: 80% du délai consommé`);
      } else if (percentConsumed >= 60) {
        console.log(`     - 🔵 INFO: 60% du délai consommé`);
      } else {
        console.log(`     - 🟢 NORMAL: Encore du temps`);
      }
    } else {
      console.log(`  ❌ Aucun contrat lié - Alerte basée sur volume uniquement`);
    }
  });

  console.log('\n' + '='.repeat(80));
  
  const withContract = bordereaux.filter(b => b.contractId).length;
  const withoutContract = bordereaux.filter(b => !b.contractId).length;
  
  console.log(`\n📊 RÉSUMÉ:`);
  console.log(`   Avec contrat: ${withContract}`);
  console.log(`   Sans contrat: ${withoutContract}`);
  
  if (withoutContract > 0) {
    console.log(`\n⚠️  ATTENTION: ${withoutContract} bordereaux n'ont pas de contrat lié!`);
    console.log(`   → Les alertes seront basées uniquement sur le volume, pas sur les délais contractuels.`);
  }

  await prisma.$disconnect();
}

checkContracts().catch(console.error);
