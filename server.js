require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:5500',  // VS Code Live Server
    'http://localhost:5500',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static HTML files from /public folder (optional)
app.use(express.static(path.join(__dirname, 'public')));

// ─── ROUTES ───────────────────────────────────────────────────────────────
app.use('/api/payment', require('./routes/payment'));
app.use('/api/orders',  require('./routes/orders'));

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    // Test Supabase connection
    const supabase = require('./config/supabase');
    const { error } = await supabase.from('orders').select('id').limit(1);
    res.json({
      success:     true,
      message:     'KC Pride API running',
      database:    error ? '❌ Supabase error: ' + error.message : '✅ Supabase connected',
      environment: process.env.NODE_ENV,
      timestamp:   new Date().toISOString(),
    });
  } catch (e) {
    res.json({ success: true, message: 'API running', database: '⚠️ Check Supabase config' });
  }
});

// ─── 404 ──────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong' });
});

// ─── START ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀  KC Pride server  →  http://localhost:${PORT}`);
  console.log(`🗄️   Database        →  Supabase (PostgreSQL)`);
  console.log(`🌐  Health check     →  http://localhost:${PORT}/api/health\n`);
});
