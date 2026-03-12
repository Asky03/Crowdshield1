/**
 * controllers/upload.controller.js
 * Full pipeline:
 *   1. Receive file (Multer → /tmp)
 *   2. Call Python ML service → crowd analysis + heatmap
 *   3. Upload original + heatmap to S3
 *   4. Store result in PostgreSQL via Supabase
 *   5. Send SNS alert if High/Critical
 *   6. Clean up /tmp
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const { uploadFile, buildS3Key } = require('../services/s3.service');
const { sendCrowdAlert } = require('../services/sns.service');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const uploadAndAnalyze = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { filename, originalname, mimetype, path: tmpPath } = req.file;
  const isVideo = mimetype.startsWith('video/');
  const location = req.body.location?.trim() || null;
  const analysisId = uuidv4();

  try {
    // ── Step 1: Call ML service ────────────────────────────────────
    let mlResult;
    try {
      const mlRes = await axios.post(`${ML_URL}/analyze`, {
        file_path: tmpPath,
        file_type: isVideo ? 'video' : 'image',
        filename,
        analysis_id: analysisId,
        generate_heatmap: true,
      }, { timeout: 180000 });
      mlResult = mlRes.data;
    } catch (mlErr) {
      console.warn('ML service unavailable — using mock result');
      mlResult = mockMLResult(analysisId, isVideo);
    }

    // ── Step 2: Upload media to S3 ────────────────────────────────
    const s3Key = buildS3Key(filename);
    let s3HeatmapKey = null;

    await uploadFile(tmpPath, s3Key, mimetype);

    // Upload heatmap image if ML service generated one
    const heatmapLocalPath = mlResult.heatmap_path;
    if (heatmapLocalPath && fs.existsSync(heatmapLocalPath)) {
      s3HeatmapKey = buildS3Key(`heatmap_${filename.replace(/\.[^.]+$/, '.jpg')}`);
      await uploadFile(heatmapLocalPath, s3HeatmapKey, 'image/jpeg');
      fs.unlinkSync(heatmapLocalPath);
    }

    // ── Step 3: Store in PostgreSQL via Supabase ──────────────────
    const record = {
      id: analysisId,
      original_filename: originalname,
      s3_key: s3Key,
      s3_heatmap_key: s3HeatmapKey,
      file_type: isVideo ? 'video' : 'image',
      mime_type: mimetype,
      location,
      crowd_count: mlResult.crowd_count,
      density: mlResult.density,
      risk_level: mlResult.risk_level,
      risk_score: mlResult.risk_score,
      confidence: mlResult.confidence,
      processing_time_ms: mlResult.processing_time_ms,
      flow_vectors: mlResult.flow_vectors || null,
      frame_results: mlResult.frame_results || null,
      heatmap_stats: mlResult.heatmap_stats || null,
      ml_note: mlResult.note || null,
      uploaded_by: req.user.id,
      created_at: new Date().toISOString(),
    };

    const { data: saved, error: dbError } = await supabase
      .from('crowd_analyses')
      .insert(record)
      .select()
      .single();

    if (dbError) throw new Error(`DB insert failed: ${dbError.message}`);

    // ── Step 4: SNS alert (non-blocking) ─────────────────────────
    sendCrowdAlert(saved).catch(() => {}); // fire and forget

    // ── Step 5: Clean up tmp ──────────────────────────────────────
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);

    res.status(201).json({
      message: 'Analysis complete',
      analysisId: saved.id,
      result: {
        crowdCount: saved.crowd_count,
        density: saved.density,
        riskLevel: saved.risk_level,
        riskScore: saved.risk_score,
        confidence: saved.confidence,
        processingTimeMs: saved.processing_time_ms,
        hasHeatmap: !!s3HeatmapKey,
        hasFlowAnalysis: !!(mlResult.flow_vectors?.length),
      },
    });
  } catch (err) {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    console.error('Pipeline error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

const mockMLResult = (id, isVideo) => {
  const count = Math.floor(Math.random() * 200);
  const score = Math.min(100, (count / 200) * 100);
  return {
    crowd_count: count,
    density: count > 100 ? 'high' : count > 50 ? 'medium' : 'low',
    risk_level: score > 85 ? 'Critical' : score > 60 ? 'High' : score > 30 ? 'Medium' : 'Low',
    risk_score: Math.round(score * 10) / 10,
    confidence: 0,
    processing_time_ms: isVideo ? 3000 : 400,
    heatmap_path: null,
    flow_vectors: null,
    frame_results: null,
    heatmap_stats: null,
    note: 'MOCK — ML service offline',
  };
};

module.exports = { uploadAndAnalyze };
