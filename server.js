/* ─────────────────────────────────────────────────────────────
  server.js — Step-In-Style (SIS) API + Static Server
   ───────────────────────────────────────────────────────────── */
require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');
const path        = require('path');

// Boot DB (creates tables + seeds on first run)
require('./database');

const app = express();

/* ── SECURITY ─────────────────────────────────────────────── */
app.use(helmet({
  contentSecurityPolicy: false,   // allow inline scripts in frontend
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

/* ── RATE LIMITING ────────────────────────────────────────── */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in a few minutes.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts. Please try again in 15 minutes.' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

/* ── BODY PARSING ─────────────────────────────────────────── */
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

/* ── LOGGING ──────────────────────────────────────────────── */
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

/* ── API ROUTES ───────────────────────────────────────────── */
app.use('/api/products',   require('./routes/products'));
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/cart',       require('./routes/cart'));
app.use('/api/orders',     require('./routes/orders'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api/contact',    require('./routes/contact'));
app.use('/api/admin',      require('./routes/admin'));

/* ── HEALTH CHECK ─────────────────────────────────────────── */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Step-In-Style (SIS) API',
    timestamp: new Date().toISOString(),
    node: process.version,
  });
});

/* ── SERVE FRONTEND ───────────────────────────────────────── */
const FRONTEND = path.join(__dirname, '..', 'simple clothing site', 'advance clothing site');
app.use(express.static(FRONTEND));

// Serve admin panel
app.get('/admin', (_req, res) => {
  res.sendFile(path.join(FRONTEND, 'admin.html'));
});

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(FRONTEND, 'index.html'));
});

/* ── ERROR HANDLER ────────────────────────────────────────── */
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

/* ── START ────────────────────────────────────────────────── */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║        Step-In-Style (SIS) — API Server         ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n🌐  Frontend : http://localhost:${PORT}`);
  console.log(`📦  API Base : http://localhost:${PORT}/api`);
  console.log(`🔐  Admin    : http://localhost:${PORT}/admin`);
  console.log(`\n📧  Admin login: ${process.env.ADMIN_EMAIL || 'admin@stepinstyle.com'}`);
  console.log(`🔑  Password   : ${process.env.ADMIN_PASSWORD || 'Admin123!'}`);
  console.log(`\n🚀  Running in ${process.env.NODE_ENV || 'development'} mode\n`);
});

module.exports = app;
