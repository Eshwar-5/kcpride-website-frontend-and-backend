require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const helmet  = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────
app.use(helmet());

// Apply rate limiting to all /api routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, 
  legacyHeaders: false, 
  message: { success: false, message: 'Too many requests from this IP, please try again later.' }
});
app.use('/api', apiLimiter);

app.use(cors({
  origin: '*',
  credentials: false,
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
