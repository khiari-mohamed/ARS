const fs = require('fs');
const readline = require('readline');

const DESIRED = `110104   20251224000111788000000000030751980000000012                                                                                                                                                                                                                                   
110104   2025122400012178800000000000067900000000004001007404700411649ARS EX  &quot;AON TUNISIE S.A.&quot;    25   25096000000095904242FATHIA CHAIEB                 00000000000007100636000PGH20-2025GAN FRIGAN                         2025122400000000010                                      
110104   2025122400012178800000000000043149000000004001007404700411649ARS EX  &quot;AON TUNISIE S.A.&quot;    12   12022000000219568597IBRAHIM AGREBI AGREBI         00000000000005133560000PGH20-2025GAN FRIGAN                         2025122400000000010                                      
110104   2025122400012178800000000000275027000000004001007404700411649ARS EX  &quot;AON TUNISIE S.A.&quot;    08   08102000732007927011MAHMOUD KOLSI KOLSI           00000000000007042216000PGH20-2025GAN FRIGAN                         2025122400000000010                                      
110104   2025122400012178800000000000058803000000004001007404700411649ARS EX  &quot;AON TUNISIE S.A.&quot;    12   12022000000211591511SARRA HABIBI BJEOUI           00000000000007073102000PGH20-2025GAN FRIGAN                         2025122400000000010                                      
110104   2025122400012178800000000000136787000000004001007404700411649ARS EX  &quot;AON TUNISIE S.A.&quot;    12   12022000000204649027MOHAMED DAKHLAOUI DAKHLAOUI   00000000000007075852000PGH20-2025GAN FRIGAN                         2025122400000000010                                      
110104   2025122400012178800000000000042638000000004001007404700411649ARS EX  &quot;AON TUNISIE S.A.&quot;    14   14076076100701211125ZIED ADOULI                   00000000000007175893000PGH20-2025GAN FRIGAN                         2025122400000000010                                      
110104   2025122400012178800000000000042344000000004001007404700411649ARS EX  &quot;AON TUNISIE S.A.&quot;    07   07081013910551424371YOUSSEF RAZGALLAH             00000000000007201255000PGH20-2025GAN FRIGAN                         2025122400000000010                                      
110104   2025122400012178800000000000085000000000004001007404700411649ARS EX  &quot;AON TUNISIE S.A.&quot;    07   07081013910550843438AYMEN ZAMMAMI ZAMMAMI         00000000000007896047000PGH20-2025GAN FRIGAN                         2025122400000000010                                      
110104   2025122400012178800000000000421160000000004001007404700411649ARS EX  &quot;AON TUNISIE S.A.&quot;    17   17901000000160296226HAMZA CHANDOUL CHANDOUL       00000000000009134327000PGH20-2025GAN FRIGAN                         2025122400000000010                                      
110104   2025122400012178800000000000121411000000004001007404700411649ARS EX  &quot;AON TUNISIE S.A.&quot;    08   08019011022006473534ESSAIED MOHAMED SALAH         00000000000009284847000PGH20-2025GAN FRIGAN                         2025122400000000010                                      
110104   2025122400012178800000000000213433000000004001007404700411649ARS EX  &quot;AON TUNISIE S.A.&quot;    17   17001000000300042431HAMDI OUNALLI                 00000000000009606404000PGH20-2025GAN FRIGAN                         2025122400000000010                                      
110104   2025122400012178800000000001567546000000004001007404700411649ARS EX  &quot;AON TUNISIE S.A.&quot;    14   14076076100701201231SOUAD BEN RABEH               00000000000009608646000PGH20-2025GAN FRIGAN                         2025122400000000010                                      `;

function compare(desired, actual) {
  const dLines = desired.split('\n');
  const aLines = actual.split('\n');
  
  console.log('\n========== COMPARISON ==========\n');
  console.log(`Lines: Desired=${dLines.length}, Actual=${aLines.length}\n`);
  
  let errors = 0;
  
  for (let i = 0; i < Math.max(dLines.length, aLines.length); i++) {
    const d = dLines[i] || '';
    const a = aLines[i] || '';
    
    console.log(`LINE ${i + 1}: D=${d.length} A=${a.length} ${d.length === a.length ? 'OK' : 'DIFF=' + Math.abs(d.length - a.length)}`);
    
    if (d.length !== a.length) errors++;
  }
  
  console.log('\n========== RESULT ==========');
  console.log(errors === 0 ? 'PERFECT MATCH!' : `${errors} ERRORS`);
  console.log('============================\n');
}

const args = process.argv.slice(2);
if (args[0]) {
  compare(DESIRED, fs.readFileSync(args[0], 'utf8'));
} else {
  console.log('\nPaste output, then press ENTER twice:\n');
  const rl = readline.createInterface({ input: process.stdin });
  let lines = [];
  let empty = 0;
  
  rl.on('line', (line) => {
    if (!line.trim()) {
      empty++;
      if (empty >= 2) {
        rl.close();
        compare(DESIRED, lines.join('\n'));
      }
    } else {
      empty = 0;
      lines.push(line);
    }
  });
}
