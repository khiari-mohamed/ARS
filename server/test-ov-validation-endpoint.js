const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testOVValidationEndpoint() {
  console.log('🔍 Testing OV Validation Endpoint...\n');

  try {
    // 1. Check if OrdreVirement table exists and has data
    console.log('1. Checking OrdreVirement table...');
    const allOVs = await prisma.ordreVirement.findMany({
      take: 5,
      include: {
        donneurOrdre: true,
        bordereau: { include: { client: true } }
      }
    });
    console.log(`   Found ${allOVs.length} OrdreVirement records`);
    if (allOVs.length > 0) {
      console.log('   Sample OV:', {
        id: allOVs[0].id,
        reference: allOVs[0].reference,
        etatVirement: allOVs[0].etatVirement,
        validationStatus: allOVs[0].validationStatus || 'FIELD_NOT_EXISTS'
      });
    }

    // 2. Check if validation fields exist
    console.log('\n2. Checking validation fields...');
    try {
      const ovWithValidation = await prisma.ordreVirement.findFirst({
        select: {
          id: true,
          validationStatus: true,
          validatedBy: true,
          validatedAt: true,
          validationComment: true
        }
      });
      console.log('   ✅ Validation fields exist');
      console.log('   Sample validation data:', ovWithValidation);
    } catch (error) {
      console.log('   ❌ Validation fields do NOT exist');
      console.log('   Error:', error.message);
    }

    // 3. Test the actual query used in the endpoint
    console.log('\n3. Testing endpoint query...');
    try {
      const pendingOVs = await prisma.ordreVirement.findMany({
        where: {
          validationStatus: 'EN_ATTENTE_VALIDATION'
        },
        include: {
          donneurOrdre: true,
          bordereau: { include: { client: true } }
        },
        orderBy: { dateCreation: 'asc' }
      });
      console.log(`   ✅ Query successful: Found ${pendingOVs.length} pending OVs`);
      pendingOVs.forEach(ov => {
        console.log(`   - ${ov.reference}: ${ov.validationStatus}`);
      });
    } catch (error) {
      console.log('   ❌ Query failed:', error.message);
      
      // 4. Try fallback query
      console.log('\n4. Testing fallback query...');
      try {
        const fallbackOVs = await prisma.ordreVirement.findMany({
          where: {
            etatVirement: 'NON_EXECUTE'
          },
          include: {
            donneurOrdre: true,
            bordereau: { include: { client: true } }
          },
          orderBy: { dateCreation: 'desc' },
          take: 10
        });
        console.log(`   ✅ Fallback query successful: Found ${fallbackOVs.length} NON_EXECUTE OVs`);
        fallbackOVs.forEach(ov => {
          console.log(`   - ${ov.reference}: ${ov.etatVirement}`);
        });
      } catch (fallbackError) {
        console.log('   ❌ Fallback query also failed:', fallbackError.message);
      }
    }

    // 5. Check database schema
    console.log('\n5. Checking database schema...');
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'OrdreVirement' 
      AND column_name LIKE '%validation%'
    `;
    console.log('   Validation columns in DB:', tableInfo);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testOVValidationEndpoint();