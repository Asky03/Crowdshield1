"""
app.py — CrowdShield ML Service v2
Run: uvicorn app:app --host 0.0.0.0 --port 8000 --reload
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "scripts"))

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from crowd_analyzer import CrowdAnalyzer, HeatmapStats

app      = FastAPI(title="CrowdShield ML", version="2.0.0")
analyzer = CrowdAnalyzer()   # load model once at startup


class AnalyzeReq(BaseModel):
    file_path:        str
    file_type:        str          # "image" or "video"
    filename:         Optional[str] = None
    analysis_id:      Optional[str] = None
    generate_heatmap: bool = True


class HeatmapStatsOut(BaseModel):
    peak_density:     float
    high_density_pct: float
    hotspot_count:    int


class AnalyzeResp(BaseModel):
    crowd_count:        int
    density:            str
    risk_level:         str
    risk_score:         float
    confidence:         float
    processing_time_ms: int
    heatmap_path:       Optional[str]             = None
    heatmap_stats:      Optional[HeatmapStatsOut] = None
    flow_vectors:       Optional[List[Dict[str,Any]]] = None
    frame_results:      Optional[List[Dict[str,Any]]] = None
    note:               Optional[str] = None


@app.get("/health")
def health():
    return {"status": "ok", "service": "CrowdShield ML v2", "model": "YOLOv8n",
            "features": ["person_detection","density_heatmap","optical_flow"]}


@app.post("/analyze", response_model=AnalyzeResp)
def analyze(req: AnalyzeReq):
    if not os.path.exists(req.file_path):
        raise HTTPException(400, f"File not found: {req.file_path}")
    try:
        if req.file_type == "video":
            r = analyzer.analyze_video(req.file_path, req.analysis_id, req.generate_heatmap)
        else:
            r = analyzer.analyze_image(req.file_path, req.analysis_id, req.generate_heatmap)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {e}")

    return AnalyzeResp(
        crowd_count=r.crowd_count, density=r.density,
        risk_level=r.risk_level,   risk_score=r.risk_score,
        confidence=r.confidence,   processing_time_ms=r.processing_time_ms,
        heatmap_path=r.heatmap_path,
        heatmap_stats=HeatmapStatsOut(**vars(r.heatmap_stats)) if r.heatmap_stats else None,
        flow_vectors=r.flow_vectors, frame_results=r.frame_results, note=r.note,
    )