const http = require('http');

const data = JSON.stringify({
  email: 'chef@mail.com',
  password: 'Azertyui123@'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    try {
      const response = JSON.parse(body);
      if (response.token || response.access_token) {
        const token = response.token || response.access_token;
        console.log('\n✅ TOKEN:\n');
        console.log(token);
        console.log('\n📋 Copy this for Postman:\n');
        console.log('Authorization: Bearer ' + token);
      } else {
        console.log('❌ Login failed:', body);
      }
    } catch (e) {
      console.log('❌ Error:', body);
    }
  });
});

req.on('error', (e) => console.error('❌ Error:', e.message));
req.write(data);
req.end();
