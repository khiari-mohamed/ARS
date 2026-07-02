// Verify Contract Number Mapping
// This script checks if the displayed contract number is correct

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying Contract Number for OV-2026-8233...\n');

  // Get the specific OV
  const ov = await prisma.ordreVirement.findFirst({
    where: {
      reference: 'OV-2026-8233'
    },
    include: {
      bordereau: {
        include: {
          client: true,
          contract: true
        }
      },
      donneurOrdre: true,
      contract: true,
      client: true,
      items: {
        include: {
          adherent: {
            include: {
              client: true
            }
          }
        }
      }
    }
  });

  if (!ov) {
    console.log('❌ OV not found: OV-2026-8233');
    return;
  }

  console.log('📋 OV Details:');
  console.log('='.repeat(80));
  console.log(`Reference: ${ov.reference}`);
  console.log(`Bordereau: ${ov.bordereau?.reference || 'N/A'}`);
  console.log(`Client: ${ov.bordereau?.client?.name || ov.client?.name || 'N/A'}`);
  console.log(`Montant: ${ov.montantTotal} TND`);
  console.log('');

  console.log('🏦 What the dashboard shows:');
  console.log('='.repeat(80));
  console.log(`Mode Récupération: ${ov.client?.modeRecuperation || ov.bordereau?.client?.modeRecuperation || 'N/A'}`);
  console.log(`Nom Donneur: ${ov.donneurOrdre?.nom || 'N/A'}`);
  console.log(`N° Contrat (Contract.codeAssure): ${ov.bordereau?.contract?.codeAssure || ov.contract?.codeAssure || 'N/A'}`);
  console.log('');

  console.log('📊 Contract Details:');
  console.log('='.repeat(80));
  const contract = ov.bordereau?.contract || ov.contract;
  if (contract) {
    console.log(`Contract ID: ${contract.id}`);
    console.log(`Code Assuré (codeAssure): ${contract.codeAssure || 'N/A'}`);
    console.log(`Client Name: ${contract.clientName || 'N/A'}`);
    console.log(`Start Date: ${contract.startDate ? contract.startDate.toISOString().split('T')[0] : 'N/A'}`);
    console.log(`End Date: ${contract.endDate ? contract.endDate.toISOString().split('T')[0] : 'N/A'}`);
  } else {
    console.log('❌ No contract found');
  }
  console.log('');

  console.log('👥 Adherents in this OV:');
  console.log('='.repeat(80));
  console.log(`Total adherents: ${ov.items.length}`);
  console.log('');

  if (ov.items.length > 0) {
    for (const [index, item] of ov.items.entries()) {
      console.log(`${index + 1}. ${item.adherent.nom} ${item.adherent.prenom}`);
      console.log(`   Matricule: ${item.adherent.matricule}`);
      console.log(`   Code Assuré (Adherent.codeAssure): ${item.adherent.codeAssure || 'N/A'}`);
      console.log(`   Numéro Contrat (Adherent.numeroContrat): ${item.adherent.numeroContrat || 'N/A'}`);
      console.log(`   Société: ${item.adherent.assurance || 'N/A'}`);
      console.log(`   RIB: ${item.adherent.rib}`);
      console.log(`   Montant: ${item.montant} TND`);
      console.log('');
    }
  }

  console.log('\n📝 Analysis:');
  console.log('='.repeat(80));
  
  const displayedContractNumber = ov.bordereau?.contract?.codeAssure || ov.contract?.codeAssure;
  console.log(`✓ Dashboard displays: ${displayedContractNumber}`);
  
  if (ov.items.length > 0) {
    const adherentContractNumbers = [...new Set(ov.items.map(item => item.adherent.numeroContrat).filter(Boolean))];
    const adherentCodeAssures = [...new Set(ov.items.map(item => item.adherent.codeAssure).filter(Boolean))];
    
    console.log(`✓ Adherent Contract Numbers (Adherent.numeroContrat): ${adherentContractNumbers.join(', ') || 'NONE'}`);
    console.log(`✓ Adherent Code Assurés (Adherent.codeAssure): ${adherentCodeAssures.join(', ') || 'NONE'}`);
    
    console.log('');
    console.log('📌 Verdict:');
    if (displayedContractNumber && adherentContractNumbers.length > 0) {
      if (displayedContractNumber === adherentContractNumbers[0]) {
        console.log('✅ CORRECT: Contract.codeAssure matches Adherent.numeroContrat');
      } else if (adherentCodeAssures.includes(displayedContractNumber)) {
        console.log('❌ WRONG: Displaying insured code (codeAssure) instead of contract number');
        console.log(`   Should display: ${adherentContractNumbers[0]} (Adherent.numeroContrat)`);
        console.log(`   Currently displays: ${displayedContractNumber} (Contract.codeAssure / insured code)`);
      } else {
        console.log('⚠️ MISMATCH: Contract.codeAssure does not match any adherent data');
        console.log(`   Contract shows: ${displayedContractNumber}`);
        console.log(`   Adherents have: ${adherentContractNumbers.join(', ')}`);
      }
    } else if (displayedContractNumber && adherentContractNumbers.length === 0) {
      console.log('⚠️ WARNING: Contract has codeAssure but adherents have no numeroContrat');
      console.log('   This could be correct if Contract.codeAssure is the contract number');
    } else {
      console.log('❌ ERROR: No contract number found in either Contract or Adherent tables');
    }
  } else {
    console.log('⚠️ No adherents in this OV to compare');
  }

  console.log('\n✅ Verification complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
