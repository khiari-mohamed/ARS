const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const adherent = await prisma.adherent.findFirst({
    where: { matricule: '100004' },
    include: { client: true }
  });

  console.log('Adherent 100004:');
  console.log('  RIB:', adherent?.rib);
  console.log('  Code Assuré:', adherent?.codeAssure);
  console.log('  Nom:', adherent?.nom);
  console.log('  Client:', adherent?.client?.name);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
