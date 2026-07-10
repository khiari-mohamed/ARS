#!/usr/bin/env node
/**
 * Safe OV deletion script
 *
 * Usage: node server/scripts/delete-virement.js
 * The script will prompt for the OV reference (e.g. OV-2026-0006), show related
 * records and files, and require you to type the exact reference again to confirm
 * deletion.
 *
 * IMPORTANT: This is destructive. Review the printed information carefully
 * before confirming. The script deletes DB rows (ordreVirement, virementItem,
 * oVDocument) and attempts to remove associated files from disk.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (q) => new Promise((res) => rl.question(q, (a) => res(String(a || '').trim())));

async function main() {
  try {
    console.log('\n=== SAFE OV DELETION SCRIPT ===\n');

    const reference = await question('Enter the OV reference to delete (example OV-2026-0006) or type CANCEL to exit: ');
    if (!reference || reference.toUpperCase() === 'CANCEL') {
      console.log('Cancelled by user.');
      process.exit(0);
    }

    // Try to find by unique reference first, fallback to first match
    let ov = null;
    try {
      ov = await prisma.ordreVirement.findUnique({ where: { reference } });
    } catch (e) {
      // ignore - may not be unique index
    }
    if (!ov) {
      ov = await prisma.ordreVirement.findFirst({ where: { reference } });
    }

    if (!ov) {
      console.error('\n❌ No Ordre de Virement found for reference:', reference);
      process.exit(1);
    }

    // Gather related info
    const ovDocuments = await prisma.oVDocument.findMany({ where: { ordreVirementId: ov.id } });
    const virementItemCount = await prisma.virementItem.count({ where: { ordreVirementId: ov.id } });

    // Build list of candidate files to delete
    const filesToDelete = [];
    ovDocuments.forEach(d => { if (d.path) filesToDelete.push(d.path); });

    if (ov.uploadedPdfPath) {
      // Normalize possible leading slash
      const rel = ov.uploadedPdfPath.replace(/^\/+/, '');
      filesToDelete.push(path.join(process.cwd(), rel));
    }

    if (ov.fichierPdf) {
      // fichierPdf might be an absolute path or a DB blob path - attempt to include it
      filesToDelete.push(ov.fichierPdf);
    }

    console.log('\nFound OV:');
    console.log('  id:', ov.id);
    console.log('  reference:', ov.reference);
    console.log('  status:', ov.etatVirement);
    console.log('  montantTotal:', ov.montantTotal);
    console.log('  nombreAdherents:', ov.nombreAdherents);
    console.log('  bordereauId:', ov.bordereauId || 'null');
    console.log('  uploadedPdfPath:', ov.uploadedPdfPath || 'null');

    console.log('\nRelated records:');
    console.log('  OV documents:', ovDocuments.length);
    ovDocuments.forEach(d => {
      console.log(`    - id=${d.id} name=${d.name} path=${d.path}`);
    });
    console.log('  Virement items count:', virementItemCount);

    console.log('\nFiles that will be removed (if present):');
    filesToDelete.forEach(f => console.log('  -', f));

    console.log('\nIMPORTANT: This operation is destructive and cannot be undone automatically.');
    console.log('You will be asked to confirm by typing the OV reference exactly.');

    const confirm = await question('\nType the OV reference again to CONFIRM deletion, or type CANCEL to abort: ');
    if (!confirm || confirm !== ov.reference) {
      console.log('Confirmation mismatch or cancelled. Aborting.');
      process.exit(0);
    }

    console.log('\nProceeding with deletion...');

    // Capture files before deleting DB rows
    const filesSnapshot = Array.from(new Set(filesToDelete.filter(Boolean)));

    // Delete DB rows inside a transaction
    try {
      await prisma.$transaction([
        prisma.oVDocument.deleteMany({ where: { ordreVirementId: ov.id } }),
        prisma.virementItem.deleteMany({ where: { ordreVirementId: ov.id } }),
        prisma.ordreVirement.delete({ where: { id: ov.id } })
      ]);
      console.log('✅ Database records deleted.');
    } catch (dbErr) {
      console.error('❌ Failed to delete database records, aborting. Error:', dbErr.message || dbErr);
      process.exit(1);
    }

    // Attempt to remove files from disk
    for (const filePath of filesSnapshot) {
      try {
        let fp = filePath;
        // If path is relative (not absolute), try to join to project root
        if (!path.isAbsolute(fp)) {
          fp = path.join(process.cwd(), fp.replace(/^\/+/, ''));
        }
        if (fs.existsSync(fp)) {
          fs.unlinkSync(fp);
          console.log('Deleted file:', fp);
        } else {
          console.log('File not found (skipped):', fp);
        }
      } catch (e) {
        console.error('Failed to delete file:', filePath, e.message || e);
      }
    }

    console.log('\n✅ Deletion completed for OV', reference);
    process.exit(0);

  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  } finally {
    try { await prisma.$disconnect(); } catch (e) {}
    try { rl.close(); } catch (e) {}
  }
}

main();
