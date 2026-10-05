const path = require('path');
// Load environment variables from project root .env file at top of file
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const chatRoutes = require('./routes/chatRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON request bodies
app.use(express.json());

// Serve static files from public folder
app.use(express.static(path.join(__dirname, '../public')));

const { checkDatabaseHealth } = require('./config/supabaseClient');

// GET /api/health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'API is running'
  });
});

// GET /api/db/health endpoint (Verifies backend can reach Supabase)
app.get('/api/db/health', async (req, res) => {
  try {
    const result = await checkDatabaseHealth();
    const statusCode = result.success ? 200 : (result.status === 'NOT_CONFIGURED' ? 503 : 500);
    res.status(statusCode).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      status: 'INTERNAL_ERROR',
      error: 'Failed to execute database health check'
    });
  }
});

const conversationRoutes = require('./routes/conversationRoutes');
const authRoutes = require('./routes/authRoutes');
const promptRoutes = require('./routes/promptRoutes');

// Mount Auth API Routes (/api/auth)
app.use('/api/auth', authRoutes);

// Mount Chat API Routes (/api/chat)
app.use('/api', chatRoutes);

// Mount Conversation API Routes (/api/conversations)
app.use('/api', conversationRoutes);

// Mount AI Prompt Library API Routes (/api/prompts)
app.use('/api', promptRoutes);

// Start Express server
const server = app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n⚠️ Port ${PORT} is already in use by another process.`);
    console.error(`To free port ${PORT}, run in PowerShell:`);
    console.error(`Get-NetTCPConnection -LocalPort ${PORT} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }\n`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});
