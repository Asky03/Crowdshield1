const supabase = require('../config/supabase');
const { getPresignedUrl } = require('../services/s3.service');

/**
 * ROLE LOGIC:
 *   admin    → sees ALL analyses from every user
 *   operator → sees ONLY their own uploads
 *
 * Role comes from Supabase user_metadata.role (set at register time)
 * First registered user gets 'admin' automatically via the profiles trigger.
 * All subsequent users get 'operator'.
 */

// GET /api/analysis?limit=20&offset=0&risk=High
const getAll = async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const risk   = req.query.risk;
    const isAdmin = req.user.role === 'admin';

    let q = supabase
      .from('crowd_analyses')
      .select(
        'id, original_filename, file_type, location, crowd_count, density, risk_level, risk_score, confidence, processing_time_ms, s3_heatmap_key, uploaded_by, created_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Non-admins only see their own data
    if (!isAdmin) {
      q = q.eq('uploaded_by', req.user.id);
    }

    if (risk) q = q.eq('risk_level', risk);

    const { data, error, count } = await q;
    if (error) throw error;

    const results = (data || []).map(r => ({
      ...r,
      has_heatmap: !!r.s3_heatmap_key,
      // Admins see who uploaded each record, operators don't need this
      uploaded_by: isAdmin ? r.uploaded_by : undefined,
    }));

    res.json({ total: count, limit, offset, results, viewAs: isAdmin ? 'admin' : 'operator' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/analysis/stats/summary
const getSummary = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';

    let q = supabase
      .from('crowd_analyses')
      .select('risk_level, crowd_count, risk_score, created_at');

    // Operators only see their own stats
    if (!isAdmin) {
      q = q.eq('uploaded_by', req.user.id);
    }

    const { data, error } = await q;
    if (error) throw error;

    if (!data?.length) {
      return res.json({
        totalAnalyses: 0,
        riskDistribution: { Low:0, Medium:0, High:0, Critical:0 },
        averageCrowdCount: 0, maxCrowdCount: 0, averageRiskScore: 0,
        trend: [], viewAs: isAdmin ? 'admin' : 'operator',
      });
    }

    const dist = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    let totalCount = 0, maxCount = 0, totalScore = 0;

    for (const r of data) {
      dist[r.risk_level] = (dist[r.risk_level] || 0) + 1;
      totalCount += r.crowd_count || 0;
      totalScore += Number(r.risk_score) || 0;
      if (r.crowd_count > maxCount) maxCount = r.crowd_count;
    }

    const { data: trend } = await supabase.rpc('crowd_trend_last_7_days');

    res.json({
      totalAnalyses:     data.length,
      riskDistribution:  dist,
      averageCrowdCount: Math.round(totalCount / data.length),
      maxCrowdCount:     maxCount,
      averageRiskScore:  Math.round((totalScore / data.length) * 10) / 10,
      lastAnalyzed:      data[0]?.created_at || null,
      trend:             trend || [],
      viewAs:            isAdmin ? 'admin' : 'operator',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/analysis/:id
const getById = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';

    let q = supabase
      .from('crowd_analyses')
      .select('*')
      .eq('id', req.params.id);

    // Operators can only fetch their own records
    if (!isAdmin) {
      q = q.eq('uploaded_by', req.user.id);
    }

    const { data, error } = await q.single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });

    const mediaUrl   = await getPresignedUrl(data.s3_key).catch(() => null);
    const heatmapUrl = data.s3_heatmap_key
      ? await getPresignedUrl(data.s3_heatmap_key).catch(() => null)
      : null;

    res.json({ ...data, mediaUrl, heatmapUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, getSummary, getById };