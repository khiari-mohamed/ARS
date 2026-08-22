const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const NEW_PASSWORD = 'Azerty123@';
const OUTPUT_FILE = path.join(__dirname, 'users-report.txt');

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true },
    orderBy: { role: 'asc' },
  });

  console.log(`Found ${users.length} users. Updating passwords...`);

  const hashed = await bcrypt.hash(NEW_PASSWORD, 10);

  await prisma.user.updateMany({ data: { password: hashed } });

  console.log('All passwords updated successfully.');

  const lines = [
    `Password Reset Report — ${new Date().toISOString()}`,
    `New password: ${NEW_PASSWORD}`,
    `Total users: ${users.length}`,
    '='.repeat(60),
    '',
    ...users.map(u => `Name:  ${u.fullName}\nEmail: ${u.email}\nRole:  ${u.role}\n${'-'.repeat(40)}`),
  ];

  fs.writeFileSync(OUTPUT_FILE, lines.join('\n'), 'utf8');
  console.log(`Report written to: ${OUTPUT_FILE}`);

  users.forEach(u => console.log(`  [${u.role}] ${u.fullName} <${u.email}>`));
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
