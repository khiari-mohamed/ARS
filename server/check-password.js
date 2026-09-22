const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:23044943@localhost:5432/ars_db'
});

// All IDs shown in the UI
const uiUsers = [
  { id: '1e0a58d9-4370-4f39-9b4f-bb4fc014f7a8', email: 'yasmine.harrouch@arstunisie.onmicrosoft.com' },
  { id: 'e06497dd-41b2-4811-a840-08a27e9f5acd', email: 'TAHER.BENSLIMEN@ARS' },
  { id: '9fa902a8-d6d3-4bf8-abb9-52f0e7205f7a', email: 'TAHERBENSLIMEN@ars' },
  { id: '5eda9882-87cb-4c74-964e-dc577f81dcc7', email: 'mariem.sbaii@arstunisie.com' },
  { id: 'b648435b-94b7-4ef8-80fc-533c40c0b789', email: 'azert@mail.com' },
  { id: '354a489b-9008-4193-bc68-2bc440be7ced', email: 'bnala556@gmail.com' },
  { id: 'dab851c8-78c0-4371-be2a-423f6f06f654', email: 'mohamed.mogaadi@arstunisie.com' },
  { id: '43d8cb77-d4fd-4b96-a2f0-ff47e4a64c50', email: 'Mariem.abessi@arstunisie.com' },
  { id: 'b0b8ea66-4d70-4a32-b2d3-a1f714175ea9', email: 'mariem.mamni@arstunisie.com' },
  { id: 'aeda1992-70ad-4753-9c91-44c335b267a1', email: 'chiheb.ferchichi@arstunisie.com' },
  { id: '0aa023ce-c478-44c1-83dc-66ac8026ee0e', email: 'ameni.mefteh@arstunisie.com' },
  { id: 'e33f2e91-1a7a-488d-a734-417afeb97095', email: 'finalahmed290@gmail.com' },
  { id: 'efdf092e-9793-42cb-a602-e35336d9bf3f', email: 'taher.ben.slimen@arstunisie.com' },
  { id: 'b4099411-eaee-471b-b34c-6663bccb38a0', email: 'monia.dridi@arstunisie.com' },
  { id: 'e8988fd2-aba5-47a7-b50a-bfae967828ac', email: 'yasmine.rakrouki@arstunisie.com' },
  { id: '2e08d013-ba09-4d27-9923-a702d1b83d3c', email: 'hatem.ouni@arstunisie.com' },
  { id: '38a29ccf-cb63-4d7b-99bf-8fb2f7bf63db', email: 'Imen.zouari@arstunisie.com' },
  { id: '92ae14f4-af2a-4506-ae42-fd5706369cae', email: 'bilel.metoui@arstunisie.com' },
  { id: '5d9a6583-3f80-4a33-95a2-11e8e9b2288e', email: 'Mohamed.benlamirhassen@arstunisie.com' },
  { id: 'b04e35c3-93b2-41d6-86f7-4934ba3467a2', email: 'ameni.mefteh@' },
  { id: '1616619a-a4d6-405a-9cfe-cf1485264d31', email: 'Mohamedradhi.elfallah@arstunisie.com' },
  { id: '6664151b-4e73-4ef6-ac58-52802106705f', email: 'sofien.benzakour@arstunisie.com' },
  { id: '7b122676-16f2-436f-8ec8-1cae3c2faa3e', email: 'MED AMIR HSAN' },
  { id: 'c1c7a2de-3dfd-45a7-bbda-91c5e9a4e9e2', email: 'ahlem.hamdi@arstunisie.com' },
  { id: '85b66132-0845-4b77-af6d-896168fbec67', email: 'insaf.mechergui@arstunisie.com' },
  { id: '22583829-ac57-4573-9bce-e29583552bdc', email: 'sana.menzli@arstunisie.com' },
  { id: '5f8403e3-89dd-47bc-8091-9b3f77bdb3be', email: 'sarra.trabelsi@arstunisie.com' },
  { id: '32705b82-6003-490c-a14d-acaa056dd146', email: 'ameni.laaouini@arstunisie.com' },
  { id: '8fc8b0b3-89d4-4a17-8dca-6e9f740c628f', email: 'siwar.ben.ftima@arstunisie.com' },
  { id: '164f1af4-6d08-4272-b491-b77288b5ca24', email: 'hedia.tergui@arstunisie.com' },
  { id: '578d5768-855f-4cbf-9347-8106206e8f47', email: 'nesrine.boubakri@arstunisie.com' },
  { id: '820c6833-6994-43b5-a9b5-15dbbe5845be', email: 'mariem.abessi@arstunisie.com' },
  { id: 'cc3069e6-a3bc-41c3-9150-5f5869d1c489', email: 'asma.haddad@arstunisie.com' },
  { id: 'edb8fbd5-9b9a-4b8c-a1fd-9e4969808e29', email: 'sabrine.missaoui@arstunisie.com' },
  { id: '2d05cb40-1a83-43ac-98fc-5804cc012e1a', email: 'marwen.jamazi@arstunisie.com' },
  { id: '86d9f8cc-a7d5-4fa7-99b7-699ecb801b0b', email: 'kaouther.louiz@arstunisie.com' },
  { id: 'd0586b7b-92d9-42e4-b988-517629a409fc', email: 'sonia.bouaicha@arstunisie.com' },
  { id: 'aae9ad38-b8ab-4c78-84c6-b1f86bbdd27c', email: 'fatma.elbehi@arstunisie.com' },
  { id: '224f68e4-a4d4-40f0-a0c6-55f70c6edc1a', email: 'cyrine.chouk@arstunisie.com' },
  { id: 'da9a1a97-5e52-4bb1-bed3-b2ce2f840896', email: 'ahlem.khemissi@arstunisie.com' },
  { id: '12eab8ad-a1dc-4008-81eb-fbff6b2f804b', email: 'siwar.ayari@arstunisie.com' },
  { id: '7bdb10cc-a506-4066-ac1f-44081beb89d8', email: 'islem.marzouki@arstunisie.com' },
  { id: 'd203b1d4-67ad-467e-88da-389592481907', email: 'jihed.yahyaoui@arstunisie.com' },
  { id: 'f54bffed-f149-4d22-a31a-6b760c456983', email: 'manar.dabboussi@arstunisie.com' },
  { id: '6536423a-d8a4-4173-8a5c-48a700e0740d', email: 'mohamed.benlamirhassen@arstunisie.com' },
  { id: '2840bc57-3374-4fff-b789-65941519d79d', email: 'ameni.dhrif@arstunisie.com' },
  { id: '1e1482bb-1e8c-4acb-8a58-3ab08522cd87', email: 'mohamed.frad@arstunisie.com' },
  { id: '80e2076b-220c-4679-b08d-6d0d06a2c7e3', email: 'hamza.yaakoubi@arstunisie.com' },
  { id: '04519b04-e987-416a-8a08-6e23ea390ba2', email: 'cyrine.hafaiedh@arstunisie.com' },
  { id: '2f1771dc-bfad-41ad-a509-c215d59ced91', email: 'karim.hafaiedh@arstunisie.com' },
  { id: '47149562-64e9-4966-9464-2a0aefef3534', email: 'naim.boughanmi@arstunisie.com' },
  { id: '684b75f8-c075-4021-94e1-3f0ec8b19ab5', email: 'imen.zouari@arstunisie.com' },
  { id: '0df28fa8-aaf5-481b-bfc0-61d109a1f0f3', email: 'hamza.yaakoubi@ars' },
];

async function main() {
  await client.connect();

  const dbRes = await client.query(`SELECT id FROM "User"`);
  const dbIds = new Set(dbRes.rows.map(r => r.id));

  console.log(`DB has ${dbIds.size} users, UI shows ${uiUsers.length} users\n`);

  const ghosts = uiUsers.filter(u => !dbIds.has(u.id));
  console.log(`❌ ${ghosts.length} GHOST users (in UI but NOT in DB):`);
  ghosts.forEach(u => console.log(`  ID: ${u.id} | Email: ${u.email}`));

  await client.end();
}

main().catch(err => { console.error(err.message); process.exit(1); });
