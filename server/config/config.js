const path = require('path');
const fs = require('fs');

// Robust .env parser fallback (works with or without dotenv package)
try {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
} catch (e) {
  const envPath = path.join(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = (match[2] || '').trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = process.env[key] || value;
      }
    });
  }
}

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  appName: process.env.APP_NAME || 'Aetheria Web App',
  apiVersion: process.env.API_VERSION || 'v1',
  startTime: new Date()
};
