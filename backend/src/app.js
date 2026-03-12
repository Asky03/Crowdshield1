const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes     = require('./routes/auth.routes');
const uploadRoutes   = require('./routes/upload.routes');
const analysisRoutes = require('./routes/analysis.routes');
const healthRoutes   = require('./routes/health.routes');

const app = express();

app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'null', '*'],
  credentials: true,
}));
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