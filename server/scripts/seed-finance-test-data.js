/**
 * Finance Module Test Data Seed Script
 * Creates bordereaux with status TRAITE + OrdreVirements covering all statuses
 * Run: node scripts/seed-finance-test-data.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Real IDs from DB ──────────────────────────────────────────────────────────
const DONNEUR_ATTIJARI = '99f58270-c713-46cf-9ebe-194a29848bdc';
const DONNEUR_BTK_COMAR = '67efa5e5-26b6-40ec-9ba5-465ce3a61f97';
const DONNEUR_BTK_ASTREE = '0a8415c5-f6b8-42e6-a8d6-c5b531405884';
const DONNEUR_BNA = '325cec4b-f383-4cd2-9929-34c40f1b273c';

const FINANCE_USER = '1616619a-a4d6-405a-9cfe-cf1485264d31'; // MED RADHI FALLEH
const SUPER_ADMIN = '0df28fa8-aaf5-481b-bfc0-61d109a1f0f3';  // amen benelmaki

// Clients with their contracts and team leaders
const SEEDS = [
  {
    clientId: '4ef0f864-20f0-4a78-a611-e2ba81d3e5d6',       // APAL
    clientName: 'APAL',
    contractId: '1e18855c-9f88-45e1-bc09-b9ee3fd7eb55',
    teamLeaderId: '224f68e4-a4d4-40f0-a0c6-55f70c6edc1a',   // Cyrine Chouk
    donneurId: DONNEUR_ATTIJARI,
    ovStatus: 'VIREMENT_DEPOSE',
    montant: 45230.500,
    bs: 12,
    motif: 'Virement autorisé par service recouvrement',
    demandeRecuperation: false,
    montantRecupere: false,
  },
  {
    clientId: '343c32a7-7bf2-4a1f-a0f2-b5cd5712494c',       // ZOPPAS CADRES
    clientName: 'ZOPPAS CADRES',
    contractId: 'c34ee177-0acb-4760-8d38-f2e55740f0bb',
    teamLeaderId: '12eab8ad-a1dc-4008-81eb-fbff6b2f804b',   // Siwar Ayari
    donneurId: DONNEUR_BTK_COMAR,
    ovStatus: 'BLOQUE',
    montant: 128750.250,
    bs: 34,
    motif: 'Virement bloqué - RIB invalide pour 3 adhérents',
    demandeRecuperation: true,
    montantRecupere: false,
  },
  {
    clientId: '193af8db-e0b8-4e39-a676-dc95d68e6ee7',       // ZOPPAS NON CADRES
    clientName: 'ZOPPAS NON CADRES',
    contractId: '8d07b420-d3da-4d95-91f7-6b8caa978c62',
    teamLeaderId: '12eab8ad-a1dc-4008-81eb-fbff6b2f804b',   // Siwar Ayari
    donneurId: DONNEUR_BTK_COMAR,
    ovStatus: 'EXECUTE',
    montant: 89400.750,
    bs: 28,
    motif: null,
    demandeRecuperation: false,
    montantRecupere: false,
  },
  {
    clientId: '397e7b67-0dcc-41e0-8f3d-3610336c1792',       // CLIENT TEST
    clientName: 'CLIENT TEST',
    contractId: '76a833a1-d4bd-44cc-ad01-21fbaa5a5b04',
    teamLeaderId: '2840bc57-3374-4fff-b789-65941519d79d',   // Ameni Dhrif
    donneurId: DONNEUR_BTK_ASTREE,
    ovStatus: 'REJETE',
    montant: 32100.000,
    bs: 8,
    motif: 'Rejeté - Compte donneur insuffisant',
    demandeRecuperation: true,
    montantRecupere: true,
  },
  {
    clientId: '3e1321ec-105e-4a1c-b5f0-f5bdcae01c32',       // CCA
    clientName: 'CCA',
    contractId: '9f14fe6e-4647-45f5-aa0c-014b0d0e50e2',
    teamLeaderId: '224f68e4-a4d4-40f0-a0c6-55f70c6edc1a',   // Cyrine Chouk
    donneurId: DONNEUR_ATTIJARI,
    ovStatus: 'NON_EXECUTE',
    montant: 67890.300,
    bs: 19,
    motif: null,
    demandeRecuperation: false,
    montantRecupere: false,
  },
  {
    clientId: 'b4075183-4fd3-43c0-a3e1-b59bab43b5d7',       // PGH & FILIALES
    clientName: 'PGH & FILIALES',
    contractId: '97478552-78e2-4d07-b8ba-f8a4ed5bffe5',
    teamLeaderId: '1e1482bb-1e8c-4acb-8a58-3ab08522cd87',   // Mohamed Frad
    donneurId: DONNEUR_BNA,
    ovStatus: 'EN_COURS_EXECUTION',
    montant: 215600.000,
    bs: 56,
    motif: 'En cours de traitement bancaire',
    demandeRecuperation: false,
    montantRecupere: false,
  },
  {
    clientId: '98c59c17-1b21-4a2e-8a96-dbf5a7a6e552',       // NOVARTIS PHARMA
    clientName: 'NOVARTIS PHARMA',
    contractId: '363da345-f966-4b03-abcb-d60b15fdd522',
    teamLeaderId: 'aae9ad38-b8ab-4c78-84c6-b1f86bbdd27c',   // Fatma El Behi
    donneurId: DONNEUR_ATTIJARI,
    ovStatus: 'EXECUTE_PARTIELLEMENT',
    montant: 54320.800,
    bs: 15,
    motif: 'Exécuté partiellement - 2 RIBs rejetés par la banque',
    demandeRecuperation: true,
    montantRecupere: false,
  },
  {
    clientId: 'e5306d23-2b50-4461-81d6-09e9bdd4a5aa',       // HPE
    clientName: 'HPE',
    contractId: '07c26f68-3f00-4569-946f-e097cda135ea',
    teamLeaderId: 'aae9ad38-b8ab-4c78-84c6-b1f86bbdd27c',   // Fatma El Behi
    donneurId: DONNEUR_BTK_ASTREE,
    ovStatus: 'VIREMENT_DEPOSE',
    montant: 98750.500,
    bs: 25,
    motif: 'Validé et déposé',
    demandeRecuperation: false,
    montantRecupere: false,
  },
];

async function main() {
  console.log('🌱 Seeding finance test data...\n');

  let created = 0;
  const now = new Date();

  for (const seed of SEEDS) {
    const refSuffix = `${seed.clientName.replace(/\s+/g, '-').substring(0, 10)}-${Date.now().toString().slice(-5)}`;
    const bordereauRef = `TEST-FIN-${refSuffix}`;
    const ovRef = `OV-2026-TEST-${refSuffix}`;

    // Dates
    const dateReception = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const dateCloture = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);    // 5 days ago
    const dateTraitement = ['EXECUTE', 'REJETE', 'BLOQUE', 'VIREMENT_DEPOSE', 'EXECUTE_PARTIELLEMENT'].includes(seed.ovStatus)
      ? new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      : null;

    try {
      // 1. Create Bordereau with status TRAITE
      const bordereau = await prisma.bordereau.create({
        data: {
          reference: bordereauRef,
          clientId: seed.clientId,
          contractId: seed.contractId,
          dateReception,
          dateCloture,
          delaiReglement: 30,
          statut: 'TRAITE',
          nombreBS: seed.bs,
          scanStatus: 'SCANNE',
          completionRate: 100,
          archived: false,
          priority: 1,
        },
      });

      // 2. Create OrdreVirement linked to bordereau
      const ov = await prisma.ordreVirement.create({
        data: {
          reference: ovRef,
          donneurOrdreId: seed.donneurId,
          bordereauId: bordereau.id,
          utilisateurSante: FINANCE_USER,
          utilisateurFinance: dateTraitement ? FINANCE_USER : null,
          etatVirement: seed.ovStatus,
          montantTotal: seed.montant,
          nombreAdherents: seed.bs,
          dateTraitement,
          dateEtatFinal: dateTraitement,
          motifObservation: seed.motif,
          demandeRecuperation: seed.demandeRecuperation,
          dateDemandeRecuperation: seed.demandeRecuperation
            ? new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
            : null,
          montantRecupere: seed.montantRecupere,
          dateMontantRecupere: seed.montantRecupere ? now : null,
          validationStatus: 'EN_ATTENTE_VALIDATION',
        },
      });

      // 3. Create VirementHistory entry
      await prisma.virementHistory.create({
        data: {
          virementId: ov.id,
          action: 'CREATION',
          previousState: null,
          newState: 'NON_EXECUTE',
          comment: `Créé automatiquement - seed script`,
          userId: FINANCE_USER,
        },
      });

      if (dateTraitement) {
        await prisma.virementHistory.create({
          data: {
            virementId: ov.id,
            action: 'CHANGEMENT_STATUT',
            previousState: 'NON_EXECUTE',
            newState: seed.ovStatus,
            comment: seed.motif || `Statut mis à jour`,
            userId: FINANCE_USER,
          },
        });
      }

      console.log(`✅ ${seed.clientName.padEnd(25)} | Bordereau: ${bordereauRef.padEnd(30)} | OV: ${ovRef.padEnd(30)} | Status: ${seed.ovStatus}`);
      created++;
    } catch (err) {
      console.error(`❌ Failed for ${seed.clientName}:`, err.message);
    }
  }

  console.log(`\n✅ Done! Created ${created}/${SEEDS.length} test records.`);
  console.log('\n📊 Coverage:');
  console.log('  - NON_EXECUTE       → CCA');
  console.log('  - EN_COURS_EXECUTION → PGH & FILIALES');
  console.log('  - EXECUTE_PARTIELLEMENT → NOVARTIS PHARMA');
  console.log('  - EXECUTE           → ZOPPAS NON CADRES');
  console.log('  - REJETE            → CLIENT TEST (with recovery)');
  console.log('  - BLOQUE            → ZOPPAS CADRES (demande récup)');
  console.log('  - VIREMENT_DEPOSE   → APAL + HPE');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
