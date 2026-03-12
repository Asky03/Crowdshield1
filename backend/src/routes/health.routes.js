const router = require('express').Router();
const axios = require('axios');
const supabase = require('../config/supabase');

router.get('/', async (req, res) => {
  const checks = await Promise.allSettled([
    // ML service
    axios.get(`${process.env.ML_SERVICE_URL || 'http://localhost:8000'}/health`, { timeout: 2000 }),
    // Supabase / DB
    supabase?.from('crowd_analyses').select('id', { count: 'exact', head: true }),
  ]);

  const mlOk = checks[0].status === 'fulfilled';
  const dbOk = checks[1].status === 'fulfilled' && !checks[1].value?.error;

  res.json({
    status: 'ok',
    service: 'CrowdShield Backend v2',
    timestamp: new Date().toISOString(),
    services: {
      mlService: mlOk ? 'online' : 'offline',
      database: dbOk ? 'connected' : 'disconnected',
      s3: process.env.AWS_S3_BUCKET ? 'configured' : 'not configured',
      sns: process.env.AWS_SNS_TOPIC_ARN ? 'configured' : 'not configured',
    },
  });
});

module.exports = router;