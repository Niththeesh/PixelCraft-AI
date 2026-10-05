const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;

console.log('Testing GEMINI_API_KEY (Length):', apiKey ? apiKey.length : 0);

function testModel(modelName) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      contents: [{
        parts: [{ text: "Hello, introduce yourself in one sentence." }]
      }]
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`\n--- MODEL: ${modelName} ---`);
        console.log('HTTP STATUS:', res.statusCode);
        try {
          const parsed = JSON.parse(body);
          console.log('PARSED RESPONSE:', JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log('RAW BODY:', body);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`Error testing ${modelName}:`, e.message);
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

async function run() {
  await testModel('gemini-3.8-flash');
}

run();
