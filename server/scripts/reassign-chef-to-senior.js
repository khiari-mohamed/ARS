#!/usr/bin/env node
/**
 * Reassign specific Contract IDs from an old "chef d'equipe" to a
 * "gestionnaire senior", by name.
 *
 * Contract IDs no longer need to be typed in by hand:
 *   --list-contracts              List every contract currently under the
 *                                  old chef (id + clientName) and exit.
 *                                  Use this to find the right IDs.
 *   --client-contains "BTL"       Resolve a contract by matching
 *                                  Contract.clientName (case-insensitive,
 *                                  substring) among contracts currently
 *                                  owned by the old chef. Repeatable.
 *                                  Errors out (no guessing) if a term
 *                                  matches 0 or more than 1 contract.
 *   --contract-id / --contract-ids  Explicit UUID(s), if you already
 *                                  have them. Mutually exclusive with
 *                                  --client-contains.
 *
 * Safety model:
 *   1. DRY RUN is the default. Nothing is written unless --apply is passed.
 *   2. Even with --apply, a "safe to proceed" gate must pass first
 *      (both users found, both contract IDs exist, both currently
 *      belong to the old chef). If the gate fails, apply is refused.
 *   3. The UPDATE only ever touches Contract.teamLeaderId. Before/after
 *      snapshots of the targeted rows are diffed to prove no other
 *      column changed (status, dates, amounts, everything else is
 *      asserted identical). If that assertion fails, the transaction
 *      is rolled back instead of committed.
 *   4. Interactive typed confirmation ("YES") is still required before
 *      the write happens.
 *
 * Usage:
 *   # step 1 -- see what's actually there
 *   node scripts/reassign-chef-to-senior.js --old-name "Mohamed Frad" --list-contracts
 *
 *   # step 2 -- resolve by name, dry run
 *   node scripts/reassign-chef-to-senior.js \
 *     --old-name "Mohamed Frad" --new-name "Jihed Yahyaoui" \
 *     --client-contains "BTL" --client-contains "UTSS"
 *
 *   # step 3 -- once every check is PASS, add --apply
 *   node scripts/reassign-chef-to-senior.js \
 *     --old-name "Mohamed Frad" --new-name "Jihed Yahyaoui" \
 *     --client-contains "BTL" --client-contains "UTSS" --apply
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function parseArgs() {
  const args = {
    apply: false,
    listContracts: false,
    oldName: 'Mohamed Frad',
    newName: 'Jihed Yahyaoui',
    oldRole: 'CHEF_EQUIPE',
    newRole: 'GESTIONNAIRE_SENIOR',
    contractIds: [],
    clientContains: [],
    output: null,
  };

  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--list-contracts') args.listContracts = true;
    else if (arg === '--old-name') args.oldName = process.argv[++i];
    else if (arg === '--new-name') args.newName = process.argv[++i];
    else if (arg === '--old-role') args.oldRole = process.argv[++i];
    else if (arg === '--new-role') args.newRole = process.argv[++i];
    else if (arg === '--client-contains') {
      const value = process.argv[++i];
      if (value) args.clientContains.push(value);
    } else if (arg === '--output' || arg === '--out') {
      args.output = process.argv[++i];
    } else if (arg === '--contract-id') {
      const value = process.argv[++i];
      if (value) args.contractIds.push(value);
    } else if (arg === '--contract-ids') {
      const value = process.argv[++i] || '';
      const ids = value.split(',').map((x) => x.trim()).filter(Boolean);
      args.contractIds.push(...ids);
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Usage:
  # find contracts by eye
  node scripts/reassign-chef-to-senior.js --old-name "Mohamed Frad" --list-contracts

  # resolve by name (recommended -- no hardcoded IDs)
  node scripts/reassign-chef-to-senior.js --old-name "Mohamed Frad" --new-name "Jihed Yahyaoui" --client-contains "BTL" --client-contains "UTSS"

  # or use exact IDs if you already have them
  node scripts/reassign-chef-to-senior.js --old-name "Mohamed Frad" --new-name "Jihed Yahyaoui" --contract-id "id1" --contract-id "id2"

  # write the entire report to a .txt file
  node scripts/reassign-chef-to-senior.js --old-name "Mohamed Frad" --list-contracts --output ./reports/mohamed-frad-contracts.txt

  # add --apply once the dry-run output looks correct
  ... --apply

Default mode is DRY RUN.
This script targets only the resolved/explicitly listed Contract IDs and keeps everything else untouched.
Only Contract.teamLeaderId is ever written. Every other column is verified unchanged after the update.
`);
      process.exit(0);
    }
  }

  return args;
}

function createReportLogger() {
  const lines = [];
  const emit = (msg) => {
    const text = String(msg);
    lines.push(text);
    console.log(text);
  };
  const emitError = (msg) => {
    const text = String(msg);
    lines.push(text);
    console.error(text);
  };
  return { lines, emit, emitError };
}

function writeReportFile(outputPath, lines) {
  if (!outputPath) return;
  const fullPath = path.resolve(outputPath);
  const dir = path.dirname(fullPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, `${lines.join('\n')}\n`, 'utf8');
  console.log(`\nReport saved to: ${fullPath}`);
}

async function getUserByName(client, name, roleFilter) {
  const query = `
    SELECT id, "fullName", role, email, active
    FROM "User"
    WHERE lower("fullName") = lower($1)
      AND lower(role) = lower($2)
    ORDER BY "createdAt" DESC
    LIMIT 1;
  `;
  const result = await client.query(query, [name, roleFilter]);
  if (result.rows[0]) return { user: result.rows[0], roleMismatch: false, otherMatches: [] };

  // Role filter matched nothing -- look up by name alone so the operator
  // can see *why* (wrong role string, inactive user, typo, etc.) instead
  // of just getting a bare "not found".
  const fallback = await client.query(
    `SELECT id, "fullName", role, email, active FROM "User" WHERE lower("fullName") = lower($1) ORDER BY "createdAt" DESC;`,
    [name]
  );
  return { user: null, roleMismatch: fallback.rows.length > 0, otherMatches: fallback.rows };
}

async function listContractsUnderChef(client, oldId) {
  const result = await client.query(
    `SELECT id, "clientName", "clientId", "codeAssure", "createdAt"
     FROM "Contract"
     WHERE "teamLeaderId" = $1
     ORDER BY "clientName";`,
    [oldId]
  );
  return result.rows;
}

// Resolve each --client-contains term to exactly one contract ID, scoped
// to contracts currently owned by the old chef. Refuses to guess.
async function resolveContractIdsByClientName(client, oldId, terms) {
  const resolved = [];
  const errors = [];

  for (const term of terms) {
    const result = await client.query(
      `SELECT id, "clientName" FROM "Contract"
       WHERE "teamLeaderId" = $1 AND "clientName" ILIKE $2
       ORDER BY "clientName";`,
      [oldId, `%${term}%`]
    );

    if (result.rows.length === 0) {
      errors.push(`No contract under the old chef matched clientName containing "${term}".`);
    } else if (result.rows.length > 1) {
      errors.push(
        `Term "${term}" matched ${result.rows.length} contracts (ambiguous, refusing to guess): ` +
          result.rows.map((r) => `${r.id} (${r.clientName})`).join('; ')
      );
    } else {
      resolved.push({ term, id: result.rows[0].id, clientName: result.rows[0].clientName });
    }
  }

  return { resolved, errors };
}

async function inspectTargetContracts(client, oldId, newId, contractIds) {
  const result = await client.query(
    `SELECT c.id,
            c."clientName",
            c."teamLeaderId",
            old_u."fullName" AS current_leader_name,
            CASE WHEN c."teamLeaderId" = $2 THEN true ELSE false END AS already_target_senior,
            CASE WHEN c."teamLeaderId" = $1 THEN true ELSE false END AS currently_old_chef
     FROM "Contract" c
     LEFT JOIN "User" old_u ON old_u.id = c."teamLeaderId"
     WHERE c.id = ANY($3)
     ORDER BY c.id;`,
    [oldId, newId, contractIds]
  );

  return result.rows.map((row) => ({
    contractId: row.id,
    clientName: row.clientName,
    currentTeamLeaderId: row.teamLeaderId,
    currentLeaderName: row.current_leader_name,
    currentlyOldChef: row.currently_old_chef,
    alreadyTargetSenior: row.already_target_senior,
    willChange: row.currently_old_chef && !row.already_target_senior,
  }));
}

async function fetchSummary(client, oldId, contractIds) {
  const checks = [];

  checks.push({
    label: 'Users under old chef (unaffected by this script)',
    sql: `SELECT u.id, u."fullName", u.role, u.email, u."teamLeaderId", leader."fullName" AS team_leader_name
          FROM "User" u
          LEFT JOIN "User" leader ON leader.id = u."teamLeaderId"
          WHERE u."teamLeaderId" = $1
          ORDER BY u."fullName";`,
    params: [oldId],
  });

  checks.push({
    label: 'Team structures led by old chef (unaffected by this script)',
    sql: `SELECT ts.id, ts.name, ts."serviceType", ts."leaderId", leader."fullName" AS leader_name
          FROM "TeamStructure" ts
          LEFT JOIN "User" leader ON leader.id = ts."leaderId"
          WHERE ts."leaderId" = $1
          ORDER BY ts.name;`,
    params: [oldId],
  });

  checks.push({
    label: 'Bordereaux linked to the targeted contracts (unaffected by this script -- status/handlers untouched)',
    sql: `SELECT b.id, b.reference, b.statut, b."clientId", client.name AS client_name, b."contractId",
                 b."teamId", team."fullName" AS team_name, b."currentHandlerId", handler."fullName" AS handler_name,
                 b."assignedToUserId", assignee."fullName" AS assignee_name
          FROM "Bordereau" b
          LEFT JOIN "Client" client ON client.id = b."clientId"
          LEFT JOIN "User" team ON team.id = b."teamId"
          LEFT JOIN "User" handler ON handler.id = b."currentHandlerId"
          LEFT JOIN "User" assignee ON assignee.id = b."assignedToUserId"
          WHERE b."contractId" = ANY($1)
          ORDER BY b.reference;`,
    params: [contractIds],
  });

  checks.push({
    label: 'Documents linked to those bordereaux (unaffected by this script)',
    sql: `SELECT d.id, d.name, d.type, d.status, d."assignedToUserId", assigned."fullName" AS assigned_to_name, b.reference AS bordereau_reference
          FROM "Document" d
          LEFT JOIN "User" assigned ON assigned.id = d."assignedToUserId"
          LEFT JOIN "Bordereau" b ON b.id = d."bordereauId"
          WHERE d."bordereauId" IN (SELECT id FROM "Bordereau" WHERE "contractId" = ANY($1))
          ORDER BY d.name;`,
    params: [contractIds],
  });

  const results = [];
  for (const check of checks) {
    const row = await client.query(check.sql, check.params);
    results.push({ label: check.label, rows: row.rows });
  }
  return results;
}

// Every column that must NOT change when we reassign teamLeaderId.
function diffRows(before, after) {
  const allowedToChange = new Set(['teamLeaderId', 'updatedAt']);
  const diffs = [];
  for (const key of Object.keys(before)) {
    if (allowedToChange.has(key)) continue;
    const b = before[key] instanceof Date ? before[key].toISOString() : before[key];
    const a = after[key] instanceof Date ? after[key].toISOString() : after[key];
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      diffs.push({ column: key, before: before[key], after: after[key] });
    }
  }
  return diffs;
}

function computeSafety({ oldUser, newUser, contractIds, contractDebug }) {
  const checks = [];

  checks.push({ name: 'Old chef found', pass: !!oldUser });
  checks.push({ name: 'Target senior found', pass: !!newUser });
  checks.push({
    name: 'Old chef and target senior are different users',
    pass: !!(oldUser && newUser && oldUser.id !== newUser.id),
  });
  checks.push({
    name: 'All target contract IDs exist',
    pass: contractDebug.length === contractIds.length,
    detail: contractDebug.length !== contractIds.length
      ? `Requested ${contractIds.length} contract ID(s), found ${contractDebug.length} in DB.`
      : undefined,
  });
  checks.push({
    name: 'All target contracts currently belong to old chef',
    pass: contractDebug.length > 0 && contractDebug.every((c) => c.currentlyOldChef),
    detail: contractDebug.filter((c) => !c.currentlyOldChef).map((c) => c.contractId).join(', ') || undefined,
  });

  const safe = checks.every((c) => c.pass);
  return { safe, checks };
}

async function applyReassignment(client, oldId, newId, contractIds) {
  await client.query('BEGIN');
  try {
    const before = await client.query(`SELECT * FROM "Contract" WHERE id = ANY($1) ORDER BY id;`, [contractIds]);

    const updateResult = await client.query(
      `UPDATE "Contract"
       SET "teamLeaderId" = $2
       WHERE "teamLeaderId" = $1
         AND id = ANY($3);`,
      [oldId, newId, contractIds]
    );

    if (updateResult.rowCount !== contractIds.length) {
      throw new Error(
        `Expected to update exactly ${contractIds.length} contract(s), but ${updateResult.rowCount} matched. Rolling back.`
      );
    }

    const after = await client.query(`SELECT * FROM "Contract" WHERE id = ANY($1) ORDER BY id;`, [contractIds]);

    const afterById = new Map(after.rows.map((r) => [r.id, r]));
    const allDiffs = [];
    for (const beforeRow of before.rows) {
      const afterRow = afterById.get(beforeRow.id);
      const diffs = diffRows(beforeRow, afterRow);
      if (diffs.length) allDiffs.push({ contractId: beforeRow.id, diffs });
      if (afterRow.teamLeaderId !== newId) {
        throw new Error(`Contract ${beforeRow.id} did not end up with teamLeaderId=${newId}. Rolling back.`);
      }
    }

    if (allDiffs.length) {
      throw new Error(
        `Unexpected column changes detected outside teamLeaderId/updatedAt: ${JSON.stringify(allDiffs)}. Rolling back.`
      );
    }

    await client.query('COMMIT');
    return {
      label: 'Contract teamLeaderId update',
      rowCount: updateResult.rowCount,
      verified: 'All other columns confirmed unchanged for every targeted contract.',
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

(async () => {
  const args = parseArgs();
  const connectionString = process.env.DATABASE_URL;
  const report = createReportLogger();

  if (!connectionString) {
    report.emitError('ERROR: DATABASE_URL is not set. Example:');
    report.emitError('export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@10.34.60.63:5432/ars_db"');
    writeReportFile(args.output, report.lines);
    process.exit(1);
  }

  if (args.contractIds.length > 0 && args.clientContains.length > 0) {
    report.emitError('ERROR: Use either --contract-id/--contract-ids OR --client-contains, not both.');
    writeReportFile(args.output, report.lines);
    process.exit(1);
  }

  if (!args.listContracts && args.contractIds.length === 0 && args.clientContains.length === 0) {
    report.emitError('ERROR: No target supplied. Use --list-contracts to find IDs, --client-contains "term" to resolve by name, or --contract-id for exact UUIDs.');
    writeReportFile(args.output, report.lines);
    process.exit(1);
  }

  const client = new Client({ connectionString });
  try {
    await client.connect();

    const oldLookup = await getUserByName(client, args.oldName, args.oldRole);
    const oldUser = oldLookup.user;

    if (!oldUser) {
      report.emitError(`ERROR: Old chef not found with name="${args.oldName}" role="${args.oldRole}".`);
      if (oldLookup.roleMismatch) {
        report.emitError('A user with that name exists but not with that role. Found:');
        report.emitError(JSON.stringify(oldLookup.otherMatches, null, 2));
        report.emitError('Re-run with --old-role "<actual role>" if this is the right person.');
      }
      writeReportFile(args.output, report.lines);
      process.exit(1);
    }

    if (args.listContracts) {
      const contracts = await listContractsUnderChef(client, oldUser.id);
      report.emit(`Contracts currently under "${oldUser.fullName}" (${contracts.length}):`);
      report.emit(JSON.stringify(contracts, null, 2));
      writeReportFile(args.output, report.lines);
      return;
    }

    const newLookup = await getUserByName(client, args.newName, args.newRole);
    const newUser = newLookup.user;

    if (!newUser) {
      report.emitError(`ERROR: Target senior not found with name="${args.newName}" role="${args.newRole}".`);
      if (newLookup.roleMismatch) {
        report.emitError('A user with that name exists but not with that role. Found:');
        report.emitError(JSON.stringify(newLookup.otherMatches, null, 2));
        report.emitError('Re-run with --new-role "<actual role>" if this is the right person.');
      }
      writeReportFile(args.output, report.lines);
      process.exit(1);
    }

    // Resolve contract IDs -- either by name (preferred) or explicit IDs.
    let contractIds = args.contractIds;
    if (args.clientContains.length > 0) {
      const { resolved, errors } = await resolveContractIdsByClientName(client, oldUser.id, args.clientContains);
      report.emit('=== Contract name resolution ===');
      report.emit(JSON.stringify(resolved, null, 2));
      if (errors.length) {
        report.emitError('\nERROR: could not unambiguously resolve every --client-contains term:');
        errors.forEach((e) => report.emitError(' - ' + e));
        writeReportFile(args.output, report.lines);
        process.exit(1);
      }
      contractIds = resolved.map((r) => r.id);
    }

    report.emit('\n=== Dry-run check ===');
    report.emit('Old chef: ' + JSON.stringify({ id: oldUser.id, fullName: oldUser.fullName, role: oldUser.role, email: oldUser.email, active: oldUser.active }, null, 2));
    report.emit('Target senior: ' + JSON.stringify({ id: newUser.id, fullName: newUser.fullName, role: newUser.role, email: newUser.email, active: newUser.active }, null, 2));
    report.emit('Resolved target contract IDs: ' + JSON.stringify(contractIds, null, 2));

    const contractDebug = await inspectTargetContracts(client, oldUser.id, newUser.id, contractIds);
    report.emit('\n## Contract-by-contract debug');
    report.emit(JSON.stringify(contractDebug, null, 2));

    const summary = await fetchSummary(client, oldUser.id, contractIds);
    for (const item of summary) {
      report.emit(`\n## ${item.label}`);
      report.emit(item.rows.length ? JSON.stringify(item.rows, null, 2) : 'No rows found.');
    }

    const safety = computeSafety({ oldUser, newUser, contractIds, contractDebug });
    report.emit('\n=== SAFE TO PROCEED? ===');
    for (const c of safety.checks) {
      report.emit(`[${c.pass ? 'PASS' : 'FAIL'}] ${c.name}${c.detail ? ` -- ${c.detail}` : ''}`);
    }
    report.emit(safety.safe ? '\nRESULT: SAFE TO PROCEED = YES' : '\nRESULT: SAFE TO PROCEED = NO');

    if (!args.apply) {
      report.emit('\nDRY RUN ONLY: nothing was modified.');
      report.emit('Only Contract.teamLeaderId would be written for the resolved IDs above; every other table/column stays untouched.');
      writeReportFile(args.output, report.lines);
      return;
    }

    if (!safety.safe) {
      report.emitError('\nERROR: --apply was requested but the safety checks did not all pass. Refusing to write. See FAIL lines above.');
      writeReportFile(args.output, report.lines);
      process.exit(1);
    }

    const confirm = await new Promise((resolve) => {
      const stdin = process.stdin;
      const stdout = process.stdout;
      stdout.write(`\nThis will reassign exactly ${contractIds.length} contract(s) from "${oldUser.fullName}" to "${newUser.fullName}". Only teamLeaderId changes; all other columns are verified unchanged. Type YES to continue: `);
      stdin.setEncoding('utf8');
      stdin.once('data', (chunk) => resolve(String(chunk).trim() === 'YES'));
    });

    if (!confirm) {
      report.emit('Aborted. No changes were applied.');
      writeReportFile(args.output, report.lines);
      return;
    }

    const applied = await applyReassignment(client, oldUser.id, newUser.id, contractIds);
    report.emit('\n=== Applied changes ===');
    report.emit(JSON.stringify(applied, null, 2));
    report.emit('\nOnly the targeted contract IDs were reassigned; every other column on those rows, and every other table, remains unchanged.');
    writeReportFile(args.output, report.lines);
  } catch (error) {
    report.emitError('ERROR: ' + String(error));
    writeReportFile(args.output, report.lines);
    process.exit(1);
  } finally {
    await client.end();
  }
})();