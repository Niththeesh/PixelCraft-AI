const http = require('http');

// Start Express server
require('../server/server.js');

setTimeout(() => {
  console.log('\n=================== RUNNING API TESTS ===================');

  // Test 1: GET /api/health
  http.get('http://localhost:3000/api/health', (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('\n--- GET /api/health ---');
      console.log('HTTP Status:', res.statusCode);
      console.log('Response Body:', body);

      // Test 2: POST /api/chat
      const postData = JSON.stringify({
        message: "Hello, introduce yourself in one sentence."
      });

      const req = http.request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res2) => {
        let body2 = '';
        res2.on('data', chunk => body2 += chunk);
        res2.on('end', () => {
          console.log('\n--- POST /api/chat ---');
          console.log('HTTP Status:', res2.statusCode);
          console.log('Response Body:', body2);
          console.log('=========================================================\n');
          process.exit(0);
        });
      });

      req.on('error', (e) => {
        console.error('POST Error:', e);
        process.exit(1);
      });

      req.write(postData);
      req.end();
    });
  });
}, 800);
