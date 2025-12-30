#!/usr/bin/env node

const readline = require('readline');

// Expected format: Line 1 = 280 chars, Lines 2+ = 280 chars each
const EXPECTED_LINE_LENGTH = 280;
const EXPECTED_HEADER_LENGTH = 280;

console.log('📋 Paste your actual TXT output below, then press ENTER twice:\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let inputLines = [];
let emptyLineCount = 0;

rl.on('line', (line) => {
  if (line.trim() === '') {
    emptyLineCount++;
    if (emptyLineCount >= 2) {
      rl.close();
    }
  } else {
    emptyLineCount = 0;
    inputLines.push(line);
  }
});

rl.on('close', () => {
  const actualInput = inputLines.join('\n');
  compareFormats(actualInput);
});

function compareFormats(actual) {
  const actualLines = actual.split('\n').filter(l => l.trim());

  console.log('\n' + '='.repeat(80));
  console.log('🔍 TXT FORMAT VALIDATION');
  console.log('='.repeat(80) + '\n');

  let errors = 0;

  actualLines.forEach((line, i) => {
    const lineNum = i + 1;
    const len = line.length;
    const expected = EXPECTED_LINE_LENGTH;
    const diff = len - expected;
    const trailing = len - line.trimEnd().length;

    console.log(`LINE ${lineNum}: Length=${len} Expected=${expected} ${diff === 0 ? '✅' : '❌ DIFF=' + diff} Trailing=${trailing}`);
    
    if (diff !== 0) errors++;
  });

  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total lines: ${actualLines.length}`);
  console.log(`Expected length per line: ${EXPECTED_LINE_LENGTH} characters`);
  console.log(`Errors: ${errors}`);

  if (errors === 0) {
    console.log('\n✅ ✅ ✅ PERFECT! All lines are exactly 280 characters! ✅ ✅ ✅\n');
  } else {
    console.log('\n❌ ❌ ❌ FORMAT ERROR! Some lines are not 280 characters! ❌ ❌ ❌\n');
  }
}
