import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseClientAccess() {
  console.log('🔍 CLIENT ACCESS DIAGNOSTIC SCRIPT\n');
  console.log('=' .repeat(80));
  
  // 1. Get all clients
  const allClients = await prisma.client.findMany({
    include: {
      chargeCompte: true,
      gestionnaires: true,
      compagnieAssurance: true
    }
  });
  
  console.log(`\n📊 TOTAL CLIENTS IN DATABASE: ${allClients.length}\n`);
  
  // 2. Get all users
  const allUsers = await prisma.user.findMany({
    where: {
      role: { in: ['CHEF_EQUIPE', 'GESTIONNAIRE', 'SUPER_ADMIN', 'FINANCE'] }
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true
    }
  });
  
  console.log(`\n👥 USERS BY ROLE:\n`);
  const usersByRole = allUsers.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(usersByRole).forEach(([role, count]) => {
    console.log(`   ${role}: ${count} user(s)`);
  });
  
  // 3. Analyze client assignments
  console.log(`\n\n📋 CLIENT ASSIGNMENTS:\n`);
  console.log('=' .repeat(80));
  
  for (const client of allClients) {
    console.log(`\n🏢 Client: ${client.name}`);
    console.log(`   ID: ${client.id}`);
    console.log(`   Compagnie: ${client.compagnieAssurance?.nom || 'N/A'}`);
    console.log(`   Chef d'Équipe (chargeCompte): ${client.chargeCompte?.fullName || 'NONE'} ${client.chargeCompte ? `(${client.chargeCompte.email})` : ''}`);
    console.log(`   Gestionnaires: ${client.gestionnaires.length > 0 ? client.gestionnaires.map(g => `${g.fullName} (${g.email})`).join(', ') : 'NONE'}`);
  }
  
  // 4. Show what each user can see
  console.log(`\n\n👁️  ACCESS MATRIX (What each user can see):\n`);
  console.log('=' .repeat(80));
  
  for (const user of allUsers) {
    console.log(`\n👤 ${user.fullName} (${user.role})`);
    console.log(`   Email: ${user.email}`);
    
    if (user.role === 'SUPER_ADMIN' || user.role === 'FINANCE') {
      console.log(`   ✅ Can see ALL ${allClients.length} clients (SUPER_ADMIN/FINANCE privilege)`);
    } else if (user.role === 'CHEF_EQUIPE' || user.role === 'GESTIONNAIRE') {
      // Check which clients this user is assigned to
      const assignedClients = allClients.filter(client => 
        client.gestionnaires.some(g => g.id === user.id)
      );
      
      console.log(`   📊 Can see ${assignedClients.length} client(s):`);
      if (assignedClients.length > 0) {
        assignedClients.forEach(client => {
          console.log(`      - ${client.name}`);
        });
      } else {
        console.log(`      ⚠️  NO CLIENTS ASSIGNED - This user will see 0 clients in dropdown!`);
      }
    }
  }
  
  // 5. Recommendations
  console.log(`\n\n💡 RECOMMENDATIONS:\n`);
  console.log('=' .repeat(80));
  
  const chefEquipeUsers = allUsers.filter(u => u.role === 'CHEF_EQUIPE');
  const gestionnaireUsers = allUsers.filter(u => u.role === 'GESTIONNAIRE');
  
  for (const user of [...chefEquipeUsers, ...gestionnaireUsers]) {
    const assignedClients = allClients.filter(client => 
      client.gestionnaires.some(g => g.id === user.id)
    );
    
    if (assignedClients.length === 0) {
      console.log(`\n⚠️  ${user.fullName} (${user.role}) has NO clients assigned!`);
      console.log(`   To fix, run one of these SQL commands:\n`);
      
      // Show SQL to assign clients
      allClients.slice(0, 3).forEach(client => {
        console.log(`   -- Assign "${client.name}" to ${user.fullName}:`);
        console.log(`   INSERT INTO "_ClientGestionnaires" ("A", "B") VALUES ('${client.id}', '${user.id}');`);
      });
    }
  }
  
  // 6. Generate SQL fix script
  console.log(`\n\n🔧 AUTO-FIX SQL SCRIPT:\n`);
  console.log('=' .repeat(80));
  console.log(`-- Run this SQL to assign ALL clients to ALL Chef d'Équipe users:\n`);
  
  for (const user of chefEquipeUsers) {
    const assignedClients = allClients.filter(client => 
      client.gestionnaires.some(g => g.id === user.id)
    );
    
    if (assignedClients.length === 0) {
      console.log(`-- Assign all clients to ${user.fullName}:`);
      allClients.forEach(client => {
        console.log(`INSERT INTO "_ClientGestionnaires" ("A", "B") VALUES ('${client.id}', '${user.id}') ON CONFLICT DO NOTHING;`);
      });
      console.log('');
    }
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('✅ DIAGNOSTIC COMPLETE\n');
}

diagnoseClientAccess()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
