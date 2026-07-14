const path = require('path');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

require('dotenv').config({
  path: path.resolve(__dirname, '..', '.env'),
});

const prisma = new PrismaClient();
const targetEmails = [
  'Cyrine.hafaiedh@arstunisie.com',
  'Karim.hafaiedh@arstunisie.com',
];
const newPassword = '@Rs2025+';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not defined. Make sure the server .env file exists and contains it.');
    process.exit(1);
  }

  console.log('🔐 Updating passwords for target users...');
  console.log(`📡 Database: ${process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@')}`);

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  for (const email of targetEmails) {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const user = await prisma.user.findFirst({
        where: {
          email: {
            equals: normalizedEmail,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      });

      if (!user) {
        console.log(`⚪ No user found for ${email}`);
        continue;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      console.log(`✅ Updated password for ${user.email} (${user.fullName || 'No name'})`);
    } catch (error) {
      console.error(`❌ Failed to update ${email}: ${error.message}`);
    }
  }

  console.log('🎉 Password update process completed.');
}

main()
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
