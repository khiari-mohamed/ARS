/**
 * check-gestionnaire-assignments.js
 *
 * Audits every non-archived bordereau's assignment fields against what the
 * frontend's "Gestionnaire" column logic would actually render, and flags
 * every mismatch/drift case.
 *
 * USAGE (run from D:\ARS\server, where @prisma/client is already generated):
 *   node check-gestionnaire-assignments.js
 *
 * Or restrict to one client / reference for a quick spot-check:
 *   node check-gestionnaire-assignments.js --client "POULINA GROUP HOLDING"
 *   node check-gestionnaire-assignments.js --ref "SE 05-2026"
 *
 * No writes are performed — read-only report.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ---- CLI args -------------------------------------------------------------
const args = process.argv.slice(2);
function argVal(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}
const clientFilter = argVal('--client');
const refFilter = argVal('--ref');

// ---- Mirrors the assignment source priority used by the dashboard ---------
function frontendDisplay(bordereau) {
  if (bordereau.assignedToUser &&
      ['GESTIONNAIRE', 'GESTIONNAIRE_SENIOR'].includes(bordereau.assignedToUser.role)) {
    return {
      shown: true,
      label: bordereau.assignedToUser.fullName,
      source: 'assignedToUser',
    };
  }
  if (bordereau.contract?.teamLeader?.role === 'GESTIONNAIRE_SENIOR') {
    return {
      shown: true,
      label: bordereau.contract.teamLeader.fullName,
      source: 'contract.teamLeader',
    };
  }
  return { shown: false, label: 'Non assigné', source: null };
}

async function main() {
  const where = { archived: false };
  if (clientFilter) where.client = { name: { contains: clientFilter, mode: 'insensitive' } };
  if (refFilter) where.reference = { contains: refFilter, mode: 'insensitive' };

  const bordereaux = await prisma.bordereau.findMany({
    where,
    select: {
      id: true,
      reference: true,
      statut: true,
      assignedToUserId: true,
      currentHandlerId: true,
      chargeCompteId: true,
      contractId: true,
      client: { select: { name: true } },
      currentHandler: { select: { id: true, fullName: true, role: true, active: true } },
      chargeCompte: { select: { id: true, fullName: true, role: true, active: true } },
      // Client-level charge de compte is a valid fallback assignment source.
      client: {
        select: {
          name: true,
          chargeCompte: { select: { id: true, fullName: true, role: true, active: true } },
        },
      },
      contract: {
        select: {
          id: true,
          teamLeaderId: true,
          assignedManagerId: true,
          teamLeader: { select: { id: true, fullName: true, role: true, active: true } },
          assignedManager: { select: { id: true, fullName: true, role: true, active: true } },
        },
      },
    },
    orderBy: { dateReception: 'desc' },
  });

  const assignedUserIds = [...new Set(bordereaux.map((b) => b.assignedToUserId).filter(Boolean))];
  const assignedUsers = await prisma.user.findMany({
    where: { id: { in: assignedUserIds } },
    select: { id: true, fullName: true, role: true, active: true },
  });
  const assignedUsersById = new Map(assignedUsers.map((user) => [user.id, user]));
  bordereaux.forEach((bordereau) => {
    bordereau.assignedToUser = bordereau.assignedToUserId
      ? assignedUsersById.get(bordereau.assignedToUserId) || null
      : null;
  });

  console.log(`\nTotal non-archived bordereaux checked: ${bordereaux.length}\n`);

  const problems = {
    // assignedToUserId is set (a real assignment exists) but frontend shows "Non assigné"
    assignedButHiddenFromUI: [],
    // assignedToUserId set, currentHandlerId set, but the two differ (drift between the two FKs)
    driftAssignedVsHandler: [],
    // assignedToUserId set but currentHandlerId is NULL (the exact bug pattern reported)
    handlerNeverSynced: [],
    // currentHandlerId points to a user whose role is not GESTIONNAIRE/GESTIONNAIRE_SENIOR
    // (e.g. assigned to a CHEF_EQUIPE) -> frontend logic hides it too
    handlerWrongRole: [],
    // currentHandlerId (or assignedToUserId) points to a user that no longer exists / is inactive
    danglingOrInactiveHandler: [],
    // GESTIONNAIRE_SENIOR-managed contract (teamLeader.role === GESTIONNAIRE_SENIOR)
    // but contract.assignedManagerId is not set to that same senior -> frontend won't
    // pick it up via contract.assignedManager path
    seniorContractNotReflectedAsManager: [],
    clientManagerOnly: [],
  };

  let trulyUnassignedCount = 0;
  let correctlyShownCount = 0;

  for (const b of bordereaux) {
    const display = frontendDisplay(b);
    const clientChargeCompte = b.client?.chargeCompte;
    const hasRealAssignment = !!(
      b.assignedToUserId ||
      b.currentHandlerId ||
      b.chargeCompteId ||
      b.contract?.assignedManagerId ||
      clientChargeCompte
    );

    if (!hasRealAssignment) {
      trulyUnassignedCount++;
      continue; // genuinely unassigned, nothing to flag
    }

    if (display.shown) {
      correctlyShownCount++;
    }

    // 1) assignedToUserId set but UI shows "Non assigné"
    if (hasRealAssignment && !display.shown) {
      problems.assignedButHiddenFromUI.push({
        reference: b.reference,
        client: b.client?.name,
        statut: b.statut,
        assignedToUserId: b.assignedToUserId,
        currentHandlerId: b.currentHandlerId,
      });
    }

    // 2) assignedToUserId set but currentHandlerId never synced (NULL)
    if (b.assignedToUserId && !b.currentHandlerId) {
      problems.handlerNeverSynced.push({
        reference: b.reference,
        client: b.client?.name,
        statut: b.statut,
        assignedToUserId: b.assignedToUserId,
      });
    }

    // 3) assignedToUserId and currentHandlerId both set but different (drift)
    if (b.assignedToUserId && b.currentHandlerId && b.assignedToUserId !== b.currentHandlerId) {
      problems.driftAssignedVsHandler.push({
        reference: b.reference,
        client: b.client?.name,
        statut: b.statut,
        assignedToUserId: b.assignedToUserId,
        currentHandlerId: b.currentHandlerId,
      });
    }

    // 4) currentHandler exists but role isn't GESTIONNAIRE/GESTIONNAIRE_SENIOR
    if (b.currentHandler && !['GESTIONNAIRE', 'GESTIONNAIRE_SENIOR'].includes(b.currentHandler.role)) {
      problems.handlerWrongRole.push({
        reference: b.reference,
        client: b.client?.name,
        statut: b.statut,
        currentHandlerId: b.currentHandlerId,
        currentHandlerRole: b.currentHandler.role,
        currentHandlerName: b.currentHandler.fullName,
      });
    }

    // 5) dangling / inactive handler
    if (b.assignedToUserId && !b.currentHandler) {
      problems.danglingOrInactiveHandler.push({
        reference: b.reference,
        client: b.client?.name,
        statut: b.statut,
        assignedToUserId: b.assignedToUserId,
        note: 'assignedToUserId set but no matching currentHandler user resolved (deleted user, or currentHandlerId null/stale)',
      });
    } else if (b.currentHandler && b.currentHandler.active === false) {
      problems.danglingOrInactiveHandler.push({
        reference: b.reference,
        client: b.client?.name,
        statut: b.statut,
        currentHandlerId: b.currentHandlerId,
        note: `currentHandler ${b.currentHandler.fullName} is inactive`,
      });
    }

    if (!b.assignedToUserId && !b.currentHandlerId && !b.chargeCompteId && !b.contract?.assignedManagerId && clientChargeCompte) {
      problems.clientManagerOnly.push({
        reference: b.reference,
        client: b.client?.name,
        statut: b.statut,
        clientChargeCompteId: clientChargeCompte.id,
        clientChargeCompteName: clientChargeCompte.fullName,
      });
    }

    // 6) Senior-managed contract not reflected via assignedManager
    if (
      b.contract?.teamLeader?.role === 'GESTIONNAIRE_SENIOR' &&
      b.contract.assignedManagerId !== b.contract.teamLeaderId
    ) {
      problems.seniorContractNotReflectedAsManager.push({
        reference: b.reference,
        client: b.client?.name,
        statut: b.statut,
        contractId: b.contractId,
        teamLeaderId: b.contract.teamLeaderId,
        teamLeaderName: b.contract.teamLeader.fullName,
        assignedManagerId: b.contract.assignedManagerId,
      });
    }
  }

  // ---- Report ---------------------------------------------------------
  const printSection = (title, list) => {
    console.log(`\n=== ${title} (${list.length}) ===`);
    if (list.length === 0) {
      console.log('  none');
      return;
    }
    list.slice(0, 50).forEach((row) => console.log(' ', JSON.stringify(row)));
    if (list.length > 50) console.log(`  ...and ${list.length - 50} more`);
  };

  console.log('==================== SUMMARY ====================');
  console.log(`Truly unassigned (no assignedToUserId, no contract manager): ${trulyUnassignedCount}`);
  console.log(`Correctly showing a gestionnaire in the UI:                  ${correctlyShownCount}`);
  console.log(`Assigned in DB but hidden by UI ("Non assigné" wrongly):     ${problems.assignedButHiddenFromUI.length}`);
  console.log('==================================================');

  printSection('1) assignedToUserId set but UI would show "Non assigné"', problems.assignedButHiddenFromUI);
  printSection('2) currentHandlerId never synced (root cause pattern)', problems.handlerNeverSynced);
  printSection('3) assignedToUserId vs currentHandlerId drift (two different users)', problems.driftAssignedVsHandler);
  printSection('4) currentHandler role is not GESTIONNAIRE/GESTIONNAIRE_SENIOR (e.g. CHEF_EQUIPE)', problems.handlerWrongRole);
  printSection('5) dangling or inactive handler user', problems.danglingOrInactiveHandler);
  printSection('6) Senior-managed contract not reflected as contract.assignedManager', problems.seniorContractNotReflectedAsManager);
  printSection('7) Client has a charge de compte but bordereau has no direct assignment', problems.clientManagerOnly);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Script failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});