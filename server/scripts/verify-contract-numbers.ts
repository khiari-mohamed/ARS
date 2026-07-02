// Script to verify Contract data and identify mapping issues
// Run: ts-node server/scripts/verify-contract-numbers.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyContractData() {
  console.log('🔍 VERIFICATION: Contract Numbers vs Insured Codes\n');
  console.log('=' .repeat(80));
  
  try {
    // Get all contracts with their clients
    const contracts = await prisma.contract.findMany({
      include: {
        client: true,
        bordereaux: {
          include: {
            client: true,
            ordresVirement: {
              include: {
                items: {
                  include: {
                    adherent: {
                      select: {
                        matricule: true,
                        nom: true,
                        prenom: true,
                        codeAssure: true,
                        numeroContrat: true
                      }
                    }
                  },
                  take: 1 // Get first adherent as sample
                }
              },
              take: 1 // Get first OV as sample
            }
          },
          take: 1 // Get first bordereau as sample
        }
      },
      take: 20 // Limit for readability
    });

    console.log(`\nFound ${contracts.length} contracts (showing first 20)\n`);

    contracts.forEach((contract, index) => {
      console.log(`\n${index + 1}. Contract ID: ${contract.id}`);
      console.log(`   Client: ${contract.clientName}`);
      console.log(`   Contract.codeAssure: "${contract.codeAssure || 'NULL'}"`);
      console.log(`   Start Date: ${contract.startDate.toLocaleDateString('fr-FR')}`);
      console.log(`   End Date: ${contract.endDate.toLocaleDateString('fr-FR')}`);
      
      // Check if there are bordereaux linked
      if (contract.bordereaux && contract.bordereaux.length > 0) {
        const bordereau = contract.bordereaux[0];
        console.log(`   └─ Sample Bordereau: ${bordereau.reference}`);
        
        // Check if there are OVs
        if (bordereau.ordresVirement && bordereau.ordresVirement.length > 0) {
          const ov = bordereau.ordresVirement[0];
          console.log(`      └─ Sample OV: ${ov.reference}`);
          
          // Check adherent data
          if (ov.items && ov.items.length > 0 && ov.items[0].adherent) {
            const adherent = ov.items[0].adherent;
            console.log(`         └─ Sample Adherent:`);
            console.log(`            Matricule: ${adherent.matricule}`);
            console.log(`            Nom: ${adherent.nom} ${adherent.prenom}`);
            console.log(`            Adherent.codeAssure (INSURED CODE): "${adherent.codeAssure || 'NULL'}"`);
            console.log(`            Adherent.numeroContrat (CONTRACT #): "${adherent.numeroContrat || 'NULL'}"`);
            
            // 🔍 CRITICAL ANALYSIS
            console.log('\n         🔍 ANALYSIS:');
            if (contract.codeAssure === adherent.codeAssure) {
              console.log(`         ❌ PROBLEM: Contract.codeAssure matches Adherent.codeAssure`);
              console.log(`            This suggests Contract is storing INSURED CODE (${contract.codeAssure})`);
              console.log(`            Expected: Contract should store CONTRACT NUMBER`);
              if (adherent.numeroContrat) {
                console.log(`            ✅ SHOULD BE: "${adherent.numeroContrat}"`);
              }
            } else if (contract.codeAssure && contract.codeAssure.length > 8) {
              console.log(`         ✅ LIKELY CORRECT: Contract.codeAssure looks like a contract number`);
              console.log(`            (Length > 8 chars, doesn't match insured code)`);
            } else {
              console.log(`         ⚠️ UNCLEAR: Need manual verification`);
              console.log(`            Contract.codeAssure: "${contract.codeAssure}"`);
              console.log(`            Adherent.codeAssure: "${adherent.codeAssure}"`);
              console.log(`            Adherent.numeroContrat: "${adherent.numeroContrat}"`);
            }
          }
        }
      }
      
      console.log(`   ${'─'.repeat(70)}`);
    });

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY\n');
    
    const contractsWithCodeAssure = contracts.filter(c => c.codeAssure);
    const contractsWithoutCodeAssure = contracts.filter(c => !c.codeAssure);
    
    console.log(`Total contracts checked: ${contracts.length}`);
    console.log(`Contracts with codeAssure: ${contractsWithCodeAssure.length}`);
    console.log(`Contracts without codeAssure: ${contractsWithoutCodeAssure.length}`);
    
    console.log('\n📋 RECOMMENDATIONS:\n');
    console.log('1. Review the ANALYSIS sections above');
    console.log('2. If Contract.codeAssure matches Adherent.codeAssure (insured code):');
    console.log('   → Run UPDATE query to populate with Adherent.numeroContrat values');
    console.log('3. If Contract.codeAssure is empty:');
    console.log('   → Populate with proper contract numbers from business records');
    console.log('4. After correction, verify in Finance Module that N° Contrat displays correctly');
    
    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyContractData();
