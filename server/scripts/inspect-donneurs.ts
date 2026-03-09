import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Bank code mapping
const BANK_CODES: { [key: string]: string } = {
  '01': 'ATB (Arab Tunisian Bank)',
  '04': 'Attijari Bank',
  '05': 'Banque de Tunisie',
  '07': 'Amen Bank',
  '08': 'BIAT',
  '10': 'STB',
  '11': 'BNA',
  '12': 'UIB',
  '14': 'BH (Banque de l\'Habitat)',
  '17': 'BT (Banque de Tunisie)',
  '20': 'BTK',
  '23': 'Citibank',
  '24': 'ABC (Arab Banking Corporation)',
  '25': 'BTL',
  '26': 'BTS',
  '29': 'Wifak Bank',
  '32': 'Zitouna Bank'
};

// Format detection logic
function detectFormat(rib: string, configuredFormat: string): { detected: string; configured: string; match: boolean } {
  const bankCode = rib.substring(0, 2);
  let detectedFormat = 'BTK_COMAR'; // Default
  
  // Auto-detect Attijari
  if (rib.startsWith('04')) {
    detectedFormat = 'ATTIJARI';
  }
  
  const match = detectedFormat === configuredFormat || 
                (configuredFormat === 'STRUCTURE_1' && detectedFormat === 'ATTIJARI') ||
                (configuredFormat === 'BTK_COMAR' && !rib.startsWith('04'));
  
  return {
    detected: detectedFormat,
    configured: configuredFormat,
    match
  };
}

async function inspectDonneurs() {
  console.log('\n🔍 ========================================');
  console.log('📋 INSPECTION DES DONNEURS D\'ORDRE');
  console.log('========================================\n');

  const donneurs = await prisma.donneurOrdre.findMany({
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Total Donneurs d'Ordre: ${donneurs.length}\n`);

  donneurs.forEach((donneur, index) => {
    const bankCode = donneur.rib.substring(0, 2);
    const bankName = BANK_CODES[bankCode] || `Unknown Bank (Code: ${bankCode})`;
    const format = detectFormat(donneur.rib, donneur.formatTxtType);
    
    console.log(`\n${index + 1}. ${donneur.nom}`);
    console.log('   ' + '─'.repeat(50));
    console.log(`   📌 ID: ${donneur.id}`);
    console.log(`   🏦 Banque configurée: ${donneur.banque}`);
    console.log(`   🏦 Banque détectée (RIB): ${bankName}`);
    console.log(`   💳 RIB: ${donneur.rib}`);
    console.log(`   🔢 Code Banque: ${bankCode}`);
    console.log(`   📄 Format configuré: ${format.configured}`);
    console.log(`   🤖 Format auto-détecté: ${format.detected}`);
    console.log(`   ${format.match ? '✅' : '⚠️'} Correspondance: ${format.match ? 'OUI' : 'NON - ATTENTION!'}`);
    console.log(`   📊 Statut: ${donneur.statut}`);
    
    // Show expected TXT format
    if (format.detected === 'ATTIJARI') {
      console.log(`   📝 Format TXT attendu: 110104... (Attijari format)`);
    } else {
      console.log(`   📝 Format TXT attendu: V1/V2... (BTK/COMAR format)`);
    }
    
    // Warning if mismatch
    if (!format.match) {
      console.log(`   ⚠️  ATTENTION: Le RIB ne correspond pas au format configuré!`);
      if (bankCode === '04' && format.configured !== 'STRUCTURE_1') {
        console.log(`   💡 Suggestion: Changer le format à STRUCTURE_1 (Attijari)`);
      } else if (bankCode !== '04' && format.configured === 'STRUCTURE_1') {
        console.log(`   💡 Suggestion: Changer le RIB pour commencer par 04 (Attijari)`);
      }
    }
  });

  // Summary
  console.log('\n\n📊 ========================================');
  console.log('RÉSUMÉ');
  console.log('========================================\n');

  const attijariCount = donneurs.filter(d => d.rib.startsWith('04')).length;
  const btkCount = donneurs.filter(d => !d.rib.startsWith('04')).length;
  const activeCount = donneurs.filter(d => d.statut === 'ACTIF').length;
  const inactiveCount = donneurs.filter(d => d.statut === 'INACTIF').length;

  console.log(`Total: ${donneurs.length} donneur(s)`);
  console.log(`├─ Actifs: ${activeCount}`);
  console.log(`└─ Inactifs: ${inactiveCount}\n`);
  
  console.log(`Par format détecté:`);
  console.log(`├─ Attijari (110104 format): ${attijariCount}`);
  console.log(`└─ BTK/COMAR (V1/V2 format): ${btkCount}\n`);

  // Bank distribution
  const bankDistribution: { [key: string]: number } = {};
  donneurs.forEach(d => {
    const code = d.rib.substring(0, 2);
    bankDistribution[code] = (bankDistribution[code] || 0) + 1;
  });

  console.log(`Distribution par banque (RIB):`);
  Object.entries(bankDistribution).forEach(([code, count]) => {
    const bankName = BANK_CODES[code] || `Code ${code}`;
    console.log(`├─ ${bankName}: ${count}`);
  });

  console.log('\n========================================\n');
}

inspectDonneurs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
