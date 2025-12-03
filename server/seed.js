const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  const hashedPassword = await bcrypt.hash('Password123@', 10);

  const users = [
    { email: 'admin@ars.tn', fullName: 'Super Admin', role: 'SUPER_ADMIN' },
    { email: 'chef.sante@ars.tn', fullName: 'Chef Santé', role: 'CHEF_EQUIPE' },
    { email: 'chef.finance@ars.tn', fullName: 'Chef Finance', role: 'RESPONSABLE_DEPARTEMENT' },
    { email: 'senior1@ars.tn', fullName: 'Gestionnaire Senior 1', role: 'GESTIONNAIRE_SENIOR' },
    { email: 'senior2@ars.tn', fullName: 'Gestionnaire Senior 2', role: 'GESTIONNAIRE_SENIOR' },
    { email: 'gestionnaire1@ars.tn', fullName: 'Gestionnaire 1', role: 'GESTIONNAIRE' },
    { email: 'gestionnaire2@ars.tn', fullName: 'Gestionnaire 2', role: 'GESTIONNAIRE' },
    { email: 'gestionnaire3@ars.tn', fullName: 'Gestionnaire 3', role: 'GESTIONNAIRE' },
    { email: 'gestionnaire4@ars.tn', fullName: 'Gestionnaire 4', role: 'GESTIONNAIRE' },
    { email: 'gestionnaire5@ars.tn', fullName: 'Gestionnaire 5', role: 'GESTIONNAIRE' },
    { email: 'bo@ars.tn', fullName: 'Bureau Ordre', role: 'BUREAU_ORDRE' },
    { email: 'scan@ars.tn', fullName: 'Service Scan', role: 'SCAN' },
    { email: 'finance@ars.tn', fullName: 'Service Finance', role: 'FINANCE' },
  ];

  console.log('👥 Creating users...');
  const createdUsers = [];
  for (const userData of users) {
    const user = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        active: true,
      },
    });
    createdUsers.push(user);
    console.log(`✅ Created user: ${user.email}`);
  }

  const chefEquipe = createdUsers.find(u => u.role === 'CHEF_EQUIPE');

  console.log('🏢 Creating client...');
  const client = await prisma.client.create({
    data: {
      name: 'STAR Assurances',
      email: 'contact@star.tn',
      phone: '71234567',
      address: 'Tunis, Tunisia',
      reglementDelay: 30,
      reclamationDelay: 15,
    },
  });
  console.log(`✅ Created client: ${client.name}`);

  console.log('📄 Creating contract...');
  const contract = await prisma.contract.create({
    data: {
      clientId: client.id,
      clientName: client.name,
      teamLeaderId: chefEquipe.id,
      documentPath: '',
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      delaiReclamation: 15,
      delaiReglement: 30,
    },
  });
  console.log(`✅ Created contract`);

  console.log('📋 Creating 10 bordereaux...');
  for (let i = 1; i <= 10; i++) {
    const bordereau = await prisma.bordereau.create({
      data: {
        reference: `BDX-2025-${String(i).padStart(5, '0')}`,
        clientId: client.id,
        contractId: contract.id,
        dateReception: new Date(),
        statut: 'TRAITE',
        nombreBS: Math.floor(Math.random() * 50) + 10,
        delaiReglement: 30,
        dateCloture: new Date(),
        completionRate: 100,
        priority: 1,
        archived: false,
      },
    });
    console.log(`✅ Created bordereau: ${bordereau.reference}`);
  }

  console.log('✅ Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
