const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDepartmentsData() {
  console.log('🔍 Checking Departments Data for User Management...\n');

  try {
    // 1. Check if Department table exists and has data
    console.log('🏢 DEPARTMENT TABLE:');
    try {
      const departments = await prisma.department.findMany({
        orderBy: { name: 'asc' }
      });
      
      console.log(`Found ${departments.length} departments:`);
      departments.forEach(dept => {
        console.log(`  - ${dept.name} (${dept.code}) - ${dept.serviceType} - Active: ${dept.active}`);
      });
    } catch (error) {
      console.log('❌ Department table does not exist or is empty');
    }

    // 2. Check users and their department field
    console.log('\n👤 USERS AND THEIR DEPARTMENTS:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        role: true,
        department: true,
        departmentId: true
      },
      orderBy: { fullName: 'asc' }
    });

    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`  - ${user.fullName} (${user.role})`);
      console.log(`    Department: ${user.department || 'NULL'}`);
      console.log(`    DepartmentId: ${user.departmentId || 'NULL'}`);
    });

    // 3. Check unique departments from users
    console.log('\n📊 UNIQUE DEPARTMENTS FROM USERS:');
    const uniqueDepartments = [...new Set(users.map(u => u.department).filter(Boolean))];
    console.log(`Found ${uniqueDepartments.length} unique departments:`);
    uniqueDepartments.forEach(dept => {
      const userCount = users.filter(u => u.department === dept).length;
      console.log(`  - ${dept}: ${userCount} users`);
    });

    // 4. Check if there are any team relationships
    console.log('\n👥 TEAM RELATIONSHIPS:');
    const usersWithTeamLeader = await prisma.user.findMany({
      where: { teamLeaderId: { not: null } },
      include: {
        teamLeader: { select: { fullName: true, role: true } }
      }
    });

    console.log(`Found ${usersWithTeamLeader.length} users with team leaders:`);
    usersWithTeamLeader.forEach(user => {
      console.log(`  - ${user.fullName} -> Team Leader: ${user.teamLeader?.fullName} (${user.teamLeader?.role})`);
    });

    // 5. Check TeamStructure table if it exists
    console.log('\n🏗️ TEAM STRUCTURE:');
    try {
      const teamStructures = await prisma.teamStructure.findMany({
        include: {
          leader: { select: { fullName: true } }
        }
      });
      
      console.log(`Found ${teamStructures.length} team structures:`);
      teamStructures.forEach(team => {
        console.log(`  - ${team.name} (${team.serviceType}) - Leader: ${team.leader?.fullName || 'None'}`);
      });
    } catch (error) {
      console.log('❌ TeamStructure table does not exist or is empty');
    }

    // 6. Summary for dropdown options
    console.log('\n📋 SUMMARY FOR DEPARTMENT DROPDOWN:');
    console.log('Available options for department dropdown:');
    
    if (uniqueDepartments.length > 0) {
      console.log('\n✅ From user.department field:');
      uniqueDepartments.forEach(dept => {
        console.log(`  - ${dept}`);
      });
    }

    try {
      const departments = await prisma.department.findMany({
        where: { active: true },
        orderBy: { name: 'asc' }
      });
      
      if (departments.length > 0) {
        console.log('\n✅ From Department table:');
        departments.forEach(dept => {
          console.log(`  - ${dept.name} (${dept.code})`);
        });
      }
    } catch (error) {
      // Department table doesn't exist
    }

    // 7. Recommended API endpoint structure
    console.log('\n🔧 RECOMMENDED API ENDPOINT:');
    console.log('GET /super-admin/departments should return:');
    
    const recommendedStructure = uniqueDepartments.length > 0 
      ? uniqueDepartments.map(dept => ({ id: dept, name: dept, code: dept.toUpperCase() }))
      : [
          { id: 'bureau-ordre', name: "Bureau d'Ordre", code: 'BO' },
          { id: 'scan', name: 'Service SCAN', code: 'SCAN' },
          { id: 'sante', name: 'Équipe Santé', code: 'SANTE' },
          { id: 'finance', name: 'Finance', code: 'FINANCE' },
          { id: 'client', name: 'Service Client', code: 'CLIENT' }
        ];

    console.log(JSON.stringify(recommendedStructure, null, 2));

  } catch (error) {
    console.error('❌ Error checking departments data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDepartmentsData();