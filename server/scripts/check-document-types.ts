import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDocumentTypes() {
  console.log('📊 Checking Document Types Data...\n');
  
  try {
    const DOCUMENT_TYPES = [
      { code: 'BULLETIN_SOIN', name: 'Bulletins de Soins', icon: '🏥', hasSLA: true },
      { code: 'COMPLEMENT_INFORMATION', name: 'Compléments Information', icon: '📋', hasSLA: true },
      { code: 'ADHESION', name: 'Adhésions', icon: '👥', hasSLA: true },
      { code: 'RECLAMATION', name: 'Réclamations', icon: '⚠️', hasSLA: true },
      { code: 'CONTRAT_AVENANT', name: 'Contrats/Avenants', icon: '📄', hasSLA: false },
      { code: 'DEMANDE_RESILIATION', name: 'Demandes Résiliation', icon: '❌', hasSLA: false },
      { code: 'CONVENTION_TIERS_PAYANT', name: 'Conventions Tiers Payant', icon: '🤝', hasSLA: false }
    ];
    
    let totalDocs = 0;
    let totalWithSLA = 0;
    let totalWithoutSLA = 0;
    
    console.log('📋 Document Type Breakdown:\n');
    
    for (const docType of DOCUMENT_TYPES) {
      const total = await prisma.bordereau.count({
        where: { type: docType.code as any }
      });
      
      const traites = await prisma.bordereau.count({
        where: { 
          type: docType.code as any,
          statut: { in: ['TRAITE', 'CLOTURE', 'PAYE'] }
        }
      });
      
      const enCours = await prisma.bordereau.count({
        where: { 
          type: docType.code as any,
          statut: { in: ['EN_COURS', 'ASSIGNE', 'A_AFFECTER', 'SCANNE', 'A_SCANNER', 'SCAN_EN_COURS'] }
        }
      });
      
      const rejetes = await prisma.bordereau.count({
        where: { 
          type: docType.code as any,
          statut: 'REJETE'
        }
      });
      
      totalDocs += total;
      if (docType.hasSLA) {
        totalWithSLA += total;
      } else {
        totalWithoutSLA += total;
      }
      
      console.log(`${docType.icon} ${docType.name} ${docType.hasSLA ? '[SLA]' : '[No SLA]'}`);
      console.log(`   Total: ${total}`);
      console.log(`   Traités: ${traites}`);
      console.log(`   En cours: ${enCours}`);
      console.log(`   Rejetés: ${rejetes}`);
      console.log(`   Percentage: ${totalDocs > 0 ? Math.round((total / totalDocs) * 100) : 0}%`);
      console.log('');
    }
    
    console.log('\n📊 Summary:');
    console.log(`   Total Documents: ${totalDocs}`);
    console.log(`   Avec SLA: ${totalWithSLA}`);
    console.log(`   Sans SLA: ${totalWithoutSLA}`);
    console.log(`   Types Supportés: ${DOCUMENT_TYPES.length}`);
    
    // Check SLA Compliance
    console.log('\n\n📈 SLA Compliance by Type:\n');
    
    const now = new Date();
    
    for (const docType of DOCUMENT_TYPES) {
      if (!docType.hasSLA) continue;
      
      const bordereaux = await prisma.bordereau.findMany({
        where: {
          type: docType.code as any
        },
        select: {
          dateReception: true,
          dateCloture: true,
          delaiReglement: true,
          client: {
            select: { reglementDelay: true }
          },
          contract: {
            select: { delaiReglement: true }
          }
        }
      });
      
      let compliant = 0;
      const closedBordereaux = bordereaux.filter(b => b.dateReception && b.dateCloture);
      
      for (const b of closedBordereaux) {
        if (!b.dateReception || !b.dateCloture) continue;
        
        const slaThreshold = b.contract?.delaiReglement || b.client?.reglementDelay || b.delaiReglement || 30;
        const processingDays = Math.floor(
          (new Date(b.dateCloture).getTime() - new Date(b.dateReception).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (processingDays <= slaThreshold) {
          compliant++;
        }
      }
      
      const complianceRate = closedBordereaux.length > 0 ? Math.round((compliant / closedBordereaux.length) * 100) : 0;
      
      console.log(`${docType.icon} ${docType.name}`);
      console.log(`   Closed: ${closedBordereaux.length}`);
      console.log(`   Compliant: ${compliant}`);
      console.log(`   Compliance Rate: ${complianceRate}%`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocumentTypes();
