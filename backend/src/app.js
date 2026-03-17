const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes     = require('./routes/auth.routes');
const uploadRoutes   = require('./routes/upload.routes');
const analysisRoutes = require('./routes/analysis.routes');
const healthRoutes   = require('./routes/health.routes');

const app = express();

app.use(helmet());

// ── CORS — allow Vercel frontend + local dev ──────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow no-origin requests (Postman, curl, mobile)
    if (!origin) return callback(null, true);

    const allowed = [
      'https://crowdshield1.vercel.app',        // your Vercel frontend
      'http://localhost:5000',
      'http://localhost:3000',
      'http://127.0.0.1:5000',
      'null',                                    // local file:// HTML
    ];

    // Also allow any *.vercel.app subdomain dynamically
    if (allowed.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    // Also check FRONTEND_URL env var
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }

    console.warn('CORS blocked origin:', origin);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Handle preflight OPTIONS requests
app.options('*', cors());

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/api/health',   healthRoutes);
app.use('/api/auth',     authRoutes);
app.use('/api/upload',   uploadRoutes);
app.use('/api/analysis', analysisRoutes);

app.use((req, res) =>
  res.status(404).json({ error: `${req.method} ${req.path} not found` })
);

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({ error: err.message });
});

module.exports = app;