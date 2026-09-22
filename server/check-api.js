const http = require('http');

const ghostIds = new Set([
  '1e0a58d9-4370-4f39-9b4f-bb4fc014f7a8',
  'e06497dd-41b2-4811-a840-08a27e9f5acd',
  '9fa902a8-d6d3-4bf8-abb9-52f0e7205f7a',
  '5eda9882-87cb-4c74-964e-dc577f81dcc7',
  'b648435b-94b7-4ef8-80fc-533c40c0b789',
  '354a489b-9008-4193-bc68-2bc440be7ced',
]);

http.get('http://localhost:5000/api/super-admin/users', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const users = JSON.parse(data);
    console.log('API returned:', users.length, 'users');
    const ghosts = users.filter(u => ghostIds.has(u.id));
    if (ghosts.length) {
      console.log('\n❌ Ghost users ARE coming from the API:');
      ghosts.forEach(u => console.log(`  ${u.id} | ${u.email}`));
    } else {
      console.log('\n✅ Ghost users are NOT in the API response — they are cached in the frontend/browser.');
    }
  });
}).on('error', e => console.error('API error:', e.message));
