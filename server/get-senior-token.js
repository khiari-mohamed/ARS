const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function getSeniorToken() {
  try {
    const senior = await prisma.user.findFirst({
      where: { 
        role: 'GESTIONNAIRE_SENIOR',
        fullName: 'Sonia Bouaicha'
      }
    });

    if (!senior) {
      console.log('❌ No Sonia Bouaicha found');
      return;
    }

    console.log('✅ Found senior:', senior.fullName, '- ID:', senior.id);

    const token = jwt.sign(
      { id: senior.id, email: senior.email, role: senior.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log('\n📋 TOKEN FOR POSTMAN:\n');
    console.log(token);
    console.log('\n\n🔗 Use in Postman:');
    console.log('Authorization: Bearer ' + token);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getSeniorToken();
