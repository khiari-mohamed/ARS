const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Server is working!' });
});

app.get('/api', (req, res) => {
  res.json({ message: 'API is working!' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(8001, '0.0.0.0', () => {
  console.log('Test server running on port 8001');
});