const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBordereauStatus() {
  console.log('\n📊 ANALYSE DES BORDEREAUX PAR STATUT\n');
  console.log('='.repeat(80));

  try {
    // Get all bordereaux with their status
    const allBordereaux = await prisma.bordereau.findMany({
      select: {
        id: true,
        reference: true,
        statut: true,
        dateReception: true,
        dateFinScan: true,
        dateCloture: true,
        client: {
          select: { name: true }
        }
      },
      orderBy: { dateReception: 'desc' }
    });

    console.log(`\n📋 TOTAL BORDEREAUX: ${allBordereaux.length}\n`);

    // Group by status
    const statusGroups = allBordereaux.reduce((acc, b) => {
      acc[b.statut] = acc[b.statut] || [];
      acc[b.statut].push(b);
      return acc;
    }, {});

    // Display each status group
    console.log('📊 RÉPARTITION PAR STATUT:\n');
    
    const statusOrder = [
      'EN_ATTENTE',
      'A_SCANNER', 
      'SCAN_EN_COURS',
      'SCANNE',
      'A_AFFECTER',
      'ASSIGNE',
      'EN_COURS',
      'TRAITE',
      'PRET_VIREMENT',
      'VIREMENT_EN_COURS',
      'VIREMENT_EXECUTE',
      'CLOTURE',
      'REJETE',
      'EN_DIFFICULTE'
    ];

    statusOrder.forEach(status => {
      const count = statusGroups[status]?.length || 0;
      if (count > 0) {
        const icon = getStatusIcon(status);
        console.log(`${icon} ${status.padEnd(25)} : ${count} bordereaux`);
      }
    });

    // Show lifecycle stages
    console.log('\n\n🔄 CYCLE DE VIE (4 ÉTAPES):\n');
    
    const stages = {
      '📥 Étape 1: Bureau d\'Ordre': ['EN_ATTENTE', 'A_SCANNER'],
      '🖨️ Étape 2: Équipe Scan': ['A_SCANNER', 'SCAN_EN_COURS', 'SCANNE'],
      '⚙️ Étape 3: Équipe Métier': ['SCANNE', 'A_AFFECTER', 'ASSIGNE', 'EN_COURS', 'TRAITE'],
      '💰 Étape 4: Service Finance': ['TRAITE', 'PRET_VIREMENT', 'VIREMENT_EN_COURS', 'VIREMENT_EXECUTE']
    };

    Object.entries(stages).forEach(([stage, statuses]) => {
      const bordereaux = allBordereaux.filter(b => statuses.includes(b.statut));
      const pending = bordereaux.filter(b => 
        ['EN_ATTENTE', 'A_SCANNER', 'SCANNE', 'A_AFFECTER', 'TRAITE', 'PRET_VIREMENT'].includes(b.statut)
      );
      const processing = bordereaux.filter(b => 
        ['SCAN_EN_COURS', 'ASSIGNE', 'EN_COURS', 'VIREMENT_EN_COURS'].includes(b.statut)
      );
      
      console.log(`\n${stage}`);
      console.log(`  Total: ${bordereaux.length}`);
      console.log(`  En Attente: ${pending.length}`);
      console.log(`  En Cours: ${processing.length}`);
      
      if (bordereaux.length > 0) {
        const oldest = bordereaux.reduce((old, curr) => 
          curr.dateReception < old.dateReception ? curr : old
        );
        const ageHours = Math.floor((new Date() - new Date(oldest.dateReception)) / (1000 * 60 * 60));
        const ageDays = Math.floor(ageHours / 24);
        console.log(`  Plus ancien: ${ageDays}j ${ageHours % 24}h (${oldest.reference})`);
      }
    });

    // Show oldest bordereaux
    console.log('\n\n⏰ TOP 10 BORDEREAUX LES PLUS ANCIENS:\n');
    
    const oldestBordereaux = [...allBordereaux]
      .filter(b => !['CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut))
      .sort((a, b) => new Date(a.dateReception) - new Date(b.dateReception))
      .slice(0, 10);

    oldestBordereaux.forEach((b, i) => {
      const ageHours = Math.floor((new Date() - new Date(b.dateReception)) / (1000 * 60 * 60));
      const ageDays = Math.floor(ageHours / 24);
      console.log(`${i + 1}. ${b.reference.padEnd(20)} | ${b.statut.padEnd(20)} | ${ageDays}j ${ageHours % 24}h | ${b.client?.name || 'N/A'}`);
    });

    // Show completed vs in progress
    console.log('\n\n📈 STATISTIQUES GLOBALES:\n');
    
    const completed = allBordereaux.filter(b => ['CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut));
    const inProgress = allBordereaux.filter(b => !['CLOTURE', 'VIREMENT_EXECUTE'].includes(b.statut));
    const rejected = allBordereaux.filter(b => ['REJETE', 'EN_DIFFICULTE'].includes(b.statut));
    
    console.log(`✅ Complétés: ${completed.length} (${((completed.length / allBordereaux.length) * 100).toFixed(1)}%)`);
    console.log(`⏳ En cours: ${inProgress.length} (${((inProgress.length / allBordereaux.length) * 100).toFixed(1)}%)`);
    console.log(`❌ Rejetés/Difficultés: ${rejected.length} (${((rejected.length / allBordereaux.length) * 100).toFixed(1)}%)`);

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

function getStatusIcon(status) {
  const icons = {
    'EN_ATTENTE': '⏸️',
    'A_SCANNER': '📄',
    'SCAN_EN_COURS': '🖨️',
    'SCANNE': '✅',
    'A_AFFECTER': '📋',
    'ASSIGNE': '👤',
    'EN_COURS': '⚙️',
    'TRAITE': '✔️',
    'PRET_VIREMENT': '💳',
    'VIREMENT_EN_COURS': '💸',
    'VIREMENT_EXECUTE': '✅',
    'CLOTURE': '🔒',
    'REJETE': '❌',
    'EN_DIFFICULTE': '⚠️'
  };
  return icons[status] || '•';
}

checkBordereauStatus();
