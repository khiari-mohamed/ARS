const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUTSSDocuments() {
  const bordereau = await prisma.bordereau.findFirst({
    where: { reference: 'U-BULLETIN-2026-72980' },
    include: {
      documents: true,
      client: true,
      contract: true
    }
  });
  
  console.log('\n✅ U-BULLETIN Bordereau:');
  console.log('  Reference:', bordereau.reference);
  console.log('  Client:', bordereau.client.name);
  console.log('  Contract Team Leader ID:', bordereau.contract.teamLeaderId);
  console.log('  Documents count:', bordereau.documents.length);
  console.log('  Documents:', bordereau.documents);
  
  await prisma.$disconnect();
}

checkUTSSDocuments();
