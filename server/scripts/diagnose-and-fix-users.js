/**
 * diagnose-and-fix-users.js
 * Run: node scripts/diagnose-and-fix-users.js
 * Uses DATABASE_URL from .env (or .env.production if NODE_ENV=production)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.production') });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const TARGET_EMAILS = [
  'cyrine.hafaiedh@arstunisie.com',
  'karim.hafaiedh@arstunisie.com',
  'Ameni.mefteh@arstunisie.com',
];

async function main() {
  console.log('=== DATABASE ===');
  console.log('URL:', process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':***@'));
  console.log('');

  // ── 1. Check each target user ──────────────────────────────────────────────
  console.log('=== TARGET USERS DIAGNOSIS ===');
  for (const email of TARGET_EMAILS) {
    // Case-insensitive search
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        active: true,
        createdAt: true,
        department: true,
      },
    });

    if (!user) {
      console.log(`[NOT FOUND]  ${email}`);
    } else {
      const status = user.active ? '[ACTIVE  ]' : '[INACTIVE]';
      console.log(`${status}  ${user.email}`);
      console.log(`            id=${user.id}  role=${user.role}  name="${user.fullName}"  active=${user.active}`);
    }
    console.log('');
  }

  // ── 2. Show all SUPER_ADMIN users ──────────────────────────────────────────
  console.log('=== ALL SUPER_ADMIN USERS (active + inactive) ===');
  const admins = await prisma.user.findMany({
    where: { role: 'SUPER_ADMIN' },
    select: { id: true, email: true, fullName: true, active: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  if (admins.length === 0) {
    console.log('  (none found)');
  } else {
    admins.forEach(u =>
      console.log(`  [${u.active ? 'ACTIVE  ' : 'INACTIVE'}]  ${u.email}  "${u.fullName}"`)
    );
  }
  console.log('');

  // ── 3. Fix: reactivate inactive target users ───────────────────────────────
  console.log('=== FIX: REACTIVATING INACTIVE TARGET USERS ===');
  let fixed = 0;
  for (const email of TARGET_EMAILS) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, active: false },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { active: true },
      });
      console.log(`  ✅ Reactivated: ${user.email}  (id=${user.id})`);
      fixed++;
    } else {
      const exists = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
      });
      if (exists) {
        console.log(`  ℹ️  Already active: ${email}`);
      } else {
        console.log(`  ⚠️  Not found in DB: ${email}  → needs to be created manually via the UI`);
      }
    }
  }
  console.log('');
  console.log(`Fixed ${fixed} user(s).`);

  // ── 4. Final state ─────────────────────────────────────────────────────────
  console.log('');
  console.log('=== FINAL STATE ===');
  for (const email of TARGET_EMAILS) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { email: true, fullName: true, role: true, active: true },
    });
    if (user) {
      console.log(`  [${user.active ? 'ACTIVE  ' : 'INACTIVE'}]  ${user.email}  role=${user.role}`);
    } else {
      console.log(`  [MISSING ]  ${email}`);
    }
  }
}

main()
  .catch(e => { console.error('ERROR:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
