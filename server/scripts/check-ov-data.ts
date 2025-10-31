import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOVData() {
  console.log('='.repeat(80));
  console.log('CHECKING ORDRES VIREMENT DATA');
  console.log('='.repeat(80));
  
  // Get all OrdreVirement records
  const ordresVirement = await prisma.ordreVirement.findMany({
    include: {
      bordereau: {
        include: {
          client: {
            include: {
              compagnieAssurance: true
            }
          }
        }
      },
      donneurOrdre: true
    },
    orderBy: { dateCreation: 'desc' }
  });
  
  console.log(`\nFound ${ordresVirement.length} Ordres de Virement\n`);
  
  ordresVirement.forEach((ov, index) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`OV #${index + 1}: ${ov.reference}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`ID: ${ov.id}`);
    console.log(`Reference: ${ov.reference}`);
    console.log(`Reference Bordereau: ${ov.bordereau?.reference || 'N/A'}`);
    console.log(`Compagnie Assurance: ${ov.bordereau?.client?.compagnieAssurance?.nom || 'N/A'}`);
    console.log(`Client/Société: ${ov.bordereau?.client?.name || 'Entrée manuelle'}`);
    console.log(`Montant Total: ${ov.montantTotal} TND`);
    console.log(`Nombre Adhérents: ${ov.nombreAdherents}`);
    console.log(`État Virement: ${ov.etatVirement}`);
    console.log(`Date Création: ${ov.dateCreation}`);
    console.log(`Date Traitement: ${ov.dateTraitement || 'N/A'}`);
    console.log(`Date État Final: ${ov.dateEtatFinal || 'N/A'}`);
    console.log(`\n--- IMPORTANT FIELDS ---`);
    console.log(`Commentaire: ${ov.commentaire || 'NULL'}`);
    console.log(`Motif Observation: ${ov.motifObservation || 'NULL'}`);
    console.log(`Demande Récupération: ${ov.demandeRecuperation ? 'Oui' : 'Non'}`);
    console.log(`Date Demande Récupération: ${ov.dateDemandeRecuperation || 'NULL'}`);
    console.log(`Montant Récupéré: ${ov.montantRecupere ? 'Oui' : 'Non'}`);
    console.log(`Date Montant Récupéré: ${ov.dateMontantRecupere || 'NULL'}`);
    console.log(`\n--- VALIDATION INFO ---`);
    console.log(`Validation Status: ${ov.validationStatus || 'N/A'}`);
    console.log(`Validated By: ${ov.validatedBy || 'N/A'}`);
    console.log(`Validated At: ${ov.validatedAt || 'N/A'}`);
    console.log(`Validation Comment: ${ov.validationComment || 'NULL'}`);
    console.log(`\n--- USER INFO ---`);
    console.log(`Utilisateur Santé: ${ov.utilisateurSante}`);
    console.log(`Utilisateur Finance: ${ov.utilisateurFinance || 'N/A'}`);
    console.log(`\n--- BORDEREAU INFO ---`);
    console.log(`Bordereau ID: ${ov.bordereauId || 'N/A'}`);
    console.log(`Bordereau Reference: ${ov.bordereau?.reference || 'N/A'}`);
    console.log(`Bordereau Statut: ${ov.bordereau?.statut || 'N/A'}`);
    console.log(`Bordereau Date Clôture: ${ov.bordereau?.dateCloture || 'N/A'}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('CHECKING BORDEREAUX TRAITÉS');
  console.log('='.repeat(80));
  
  // Get bordereaux with status TRAITE or with OV
  const bordereaux = await prisma.bordereau.findMany({
    where: {
      OR: [
        { statut: 'TRAITE' },
        { ordresVirement: { some: {} } }
      ],
      archived: false
    },
    include: {
      client: {
        include: {
          compagnieAssurance: true
        }
      },
      ordresVirement: {
        include: {
          donneurOrdre: true
        }
      }
    },
    orderBy: { dateCloture: 'desc' }
  });
  
  console.log(`\nFound ${bordereaux.length} Bordereaux Traités\n`);
  
  bordereaux.forEach((b, index) => {
    const ov = b.ordresVirement[0];
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Bordereau #${index + 1}: ${b.reference}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`Bordereau ID: ${b.id}`);
    console.log(`Reference: ${b.reference}`);
    console.log(`Client: ${b.client.name}`);
    console.log(`Compagnie: ${b.client.compagnieAssurance?.nom || 'N/A'}`);
    console.log(`Statut: ${b.statut}`);
    console.log(`Date Clôture: ${b.dateCloture || 'N/A'}`);
    console.log(`Nombre BS: ${b.nombreBS}`);
    
    if (ov) {
      console.log(`\n--- LINKED OV ---`);
      console.log(`OV ID: ${ov.id}`);
      console.log(`OV Reference: ${ov.reference}`);
      console.log(`Montant Total: ${ov.montantTotal} TND`);
      console.log(`État Virement: ${ov.etatVirement}`);
      console.log(`Date Injection: ${ov.dateCreation}`);
      console.log(`Date Traitement: ${ov.dateTraitement || 'N/A'}`);
      console.log(`\n--- IMPORTANT FIELDS ---`);
      console.log(`Commentaire: ${ov.commentaire || 'NULL'}`);
      console.log(`Motif Observation: ${ov.motifObservation || 'NULL'}`);
      console.log(`Demande Récupération: ${ov.demandeRecuperation ? 'Oui' : 'Non'}`);
      console.log(`Date Demande Récupération: ${ov.dateDemandeRecuperation || 'NULL'}`);
      console.log(`Montant Récupéré: ${ov.montantRecupere ? 'Oui' : 'Non'}`);
      console.log(`Date Montant Récupéré: ${ov.dateMontantRecupere || 'NULL'}`);
    } else {
      console.log(`\n--- NO OV LINKED ---`);
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Ordres Virement: ${ordresVirement.length}`);
  console.log(`Total Bordereaux Traités: ${bordereaux.length}`);
  console.log(`OVs with motifObservation: ${ordresVirement.filter(ov => ov.motifObservation).length}`);
  console.log(`OVs with commentaire: ${ordresVirement.filter(ov => ov.commentaire).length}`);
  console.log(`OVs with demande récupération: ${ordresVirement.filter(ov => ov.demandeRecuperation).length}`);
  console.log(`OVs with montant récupéré: ${ordresVirement.filter(ov => ov.montantRecupere).length}`);
  console.log('='.repeat(80));
}

checkOVData()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
