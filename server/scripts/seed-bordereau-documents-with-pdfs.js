const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DOCUMENT_TYPES = [
  'BULLETIN_SOIN',
  'COMPLEMENT_INFORMATION',
  'ADHESION',
  'RECLAMATION',
  'CONTRAT_AVENANT',
  'DEMANDE_RESILIATION',
  'CONVENTION_TIERS_PAYANT',
];

const DOCUMENT_STATUSES = ['UPLOADED', 'SCANNE', 'TRAITE'];

async function ensureUploader() {
  let user = await prisma.user.findFirst();
  if (user) return user;

  user = await prisma.user.create({
    data: {
      email: 'seed-docs@ars.tn',
      password: 'seed-docs',
      fullName: 'Seed Documents User',
      role: 'SUPER_ADMIN',
    },
  });

  return user;
}

function buildPdfBuffer({ title, body, bordereauRef, clientName, type }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Type: ${type}`);
    doc.text(`Bordereau: ${bordereauRef}`);
    doc.text(`Client: ${clientName}`);
    doc.moveDown();
    doc.text(body);
    doc.moveDown();
    doc.text(`Generated on: ${new Date().toISOString()}`);
    doc.end();
  });
}

async function seedBordereauDocuments() {
  console.log('📄 Scanning existing bordereaux...');

  const uploader = await ensureUploader();
  const bordereaux = await prisma.bordereau.findMany({
    include: { client: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!bordereaux.length) {
    console.log('No bordereaux found. Create some first, then rerun this script.');
    return;
  }

  const uploadsDir = path.join(process.cwd(), 'uploads', 'bordereaux');
  fs.mkdirSync(uploadsDir, { recursive: true });

  let created = 0;

  for (const [index, bordereau] of bordereaux.entries()) {
    const existingDocs = await prisma.document.findMany({
      where: { bordereauId: bordereau.id },
      select: { type: true },
    });

    if (existingDocs.length >= 3) {
      console.log(`Skipping ${bordereau.reference} — already has documents.`);
      continue;
    }

    const docCount = 2 + (index % 2);
    for (let offset = 0; offset < docCount; offset += 1) {
      const docType = DOCUMENT_TYPES[(index + offset) % DOCUMENT_TYPES.length];
      const existingType = existingDocs.some((doc) => doc.type === docType);
      if (existingType) continue;

      const safeName = `${bordereau.reference}-${docType.toLowerCase()}-${offset + 1}.pdf`;
      const fileDir = path.join(uploadsDir, bordereau.id);
      fs.mkdirSync(fileDir, { recursive: true });
      const filePath = path.join(fileDir, safeName);

      const pdfBuffer = await buildPdfBuffer({
        title: `Document ${docType}`,
        body: `Ce document a été généré automatiquement pour le bordereau ${bordereau.reference}.\nClient: ${bordereau.client?.name || 'N/A'}\nType: ${docType}`,
        bordereauRef: bordereau.reference,
        clientName: bordereau.client?.name || 'N/A',
        type: docType,
      });

      fs.writeFileSync(filePath, pdfBuffer);

      const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
      await prisma.document.create({
        data: {
          name: safeName,
          type: docType,
          path: filePath,
          uploadedAt: new Date(),
          uploadedById: uploader.id,
          bordereauId: bordereau.id,
          status: DOCUMENT_STATUSES[offset % DOCUMENT_STATUSES.length],
          hash,
          barcodeValues: [`${bordereau.reference}-${docType}`],
          batchId: `batch-${bordereau.id}`,
          colorMode: 'RGB',
          imprinterIds: ['seed-imprinter'],
          ingestStatus: 'DONE',
          ingestTimestamp: new Date(),
          operatorId: uploader.id,
          pageCount: 1,
          resolution: 300,
          scannerModel: 'SEED-PDF',
          ocrText: `Document auto-généré pour ${bordereau.reference}`,
          ocrResult: {
            confidence: 0.99,
            type: docType,
          },
        },
      });

      created += 1;
      console.log(`Created ${docType} PDF for ${bordereau.reference}`);
    }
  }

  console.log(`✅ Seed complete. Created ${created} PDF document(s).`);
}

seedBordereauDocuments()
  .catch((error) => {
    console.error('❌ Error while seeding bordereau documents:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
