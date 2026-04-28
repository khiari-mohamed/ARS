const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prodPrisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:23044943@10.34.60.63:5432/ars_db'
});

async function exportSiwarCompleteData() {
  console.log('🚀 Starting COMPLETE Siwar Ayari data export from PRODUCTION...\n');

  try {
    // 1. Find Siwar
    const siwar = await prodPrisma.user.findFirst({
      where: { fullName: { contains: 'Siwar Ayari' } }
    });

    if (!siwar) throw new Error('Siwar Ayari not found');
    console.log(`✅ Found Siwar: ${siwar.fullName} (${siwar.id})\n`);

    // 2. Get contracts assigned to Siwar
    const contracts = await prodPrisma.contract.findMany({
      where: { teamLeaderId: siwar.id }
    });
    console.log(`✅ Found ${contracts.length} contracts`);

    const clientIds = [...new Set(contracts.map(c => c.clientId))];
    const contractIds = contracts.map(c => c.id);

    // 3. Get clients
    const clients = await prodPrisma.client.findMany({
      where: { id: { in: clientIds } }
    });
    console.log(`✅ Found ${clients.length} clients`);

    // 4. Get compagnies
    const compagnieIds = [...new Set(clients.map(c => c.compagnieAssuranceId).filter(Boolean))];
    const compagnies = await prodPrisma.compagnieAssurance.findMany({
      where: { id: { in: compagnieIds } }
    });
    console.log(`✅ Found ${compagnies.length} compagnies`);

    // 5. Get bordereaux
    const bordereaux = await prodPrisma.bordereau.findMany({
      where: { clientId: { in: clientIds } }
    });
    console.log(`✅ Found ${bordereaux.length} bordereaux`);

    const bordereauIds = bordereaux.map(b => b.id);

    // 6. Get ALL document types
    const documents = await prodPrisma.document.findMany({
      where: { bordereauId: { in: bordereauIds } }
    });
    console.log(`✅ Found ${documents.length} documents`);

    // 7. Get adherents
    const adherents = await prodPrisma.adherent.findMany({
      where: { clientId: { in: clientIds } }
    });
    console.log(`✅ Found ${adherents.length} adherents`);

    const adherentIds = adherents.map(a => a.id);

    // 8. Get bulletin soins
    const bulletinSoins = await prodPrisma.bulletinSoin.findMany({
      where: { bordereauId: { in: bordereauIds } }
    });
    console.log(`✅ Found ${bulletinSoins.length} bulletin soins`);

    // 9. Get ordres virement (via bordereaux)
    const ordresVirement = await prodPrisma.ordreVirement.findMany({
      where: { bordereauId: { in: bordereauIds } }
    });
    console.log(`✅ Found ${ordresVirement.length} ordres virement`);

    const ovIds = ordresVirement.map(ov => ov.id);

    // 10. Get virement items
    const virementItems = await prodPrisma.virementItem.findMany({
      where: { ordreVirementId: { in: ovIds } }
    });
    console.log(`✅ Found ${virementItems.length} virement items`);

    // 11. Get donneurs d'ordre
    const donneurIds = [...new Set(ordresVirement.map(ov => ov.donneurOrdreId).filter(Boolean))];
    const donneurs = await prodPrisma.donneurOrdre.findMany({
      where: { id: { in: donneurIds } }
    });
    console.log(`✅ Found ${donneurs.length} donneurs d'ordre\n`);

    // Generate SQL
    console.log('📍 Generating SQL file...\n');
    
    let sql = `-- ========================================
-- Siwar Ayari COMPLETE Data Export
-- Generated: ${new Date().toISOString()}
-- ========================================

SET session_replication_role = 'replica';

`;

    // User
    sql += `-- USER\n`;
    sql += `INSERT INTO "User" (id, email, password, "fullName", role, "createdAt", department, active, capacity, "departmentId", "serviceType", "teamLeaderId")
VALUES ('${siwar.id}', '${siwar.email}', '${siwar.password}', '${siwar.fullName}', '${siwar.role}', '${siwar.createdAt.toISOString()}', ${siwar.department ? `'${siwar.department}'` : 'NULL'}, ${siwar.active}, ${siwar.capacity}, ${siwar.departmentId ? `'${siwar.departmentId}'` : 'NULL'}, ${siwar.serviceType ? `'${siwar.serviceType}'` : 'NULL'}, ${siwar.teamLeaderId ? `'${siwar.teamLeaderId}'` : 'NULL'})
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, "fullName" = EXCLUDED."fullName", role = EXCLUDED.role, active = EXCLUDED.active;\n\n`;

    // Compagnies
    sql += `-- COMPAGNIES ASSURANCE (${compagnies.length})\n`;
    compagnies.forEach(c => {
      sql += `INSERT INTO "CompagnieAssurance" (id, nom, code, adresse, telephone, email, statut, "createdAt", "updatedAt")
VALUES ('${c.id}', '${c.nom}', '${c.code}', ${c.adresse ? `'${c.adresse}'` : 'NULL'}, ${c.telephone ? `'${c.telephone}'` : 'NULL'}, ${c.email ? `'${c.email}'` : 'NULL'}, '${c.statut}', '${c.createdAt.toISOString()}', '${c.updatedAt.toISOString()}')
ON CONFLICT (id) DO NOTHING;\n`;
    });
    sql += '\n';

    // Clients
    sql += `-- CLIENTS (${clients.length})\n`;
    clients.forEach(c => {
      sql += `INSERT INTO "Client" (id, name, "reglementDelay", "reclamationDelay", "createdAt", "updatedAt", "slaConfig", address, email, phone, status, "chargeCompteId", "contractDocumentPath", "compagnieAssuranceId", "modeRecuperation")
VALUES ('${c.id}', '${c.name}', ${c.reglementDelay}, ${c.reclamationDelay}, '${c.createdAt.toISOString()}', '${c.updatedAt.toISOString()}', ${c.slaConfig ? `'${JSON.stringify(c.slaConfig)}'::jsonb` : 'NULL'}, ${c.address ? `'${c.address}'` : 'NULL'}, ${c.email ? `'${c.email}'` : 'NULL'}, ${c.phone ? `'${c.phone}'` : 'NULL'}, '${c.status}', ${c.chargeCompteId ? `'${c.chargeCompteId}'` : 'NULL'}, ${c.contractDocumentPath ? `'${c.contractDocumentPath}'` : 'NULL'}, ${c.compagnieAssuranceId ? `'${c.compagnieAssuranceId}'` : 'NULL'}, ${c.modeRecuperation ? `'${c.modeRecuperation}'` : 'NULL'})
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "reglementDelay" = EXCLUDED."reglementDelay", "reclamationDelay" = EXCLUDED."reclamationDelay", "compagnieAssuranceId" = EXCLUDED."compagnieAssuranceId";\n`;
    });
    sql += '\n';

    // Contracts
    sql += `-- CONTRACTS (${contracts.length})\n`;
    contracts.forEach(c => {
      sql += `INSERT INTO "Contract" (id, "assignedManagerId", "teamLeaderId", "clientId", "clientName", "codeAssure", "createdAt", "delaiReclamation", "delaiReglement", "documentPath", "escalationThreshold", "updatedAt", "endDate", "startDate", signature, version, thresholds)
VALUES ('${c.id}', ${c.assignedManagerId ? `'${c.assignedManagerId}'` : 'NULL'}, ${c.teamLeaderId ? `'${c.teamLeaderId}'` : 'NULL'}, '${c.clientId}', '${c.clientName}', '${c.codeAssure}', '${c.createdAt.toISOString()}', ${c.delaiReclamation}, ${c.delaiReglement}, '${c.documentPath}', ${c.escalationThreshold}, '${c.updatedAt.toISOString()}', '${c.endDate.toISOString()}', '${c.startDate.toISOString()}', ${c.signature ? `'${c.signature}'` : 'NULL'}, ${c.version}, ${c.thresholds ? `'${JSON.stringify(c.thresholds)}'::jsonb` : 'NULL'})
ON CONFLICT (id) DO UPDATE SET "teamLeaderId" = EXCLUDED."teamLeaderId";\n`;
    });
    sql += '\n';

    // Bordereaux
    sql += `-- BORDEREAUX (${bordereaux.length})\n`;
    bordereaux.forEach(b => {
      sql += `INSERT INTO "Bordereau" (id, reference, "clientId", "contractId", type, "dateReception", "dateDebutScan", "dateFinScan", "dateReceptionSante", "dateCloture", "dateDepotVirement", "dateExecutionVirement", "delaiReglement", statut, "nombreBS", "createdAt", "updatedAt", "currentHandlerId", "teamId", "assignedToUserId", "prestataireId", priority, archived, "chargeCompteId", "dateLimiteTraitement", "dateReceptionBO", "dateAffectation", "dateReceptionEquipeSante", "dateReelleCloture", "nombreJourTraitement", "scanStatus", "completionRate", "documentStatus")
VALUES ('${b.id}', '${b.reference}', '${b.clientId}', '${b.contractId}', '${b.type}', ${b.dateReception ? `'${b.dateReception.toISOString()}'` : 'NULL'}, ${b.dateDebutScan ? `'${b.dateDebutScan.toISOString()}'` : 'NULL'}, ${b.dateFinScan ? `'${b.dateFinScan.toISOString()}'` : 'NULL'}, ${b.dateReceptionSante ? `'${b.dateReceptionSante.toISOString()}'` : 'NULL'}, ${b.dateCloture ? `'${b.dateCloture.toISOString()}'` : 'NULL'}, ${b.dateDepotVirement ? `'${b.dateDepotVirement.toISOString()}'` : 'NULL'}, ${b.dateExecutionVirement ? `'${b.dateExecutionVirement.toISOString()}'` : 'NULL'}, ${b.delaiReglement}, '${b.statut}', ${b.nombreBS}, '${b.createdAt.toISOString()}', '${b.updatedAt.toISOString()}', ${b.currentHandlerId ? `'${b.currentHandlerId}'` : 'NULL'}, ${b.teamId ? `'${b.teamId}'` : 'NULL'}, ${b.assignedToUserId ? `'${b.assignedToUserId}'` : 'NULL'}, ${b.prestataireId ? `'${b.prestataireId}'` : 'NULL'}, ${b.priority}, ${b.archived}, ${b.chargeCompteId ? `'${b.chargeCompteId}'` : 'NULL'}, ${b.dateLimiteTraitement ? `'${b.dateLimiteTraitement.toISOString()}'` : 'NULL'}, ${b.dateReceptionBO ? `'${b.dateReceptionBO.toISOString()}'` : 'NULL'}, ${b.dateAffectation ? `'${b.dateAffectation.toISOString()}'` : 'NULL'}, ${b.dateReceptionEquipeSante ? `'${b.dateReceptionEquipeSante.toISOString()}'` : 'NULL'}, ${b.dateReelleCloture ? `'${b.dateReelleCloture.toISOString()}'` : 'NULL'}, ${b.nombreJourTraitement}, '${b.scanStatus}', ${b.completionRate}, '${b.documentStatus}')
ON CONFLICT (id) DO NOTHING;\n`;
    });
    sql += '\n';

    // Documents
    sql += `-- DOCUMENTS (${documents.length})\n`;
    documents.forEach(d => {
      const name = d.name ? d.name.replace(/'/g, "''") : '';
      const path = d.path ? d.path.replace(/'/g, "''") : '';
      const ocrText = d.ocrText ? d.ocrText.replace(/'/g, "''") : '';
      
      sql += `INSERT INTO "Document" (id, name, type, path, "uploadedAt", "uploadedById", "bordereauId", "ocrResult", "ocrText", status, hash, "barcodeValues", "batchId", "colorMode", "imprinterIds", "ingestStatus", "ingestTimestamp", "operatorId", "pageCount", resolution, "scannerModel", "assignedToUserId", "assignedAt", "assignedByUserId", priority, "slaApplicable", "statusModifiedByGestionnaire")
VALUES ('${d.id}', ${name ? `'${name}'` : 'NULL'}, '${d.type}', ${path ? `'${path}'` : 'NULL'}, '${d.uploadedAt.toISOString()}', '${d.uploadedById}', ${d.bordereauId ? `'${d.bordereauId}'` : 'NULL'}, ${d.ocrResult ? `'${JSON.stringify(d.ocrResult)}'::jsonb` : 'NULL'}, ${ocrText ? `'${ocrText}'` : 'NULL'}, ${d.status ? `'${d.status}'` : 'NULL'}, ${d.hash ? `'${d.hash}'` : 'NULL'}, ${d.barcodeValues && d.barcodeValues.length > 0 ? `ARRAY[${d.barcodeValues.map(v => `'${v}'`).join(',')}]` : 'ARRAY[]::text[]'}, ${d.batchId ? `'${d.batchId}'` : 'NULL'}, ${d.colorMode ? `'${d.colorMode}'` : 'NULL'}, ${d.imprinterIds && d.imprinterIds.length > 0 ? `ARRAY[${d.imprinterIds.map(v => `'${v}'`).join(',')}]` : 'ARRAY[]::text[]'}, ${d.ingestStatus ? `'${d.ingestStatus}'` : 'NULL'}, ${d.ingestTimestamp ? `'${d.ingestTimestamp.toISOString()}'` : 'NULL'}, ${d.operatorId ? `'${d.operatorId}'` : 'NULL'}, ${d.pageCount}, ${d.resolution}, ${d.scannerModel ? `'${d.scannerModel}'` : 'NULL'}, ${d.assignedToUserId ? `'${d.assignedToUserId}'` : 'NULL'}, ${d.assignedAt ? `'${d.assignedAt.toISOString()}'` : 'NULL'}, ${d.assignedByUserId ? `'${d.assignedByUserId}'` : 'NULL'}, ${d.priority}, ${d.slaApplicable}, ${d.statusModifiedByGestionnaire})
ON CONFLICT (id) DO NOTHING;\n`;
    });
    sql += '\n';

    // Adherents
    sql += `-- ADHERENTS (${adherents.length})\n`;
    adherents.forEach(a => {
      const nom = a.nom ? a.nom.replace(/'/g, "''") : '';
      const prenom = a.prenom ? a.prenom.replace(/'/g, "''") : '';
      
      sql += `INSERT INTO "Adherent" (id, matricule, nom, prenom, rib, "clientId", statut, "createdAt", "updatedAt")
VALUES ('${a.id}', '${a.matricule}', ${nom ? `'${nom}'` : 'NULL'}, ${prenom ? `'${prenom}'` : 'NULL'}, ${a.rib ? `'${a.rib}'` : 'NULL'}, '${a.clientId}', '${a.statut}', '${a.createdAt.toISOString()}', '${a.updatedAt.toISOString()}')
ON CONFLICT (id) DO NOTHING;\n`;
    });
    sql += '\n';

    // Donneurs d'ordre
    sql += `-- DONNEURS D'ORDRE (${donneurs.length})\n`;
    donneurs.forEach(d => {
      sql += `INSERT INTO "DonneurOrdre" (id, nom, rib, "formatTxt", "createdAt", "updatedAt")
VALUES ('${d.id}', '${d.nom}', '${d.rib}', ${d.formatTxt ? `'${d.formatTxt}'` : 'NULL'}, '${d.createdAt.toISOString()}', '${d.updatedAt.toISOString()}')
ON CONFLICT (id) DO NOTHING;\n`;
    });
    sql += '\n';

    // Ordres Virement
    sql += `-- ORDRES VIREMENT (${ordresVirement.length})\n`;
    ordresVirement.forEach(ov => {
      sql += `INSERT INTO "OrdreVirement" (id, reference, "clientId", "donneurOrdreId", "montantTotal", "nombreAdherents", "dateCreation", "datePrevueExecution", "dateExecution", statut, "fichierExcel", "fichierPdf", "fichierTxt", "createdById", "createdAt", "updatedAt")
VALUES ('${ov.id}', '${ov.reference}', '${ov.clientId}', ${ov.donneurOrdreId ? `'${ov.donneurOrdreId}'` : 'NULL'}, ${ov.montantTotal}, ${ov.nombreAdherents}, '${ov.dateCreation.toISOString()}', ${ov.datePrevueExecution ? `'${ov.datePrevueExecution.toISOString()}'` : 'NULL'}, ${ov.dateExecution ? `'${ov.dateExecution.toISOString()}'` : 'NULL'}, '${ov.statut}', ${ov.fichierExcel ? `'${ov.fichierExcel}'` : 'NULL'}, ${ov.fichierPdf ? `'${ov.fichierPdf}'` : 'NULL'}, ${ov.fichierTxt ? `'${ov.fichierTxt}'` : 'NULL'}, '${ov.createdById}', '${ov.createdAt.toISOString()}', '${ov.updatedAt.toISOString()}')
ON CONFLICT (id) DO NOTHING;\n`;
    });
    sql += '\n';

    // Virement Items
    sql += `-- VIREMENT ITEMS (${virementItems.length})\n`;
    virementItems.forEach(vi => {
      sql += `INSERT INTO "VirementItem" (id, "ordreVirementId", "adherentId", matricule, nom, prenom, rib, montant, statut, "createdAt", "updatedAt")
VALUES ('${vi.id}', '${vi.ordreVirementId}', ${vi.adherentId ? `'${vi.adherentId}'` : 'NULL'}, '${vi.matricule}', '${vi.nom}', '${vi.prenom}', '${vi.rib}', ${vi.montant}, '${vi.statut}', '${vi.createdAt.toISOString()}', '${vi.updatedAt.toISOString()}')
ON CONFLICT (id) DO NOTHING;\n`;
    });
    sql += '\n';

    // Bulletin Soins
    sql += `-- BULLETIN SOINS (${bulletinSoins.length})\n`;
    bulletinSoins.forEach(bs => {
      const nomAssure = bs.nomAssure ? bs.nomAssure.replace(/'/g, "''") : '';
      const nomBeneficiaire = bs.nomBeneficiaire ? bs.nomBeneficiaire.replace(/'/g, "''") : '';
      const nomPrestation = bs.nomPrestation ? bs.nomPrestation.replace(/'/g, "''") : '';
      const observationGlobal = bs.observationGlobal ? bs.observationGlobal.replace(/'/g, "''") : '';
      
      sql += `INSERT INTO "BulletinSoin" (id, "bordereauId", "numBs", etat, "ownerId", "processedAt", "codeAssure", "createdAt", "dateCreation", "dateMaladie", lien, "nomAssure", "nomBeneficiaire", "nomBordereau", "nomPrestation", "nomSociete", "observationGlobal", "ocrText", "totalPec", "updatedAt", acte, "dateSoin", "deletedAt", matricule, montant, "dueDate", "processedById", "virementId", priority)
VALUES ('${bs.id}', '${bs.bordereauId}', '${bs.numBs}', '${bs.etat}', ${bs.ownerId ? `'${bs.ownerId}'` : 'NULL'}, ${bs.processedAt ? `'${bs.processedAt.toISOString()}'` : 'NULL'}, '${bs.codeAssure}', '${bs.createdAt.toISOString()}', '${bs.dateCreation.toISOString()}', '${bs.dateMaladie.toISOString()}', '${bs.lien}', '${nomAssure}', '${nomBeneficiaire}', '${bs.nomBordereau}', '${nomPrestation}', '${bs.nomSociete}', '${observationGlobal}', ${bs.ocrText ? `'${bs.ocrText.replace(/'/g, "''")}'` : 'NULL'}, ${bs.totalPec}, '${bs.updatedAt.toISOString()}', ${bs.acte ? `'${bs.acte}'` : 'NULL'}, ${bs.dateSoin ? `'${bs.dateSoin.toISOString()}'` : 'NULL'}, ${bs.deletedAt ? `'${bs.deletedAt.toISOString()}'` : 'NULL'}, ${bs.matricule ? `'${bs.matricule}'` : 'NULL'}, ${bs.montant}, ${bs.dueDate ? `'${bs.dueDate.toISOString()}'` : 'NULL'}, ${bs.processedById ? `'${bs.processedById}'` : 'NULL'}, ${bs.virementId ? `'${bs.virementId}'` : 'NULL'}, ${bs.priority})
ON CONFLICT (id) DO NOTHING;\n`;
    });
    sql += '\n';

    sql += `SET session_replication_role = 'origin';\n`;

    // Write file
    const filePath = path.join(__dirname, 'siwar-complete-data.sql');
    fs.writeFileSync(filePath, sql);
    const stats = fs.statSync(filePath);

    console.log('✅ SQL file generated successfully!\n');
    console.log(`📁 File: ${filePath}`);
    console.log(`📊 Size: ${(stats.size / 1024).toFixed(2)} KB\n`);
    console.log('🎉 ========== EXPORT COMPLETE ==========');
    console.log(`✅ User: ${siwar.fullName}`);
    console.log(`✅ Clients: ${clients.length}`);
    console.log(`✅ Contracts: ${contracts.length}`);
    console.log(`✅ Bordereaux: ${bordereaux.length}`);
    console.log(`✅ Documents: ${documents.length}`);
    console.log(`✅ Adherents: ${adherents.length}`);
    console.log(`✅ Bulletin Soins: ${bulletinSoins.length}`);
    console.log(`✅ Ordres Virement: ${ordresVirement.length}`);
    console.log(`✅ Virement Items: ${virementItems.length}`);
    console.log(`✅ Donneurs d'Ordre: ${donneurs.length}`);
    console.log(`✅ Compagnies Assurance: ${compagnies.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prodPrisma.$disconnect();
  }
}

exportSiwarCompleteData();
