const http = require('http');
const path = require('path');

// Ensure root .env is loaded
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Require server
require('../server/server.js');

setTimeout(() => {
  const postData = JSON.stringify({
    message: "Hello, who are you?"
  });

  console.log('\n================== DIAGNOSTIC API TEST ==================');
  console.log('Sending request body: ', postData);

  const req = http.request('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('\n--- HTTP RESPONSE ---');
      console.log('HTTP Status Code:', res.statusCode);
      console.log('Response Body:');
      try {
        console.log(JSON.stringify(JSON.parse(body), null, 2));
      } catch (e) {
        console.log(body);
      }
      console.log('=========================================================\n');
      process.exit(0);
    });
  });

  req.on('error', (err) => {
    console.error('POST Request Connection Error:', err.message);
    process.exit(1);
  });

  req.write(postData);
  req.end();
}, 800);
