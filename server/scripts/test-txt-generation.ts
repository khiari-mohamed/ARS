import { TxtGenerationService, OVTxtData, TxtVirementData } from './src/finance/txt-generation.service';

// Test data matching the desired output
const testData: OVTxtData = {
  donneurOrdre: {
    nom: 'MARE ALB',
    rib: '20003032210059758029', // 20 digits
    formatTxtType: 'BTK_COMAR'
  },
  virements: [
    {
      reference: '28149-001',
      montant: 83.836, // Amount in dinars
      rib: '05000000001556336231', // 20 digits
      nom: 'BADREDDINE',
      prenom: 'FARES',
      matricule: '712',
      societe: 'MARE ALB SIEGE RETRAITES'
    },
    {
      reference: '28149-002',
      montant: 323.950,
      rib: '14061061100700329850',
      nom: 'Rhouma',
      prenom: 'Ahmed',
      matricule: '744',
      societe: 'MARE ALB SIEGE RETRAITES'
    },
    {
      reference: '28149-003',
      montant: 110.976,
      rib: '17001000000361892056',
      nom: 'OM',
      prenom: 'HENI',
      matricule: '804',
      societe: 'MARE ALB SIEGE RETRAITES'
    },
    {
      reference: '28149-004',
      montant: 559.077,
      rib: '05000000001507917711',
      nom: 'Samia',
      prenom: 'MANAA',
      matricule: '809',
      societe: 'MARE ALB SIEGE RETRAITES'
    },
    {
      reference: '28149-005',
      montant: 113.471,
      rib: '14008008100701865254',
      nom: 'ADEL',
      prenom: 'NOUIRA',
      matricule: '810',
      societe: 'MARE ALB SIEGE RETRAITES'
    }
  ],
  dateCreation: new Date('2026-03-10'), // March 10, 2026 (to match desired output date 20260310)
  reference: '28149',
  bordereauReference: '2026721227'
};

// Desired output for comparison
const desiredOutput = `V1  200030322100597580292026031000000000000000028149202603100001   0000005   788TND000000000001191310                                                                                                                                           
V2  2000303221005975802905000000001556336231BADREDDINE FARES              000000000000000281492026031000010000001000MARE ALB SIEGE RETRAITES 2026721227 du 09032026 OV GM n 28149                                       000000000000083836      
V2  2000303221005975802914061061100700329850Rhouma Ahmed                  000000000000000281492026031000010000002000MARE ALB SIEGE RETRAITES 2026721227 du 09032026 OV GM n 28149                                       000000000000323950      
V2  2000303221005975802917001000000361892056OM HENI                       000000000000000281492026031000010000003000MARE ALB SIEGE RETRAITES 2026721227 du 09032026 OV GM n 28149                                       000000000000110976      
V2  2000303221005975802905000000001507917711Samia MANAA                   000000000000000281492026031000010000004000MARE ALB SIEGE RETRAITES 2026721227 du 09032026 OV GM n 28149                                       000000000000559077      
V2  2000303221005975802914008008100701865254ADEL NOUIRA                   000000000000000281492026031000010000005000MARE ALB SIEGE RETRAITES 2026721227 du 09032026 OV GM n 28149                                       000000000000113471`;

async function testTxtGeneration() {
  console.log('🧪 Testing TXT Generation...\n');
  
  // Create service instance (without Prisma for testing)
  const service = new TxtGenerationService(null as any);
  
  try {
    // Generate TXT
    const generated = await service.generateOVTxt(testData);
    
    // Save to file
    const fs = require('fs');
    fs.writeFileSync('generated-output.txt', generated, 'utf8');
    console.log('✅ Generated output saved to: generated-output.txt\n');
    
    console.log('📄 GENERATED OUTPUT:');
    console.log('='.repeat(100));
    console.log(generated);
    console.log('='.repeat(100));
    console.log('\n');
    
    console.log('📄 DESIRED OUTPUT:');
    console.log('='.repeat(100));
    console.log(desiredOutput);
    console.log('='.repeat(100));
    console.log('\n');
    
    // Compare line by line
    const generatedLines = generated.split('\n');
    const desiredLines = desiredOutput.split('\n');
    
    console.log('🔍 LINE-BY-LINE COMPARISON:\n');
    
    let allMatch = true;
    const maxLines = Math.max(generatedLines.length, desiredLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const genLine = generatedLines[i] || '';
      const desLine = desiredLines[i] || '';
      
      const match = genLine === desLine;
      allMatch = allMatch && match;
      
      console.log(`Line ${i + 1}: ${match ? '✅ MATCH' : '❌ MISMATCH'}`);
      console.log(`  Length: Generated=${genLine.length}, Desired=${desLine.length}`);
      
      if (!match) {
        console.log(`  Generated: "${genLine}"`);
        console.log(`  Desired:   "${desLine}"`);
        
        // Character-by-character comparison
        const maxLen = Math.max(genLine.length, desLine.length);
        let firstDiff = -1;
        for (let j = 0; j < maxLen; j++) {
          if (genLine[j] !== desLine[j]) {
            firstDiff = j;
            break;
          }
        }
        
        if (firstDiff >= 0) {
          console.log(`  First difference at position ${firstDiff}:`);
          console.log(`    Generated char: "${genLine[firstDiff] || 'EOF'}" (code: ${genLine.charCodeAt(firstDiff) || 'N/A'})`);
          console.log(`    Desired char:   "${desLine[firstDiff] || 'EOF'}" (code: ${desLine.charCodeAt(firstDiff) || 'N/A'})`);
          console.log(`    Context: ...${genLine.substring(Math.max(0, firstDiff - 10), firstDiff + 10)}...`);
        }
      }
      console.log('');
    }
    
    console.log('\n' + '='.repeat(100));
    if (allMatch) {
      console.log('✅ SUCCESS: Generated output matches desired output EXACTLY!');
    } else {
      console.log('❌ FAILURE: Generated output does NOT match desired output');
    }
    console.log('='.repeat(100));
    
    // Calculate total amounts for verification
    const totalAmount = testData.virements.reduce((sum, v) => sum + v.montant, 0);
    const totalMillimes = Math.round(totalAmount * 1000);
    console.log(`\n💰 Total Amount: ${totalAmount.toFixed(3)} DT = ${totalMillimes} millimes`);
    console.log(`📊 Number of virements: ${testData.virements.length}`);
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testTxtGeneration();
