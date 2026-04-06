import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserRole() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        fullName: {
          contains: 'Naim Boughanmi'
        }
      },
      select: {
        id: true,
        fullName: true,
        role: true,
        email: true,
        active: true,
        capacity: true
      }
    });

    if (user) {
      console.log('✅ User found:');
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log('❌ User not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserRole();
