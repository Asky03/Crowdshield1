/**
 * controllers/analysis.controller.js
 * All queries go through Supabase → PostgreSQL.
 */
const supabase = require('../config/supabase');
const { getPresignedUrl } = require('../services/s3.service');

/**
 * GET /api/analysis?limit=20&offset=0&risk=High
 */
const getAll = async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const risk   = req.query.risk; // optional filter

    let query = supabase
      .from('crowd_analyses')
      .select('id, original_filename, file_type, location, crowd_count, density, risk_level, risk_score, confidence, processing_time_ms, has_heatmap:s3_heatmap_key, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (risk) query = query.eq('risk_level', risk);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ total: count, limit, offset, results: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/analysis/:id
 * Includes presigned S3 URLs for media + heatmap.
 */
const getById = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('crowd_analyses')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Not found' });

    // Generate short-lived presigned URLs (1 hour)
    const mediaUrl   = await getPresignedUrl(data.s3_key).catch(() => null);
    const heatmapUrl = data.s3_heatmap_key
      ? await getPresignedUrl(data.s3_heatmap_key).catch(() => null)
      : null;

    res.json({ ...data, mediaUrl, heatmapUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/analysis/stats/summary
 */
const getSummary = async (req, res) => {
  try {
    // Total count + risk distribution
    const { data: riskData, error: e1 } = await supabase
      .from('crowd_analyses')
      .select('risk_level, crowd_count, risk_score, created_at');

    if (e1) throw e1;
    if (!riskData?.length) return res.json({ total: 0, message: 'No data yet' });

    const dist = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    let totalCount = 0, maxCount = 0, totalScore = 0;

    for (const r of riskData) {
      dist[r.risk_level] = (dist[r.risk_level] || 0) + 1;
      totalCount += r.crowd_count || 0;
      totalScore += r.risk_score || 0;
      if (r.crowd_count > maxCount) maxCount = r.crowd_count;
    }

    // Trend: last 7 days grouped by day
    const { data: trend } = await supabase.rpc('crowd_trend_last_7_days');

    res.json({
      totalAnalyses: riskData.length,
      riskDistribution: dist,
      averageCrowdCount: Math.round(totalCount / riskData.length),
      maxCrowdCount: maxCount,
      averageRiskScore: Math.round((totalScore / riskData.length) * 10) / 10,
      lastAnalyzed: riskData[0]?.created_at || null,
      trend: trend || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, getById, getSummary };