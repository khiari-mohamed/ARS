const { PrismaClient } = require('./server/node_modules/@prisma/client');

const prisma = new PrismaClient();

async function checkDepartments() {
  try {
    console.log('🔍 Checking departments in database...\n');
    
    // Get departments from Department table
    const departments = await prisma.department.findMany({
      include: {
        users: {
          where: { active: true }
        }
      }
    });
    
    console.log('🏢 DEPARTMENTS FROM TABLE:');
    departments.forEach(dept => {
      console.log(`  ${dept.name} (${dept.code}): ${dept.users.length} users`);
      console.log(`    Service Type: ${dept.serviceType}`);
      console.log(`    Description: ${dept.description}`);
      console.log('');
    });
    
    console.log(`📊 TOTAL DEPARTMENTS: ${departments.length}`);
    console.log(`📊 TOTAL USERS IN DEPARTMENTS: ${departments.reduce((sum, d) => sum + d.users.length, 0)}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDepartments();