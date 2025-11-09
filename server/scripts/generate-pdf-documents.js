const { PrismaClient } = require('@prisma/client');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function generatePDFs() {
  console.log('📄 Generating real PDF documents...\n');

  try {
    // Get all documents
    const documents = await prisma.document.findMany({
      include: {
        bordereau: {
          include: {
            client: true,
            contract: true
          }
        }
      }
    });

    console.log(`Found ${documents.length} documents to generate PDFs for\n`);

    let generated = 0;
    for (const doc of documents) {
      const filePath = path.join(__dirname, '..', doc.path);
      const dir = path.dirname(filePath);

      // Create directory if it doesn't exist
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Generate PDF
      const pdfDoc = new PDFDocument({ size: 'A4', margin: 50 });
      const writeStream = fs.createWriteStream(filePath);
      pdfDoc.pipe(writeStream);

      // Header
      pdfDoc.fontSize(20).text('ARS TUNISIE', { align: 'center' });
      pdfDoc.moveDown();
      pdfDoc.fontSize(16).text('BULLETIN DE SOINS', { align: 'center' });
      pdfDoc.moveDown(2);

      // Document info
      pdfDoc.fontSize(12);
      pdfDoc.text(`Document: ${doc.name}`, { continued: false });
      pdfDoc.text(`Type: ${doc.type}`);
      pdfDoc.text(`Statut: ${doc.status || 'N/A'}`);
      pdfDoc.moveDown();

      // Bordereau info
      if (doc.bordereau) {
        pdfDoc.fontSize(14).text('Informations Bordereau:', { underline: true });
        pdfDoc.fontSize(11);
        pdfDoc.text(`Référence: ${doc.bordereau.reference}`);
        pdfDoc.text(`Client: ${doc.bordereau.client?.name || 'N/A'}`);
        pdfDoc.text(`Date Réception: ${new Date(doc.bordereau.dateReception).toLocaleDateString('fr-FR')}`);
        pdfDoc.text(`Nombre BS: ${doc.bordereau.nombreBS}`);
        pdfDoc.text(`Statut: ${doc.bordereau.statut}`);
        pdfDoc.moveDown();
      }

      // Patient info (sample)
      pdfDoc.fontSize(14).text('Informations Patient:', { underline: true });
      pdfDoc.fontSize(11);
      pdfDoc.text(`Nom: PATIENT ${generated + 1}`);
      pdfDoc.text(`Matricule: MAT${String(generated + 1).padStart(6, '0')}`);
      pdfDoc.text(`Date de soins: ${new Date().toLocaleDateString('fr-FR')}`);
      pdfDoc.moveDown();

      // Prestations
      pdfDoc.fontSize(14).text('Prestations:', { underline: true });
      pdfDoc.fontSize(11);
      pdfDoc.text('- Consultation médicale générale');
      pdfDoc.text('- Montant: 50.00 TND');
      pdfDoc.text('- Prise en charge: 40.00 TND');
      pdfDoc.text('- Reste à charge: 10.00 TND');
      pdfDoc.moveDown(2);

      // Footer
      pdfDoc.fontSize(10).text('Document généré automatiquement par ARS System', {
        align: 'center',
        color: 'gray'
      });
      pdfDoc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, {
        align: 'center',
        color: 'gray'
      });

      pdfDoc.end();

      await new Promise((resolve) => writeStream.on('finish', resolve));
      generated++;

      if (generated % 50 === 0) {
        console.log(`✅ Generated ${generated}/${documents.length} PDFs...`);
      }
    }

    console.log(`\n✅ Successfully generated ${generated} PDF documents!\n`);
    console.log('📁 Documents are stored in: server/uploads/bordereaux/\n');

  } catch (error) {
    console.error('❌ Error generating PDFs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

generatePDFs()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
