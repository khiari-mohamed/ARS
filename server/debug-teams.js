const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugTeams() {
  try {
    console.log('🔍 Debugging Teams Database...\n');

    // Check users by role
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
      where: { active: true }
    });

    console.log('👥 Active users by role:');
    usersByRole.forEach(r => {
      console.log(`  ${r.role}: ${r._count.role} users`);
    });

    // Check existing team configs
    const teamConfigs = await prisma.teamWorkloadConfig.findMany({
      orderBy: { teamId: 'asc' }
    });

    console.log(`\n⚙️ Existing team configurations: ${teamConfigs.length}`);
    teamConfigs.forEach(config => {
      console.log(`  ${config.teamId}: maxLoad=${config.maxLoad}, autoReassign=${config.autoReassignEnabled}, overflow=${config.overflowAction}`);
    });

    // If no configs, create defaults
    if (teamConfigs.length === 0) {
      console.log('\n💡 Creating default team configurations...');
      
      const defaultConfigs = [
        {
          teamId: 'CHEF_EQUIPE',
          maxLoad: 50,
          autoReassignEnabled: true,
          overflowAction: 'ROUND_ROBIN',
          alertThreshold: 40
        },
        {
          teamId: 'GESTIONNAIRE',
          maxLoad: 20,
          autoReassignEnabled: true,
          overflowAction: 'LOWEST_LOAD',
          alertThreshold: 16
        },
        {
          teamId: 'SCAN_TEAM',
          maxLoad: 100,
          autoReassignEnabled: false,
          overflowAction: 'CAPACITY_BASED',
          alertThreshold: 80
        },
        {
          teamId: 'BO',
          maxLoad: 30,
          autoReassignEnabled: true,
          overflowAction: 'ROUND_ROBIN',
          alertThreshold: 24
        },
        {
          teamId: 'FINANCE',
          maxLoad: 25,
          autoReassignEnabled: true,
          overflowAction: 'LOWEST_LOAD',
          alertThreshold: 20
        }
      ];

      for (const config of defaultConfigs) {
        await prisma.teamWorkloadConfig.create({ data: config });
        console.log(`✅ Created config for: ${config.teamId}`);
      }
      
      console.log('\n🎉 Default team configurations created!');
    }

    // Show team workload status
    console.log('\n📊 Team workload status:');
    const roles = ['CHEF_EQUIPE', 'GESTIONNAIRE', 'SCAN_TEAM', 'BO', 'FINANCE'];
    
    for (const role of roles) {
      const users = await prisma.user.findMany({
        where: {
          role: role,
          active: true
        },
        include: {
          ownerBulletinSoins: {
            where: { etat: { in: ['IN_PROGRESS', 'ASSIGNED'] } }
          }
        }
      });

      if (users.length > 0) {
        const totalLoad = users.reduce((sum, user) => sum + user.ownerBulletinSoins.length, 0);
        const totalCapacity = users.reduce((sum, user) => sum + user.capacity, 0);
        const avgLoad = users.length > 0 ? totalLoad / users.length : 0;
        
        console.log(`\n  ${role}:`);
        console.log(`    Members: ${users.length}`);
        console.log(`    Total Load: ${totalLoad}`);
        console.log(`    Total Capacity: ${totalCapacity}`);
        console.log(`    Average Load: ${avgLoad.toFixed(1)}`);
        console.log(`    Utilization: ${totalCapacity > 0 ? ((totalLoad / totalCapacity) * 100).toFixed(1) : 0}%`);
        
        users.forEach(user => {
          const utilization = user.capacity > 0 ? ((user.ownerBulletinSoins.length / user.capacity) * 100).toFixed(1) : 0;
          console.log(`      ${user.fullName}: ${user.ownerBulletinSoins.length}/${user.capacity} (${utilization}%)`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTeams();