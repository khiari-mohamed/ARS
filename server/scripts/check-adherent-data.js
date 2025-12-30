const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdherents() {
  const adherents = await prisma.adherent.findMany({
    include: { client: true }
  });

  console.log(`Total adherents: ${adherents.length}\n`);
  
  adherents.forEach(a => {
    console.log(`Matricule: ${a.matricule}`);
    console.log(`Société: ${a.client.name}`);
    console.log(`Nom: ${a.nom}`);
    console.log(`Prénom: ${a.prenom}`);
    console.log(`RIB: ${a.rib}\n`);
  });

  await prisma.$disconnect();
}

checkAdherents();
