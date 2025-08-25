import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Raw data from the company
const wireTransferData = `110104   20250709000111788000000000083998230000000073                                                                                                                                                                                                                                   
110104   2025070900012178800000000000102036000000004001007404700411649ARS EX  "AON TUNISIE S.A."    14   14043043100702168352BENGAGI ZIED                  00000000000000001009000AIRBUS BORD 18-25                            2025070900000000010                                      
110104   2025070900012178800000000000116957000000004001007404700411649ARS EX  "AON TUNISIE S.A."    14   14015015100704939295SAIDANIHichem                 00000000000000001052000AIRBUS BORD 18-25                            2025070900000000010                                      
110104   2025070900012178800000000000065500000000004001007404700411649ARS EX  "AON TUNISIE S.A."    08   08081023082003208516NEFZI MOHEB                   00000000000000001090000AIRBUS BORD 18-25                            2025070900000000010                                      
110104   2025070900012178800000000000030000000000004001007404700411649ARS EX  "AON TUNISIE S.A."    14   14067067100701418590LTIFI ADEL                    00000000000000000112000AIRBUS BORD 18-25                            2025070900000000010                                      
110104   2025070900012178800000000000448000000000004001007404700411649ARS EX  "AON TUNISIE S.A."    14   14067067100700641135RAJHIHAMZA                    00000000000000001132000AIRBUS BORD 18-25                            2025070900000000010                                      
110104   2025070900012178800000000000111319000000004001007404700411649ARS EX  "AON TUNISIE S.A."    07   07016007810558352528ARIDHI LATIFA                 00000000000000000114000AIRBUS BORD 18-25                            2025070900000000010                                      
110104   2025070900012178800000000000040000000000004001007404700411649ARS EX  "AON TUNISIE S.A."    07   07016007810582292128EZZIDINI KHALED               00000000000000001163000AIRBUS BORD 18-25                            2025070900000000010                                      
110104   2025070900012178800000000000092500000000004001007404700411649ARS EX  "AON TUNISIE S.A."    14   14008008100709748250OUHIBI SAMEH                  00000000000000001165000AIRBUS BORD 18-25                            2025070900000000010                                      
110104   2025070900012178800000000000062500000000004001007404700411649ARS EX  "AON TUNISIE S.A."    07   07016007810581731953CHALLAKHMOHAMED               00000000000000001173000AIRBUS BORD 18-25                            2025070900000000010                                      
110104   2025070900012178800000000000084177000000004001007404700411649ARS EX  "AON TUNISIE S.A."    08   08019011022001723056MOHAMED BEN MLOUKA            00000000000000001204000AIRBUS BORD 18-25                            2025070900000000010                                      
110104   2025070900012178800000000000418000000000004001007404700411649ARS EX  "AON TUNISIE S.A."    20   20032322220051647331RAJHI RAOUF                   00000000000000001230000AIRBUS BORD 18-25                            2025070900000000010                                      
110104   2025070900012178800000000000040000000000004001007404700411649ARS EX  "AON TUNISIE S.A."    07   07077013510552050124AYMEN ARBOUJ                  00000000000000001276000AIRBUS BORD 18-25                            2025070900000000010                                      
110104   2025070900012178800000000000492000000000004001007404700411649ARS EX  "AON TUNISIE S.A."    17   17001000000089830627BEN SLIMENESOUFIENE           00000000000000001287000AIRBUS BORD 18-25                            2025070900000000010                                      
110104   2025070900012178800000000000012000000000004001007404700411649ARS EX  "AON TUNISIE S.A."    08   08047020022002526737KOUKI HABIB                   00000000000000001326000AIRBUS BORD 18-25                            2025070900000000010                                      
110104   2025070900012178800000000000027000000000004001007404700411649ARS EX  "AON TUNISIE S.A."    17   17206000000178121860MAROUENI MOETAZ               00000000000000001362000AIRBUS BORD 18-25                            2025070900000000010                                      
110104   2025070900012178800000000000030000000000004001007404700411649ARS EX  "AON TUNISIE S.A."    07   07018008610554386262TOUNEKTI ANIS                 00000000000000001402000AIRBUS BORD 18-25                            2025070900000000010                                      
110104   2025070900012178800000000000040000000000004001007404700411649ARS EX  "AON TUNISIE S.A."    14   14207207100714066409OUESLATI MAJED                00000000000000001679000AIRBUS BORD 18-25                            2025070900000000010                                      
110104   2025070900012178800000000000057650000000004001007404700411649ARS EX  "AON TUNISIE S.A."    17   17606000000210085633REBIIABDSATAR                 00000000000000001687000AIRBUS BORD 18-25                            2025070900000000010                                      
110104   2025070900012178800000000000060000000000004001007404700411649ARS EX  "AON TUNISIE S.A."    20   20024242220001496968BOUKHATMI HAFEDH              00000000000000000169000AIRBUS BORD 18-25                            2025070900000000010                                      
110104   2025070900012178800000000000088978000000004001007404700411649ARS EX  "AON TUNISIE S.A."    25   25044000000121815088KOBTANEANIS                   00000000000000001768000AIRBUS BORD 18-25                            2025070900000000010`;

interface WireTransferData {
  code: string;
  date: string;
  reference: string;
  amount: number;
  rib: string;
  name: string;
  description: string;
}

function parseWireTransferLine(line: string): WireTransferData | null {
  if (line.length < 100) return null;
  
  const code = line.substring(0, 6).trim();
  const date = line.substring(6, 14).trim();
  const reference = line.substring(14, 28).trim();
  const amount = parseInt(line.substring(28, 40).trim()) / 1000; // Convert from millimes to dinars
  const rib = line.substring(60, 80).trim();
  const name = line.substring(120, 150).trim();
  const description = line.substring(180, 220).trim();
  
  return {
    code,
    date,
    reference,
    amount,
    rib,
    name,
    description: description || 'AIRBUS BORD 18-25'
  };
}

async function main() {
  console.log('🌱 Starting wire transfer data seeding...');

  // 1. Create or get Society
  const society = await prisma.society.upsert({
    where: { code: 'AON_TUNISIE' },
    update: {},
    create: {
      name: 'AON TUNISIE S.A.',
      code: 'AON_TUNISIE',
    },
  });

  console.log('✅ Society created/found');

  // 2. Create Donneur d'Ordre
  const donneur = await prisma.donneurDOrdre.create({
    data: {
      societyId: society.id,
      name: 'ARS TUNISIE',
      rib: '07404700411649',
    },
  });

  console.log('✅ Donneur d\'Ordre created');

  // 3. Parse the wire transfer data
  const lines = wireTransferData.split('\n').filter(line => line.trim().length > 0);
  const transfers: WireTransferData[] = [];
  
  for (const line of lines) {
    const parsed = parseWireTransferLine(line);
    if (parsed && parsed.name && parsed.rib && parsed.amount > 0) {
      transfers.push(parsed);
    }
  }

  console.log(`✅ Parsed ${transfers.length} wire transfers`);

  // 4. Create WireTransferBatch
  const batch = await prisma.wireTransferBatch.create({
    data: {
      societyId: society.id,
      donneurId: donneur.id,
      status: 'CREATED',
      fileName: 'AON_TUNISIE_20250709.txt',
      fileType: 'TXT',
      archived: false,
    },
  });

  console.log('✅ Wire transfer batch created');

  // 5. Create Members and WireTransfers
  let membersCreated = 0;
  let transfersCreated = 0;

  for (const transfer of transfers) {
    try {
      // Check if member exists
      let member = await prisma.member.findFirst({
        where: { 
          rib: transfer.rib,
          societyId: society.id 
        }
      });

      // Create member if doesn't exist
      if (!member) {
        member = await prisma.member.create({
          data: {
            societyId: society.id,
            name: transfer.name,
            rib: transfer.rib,
            cin: transfer.rib.substring(0, 8), // Extract CIN from RIB
            address: 'Tunisie',
          },
        });
        membersCreated++;
      }

      // Create wire transfer
      const wireTransfer = await prisma.wireTransfer.create({
        data: {
          batchId: batch.id,
          memberId: member.id,
          donneurId: donneur.id,
          amount: transfer.amount,
          reference: transfer.reference,
          status: 'PENDING',
        },
      });
      transfersCreated++;

      // Create transfer history
      await prisma.wireTransferHistory.create({
        data: {
          transferId: wireTransfer.id,
          status: 'CREATED',
          changedBy: 'SYSTEM',
        },
      });

    } catch (error) {
      console.error(`Error processing transfer for ${transfer.name}:`, error);
    }
  }

  console.log(`✅ Created ${membersCreated} new members`);
  console.log(`✅ Created ${transfersCreated} wire transfers`);

  // 6. Create batch history
  await prisma.wireTransferBatchHistory.create({
    data: {
      batchId: batch.id,
      status: 'CREATED',
      changedBy: 'SYSTEM',
    },
  });

  console.log('✅ Batch history created');

  // 7. Calculate totals
  const totalAmount = transfers.reduce((sum, t) => sum + t.amount, 0);
  
  console.log('🎉 Wire transfer data seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Society: ${society.name}`);
  console.log(`- Donneur: ${donneur.name}`);
  console.log(`- Batch ID: ${batch.id}`);
  console.log(`- Members: ${membersCreated} new, ${transfers.length} total`);
  console.log(`- Wire Transfers: ${transfersCreated}`);
  console.log(`- Total Amount: ${totalAmount.toFixed(3)} TND`);
  console.log(`- File: ${batch.fileName}`);
}

main()
  .catch((e) => {
    console.error('❌ Wire transfer seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());