"""
crowd_analyzer.py  —  CrowdShield ML Engine v2
────────────────────────────────────────────────
1. YOLOv8 person detection
2. Gaussian kernel density heatmap
3. Farneback optical flow (video only — crowd movement)
4. Composite risk scoring
5. Heatmap saved to /tmp as JPEG
"""

import cv2, numpy as np, time, os, tempfile
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from scipy.ndimage import gaussian_filter

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    print("WARNING: ultralytics not installed — mock mode")

MODEL_PATH = Path(__file__).parent.parent / "models" / "yolov8n.pt"

RISK_BANDS    = [(85,"Critical"),(60,"High"),(30,"Medium"),(0,"Low")]
DENSITY_BANDS = [(150,"critical"),(80,"high"),(30,"medium"),(0,"low")]


@dataclass
class HeatmapStats:
    peak_density:      float
    high_density_pct:  float
    hotspot_count:     int


@dataclass
class AnalysisResult:
    crowd_count:        int
    density:            str
    risk_level:         str
    risk_score:         float
    confidence:         float
    processing_time_ms: int
    heatmap_path:       Optional[str]  = None
    heatmap_stats:      Optional[HeatmapStats] = None
    flow_vectors:       Optional[List[Dict]]   = None
    frame_results:      Optional[List[Dict]]   = None
    note:               Optional[str]  = None


class CrowdAnalyzer:
    def __init__(self):
        self.model = None
        if YOLO_AVAILABLE:
            try:
                p = str(MODEL_PATH) if MODEL_PATH.exists() else "yolov8n.pt"
                self.model = YOLO(p)
                print("✅ YOLOv8n loaded")
            except Exception as e:
                print(f"⚠️  Model load failed: {e}")

    # ── Public API ─────────────────────────────────────────────────

    def analyze_image(self, image_path: str, analysis_id: str = None,
                      generate_heatmap: bool = True) -> AnalysisResult:
        t0 = time.time()
        if not self.model:
            return self._mock(False, t0)

        frame = cv2.imread(image_path)
        if frame is None:
            raise ValueError(f"Cannot read image: {image_path}")

        boxes, count, conf = self._detect(frame)
        centroids  = self._centroids(boxes, frame.shape)
        hmap, hstats = self._heatmap(frame, centroids)
        hpath = self._save_heatmap(hmap, analysis_id) if generate_heatmap else None
        score = self._score(count, hstats, 0)

        return AnalysisResult(
            crowd_count=count, density=self._dlabel(count),
            risk_level=self._rlevel(score), risk_score=round(score,1),
            confidence=round(conf,3), processing_time_ms=int((time.time()-t0)*1000),
            heatmap_path=hpath, heatmap_stats=hstats,
        )

    def analyze_video(self, video_path: str, analysis_id: str = None,
                      generate_heatmap: bool = True,
                      sample_every_n: int = 15) -> AnalysisResult:
        t0 = time.time()
        if not self.model:
            return self._mock(True, t0)

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        frame_results, flow_vecs = [], []
        prev_gray, peak_frame, peak_count = None, None, 0
        idx = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if idx % sample_every_n == 0:
                boxes, count, conf = self._detect(frame)
                frame_results.append({"frame": idx, "crowd_count": count, "confidence": round(conf,3)})
                if count > peak_count:
                    peak_count, peak_frame = count, frame.copy()
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                if prev_gray is not None:
                    flow_vecs.extend(self._flow(prev_gray, gray, frame.shape))
                prev_gray = gray
            idx += 1
        cap.release()

        if not frame_results:
            raise ValueError("No frames extracted from video")

        hpath, hstats = None, None
        if peak_frame is not None and generate_heatmap:
            pb, _, _ = self._detect(peak_frame)
            pc = self._centroids(pb, peak_frame.shape)
            himg, hstats = self._heatmap(peak_frame, pc)
            hpath = self._save_heatmap(himg, analysis_id)

        avg_mag = float(np.mean([v["magnitude"] for v in flow_vecs])) if flow_vecs else 0.0
        score   = self._score(peak_count, hstats, avg_mag)
        avg_conf= float(np.mean([f["confidence"] for f in frame_results]))
        top_vecs= sorted(flow_vecs, key=lambda v: v["magnitude"], reverse=True)[:20]

        return AnalysisResult(
            crowd_count=peak_count, density=self._dlabel(peak_count),
            risk_level=self._rlevel(score), risk_score=round(score,1),
            confidence=round(avg_conf,3),
            processing_time_ms=int((time.time()-t0)*1000),
            heatmap_path=hpath, heatmap_stats=hstats,
            flow_vectors=top_vecs, frame_results=frame_results,
            note=f"Peak from {len(frame_results)} sampled frames; avg_flow={avg_mag:.2f}",
        )

    # ── Detection ──────────────────────────────────────────────────

    def _detect(self, frame):
        res   = self.model(frame, classes=[0], verbose=False)
        boxes = res[0].boxes
        count = len(boxes)
        confs = boxes.conf.cpu().numpy().tolist() if count else [0.0]
        return boxes, count, float(np.mean(confs))

    def _centroids(self, boxes, shape):
        h, w = shape[:2]
        out = []
        for b in boxes.xyxy.cpu().numpy():
            x1,y1,x2,y2 = b
            out.append(((x1+x2)/2/w, (y1+y2)/2/h))
        return out

    # ── Heatmap ────────────────────────────────────────────────────

    def _heatmap(self, frame, centroids):
        h, w = frame.shape[:2]
        dmap = np.zeros((h,w), dtype=np.float32)
        for cx,cy in centroids:
            px,py = int(cx*w), int(cy*h)
            if 0<=px<w and 0<=py<h:
                dmap[py,px] += 1.0
        sigma = max(h,w)*0.04
        dmap  = gaussian_filter(dmap, sigma=sigma)
        dmax  = dmap.max()
        if dmax > 0:
            dmap /= dmax

        pct = float(np.mean(dmap>0.6))*100
        _,bin_img = cv2.threshold((dmap*255).astype(np.uint8),150,255,cv2.THRESH_BINARY)
        nlabels,_ = cv2.connectedComponents(bin_img)
        stats = HeatmapStats(peak_density=round(float(dmax),4),
                             high_density_pct=round(pct,2),
                             hotspot_count=max(0,nlabels-1))

        colored  = cv2.applyColorMap((dmap*255).astype(np.uint8), cv2.COLORMAP_JET)
        overlay  = cv2.addWeighted(frame, 0.45, colored, 0.55, 0)
        return overlay, stats

    def _save_heatmap(self, img, analysis_id=None):
        d = Path(tempfile.gettempdir()) / "crowdshield_heatmaps"
        d.mkdir(exist_ok=True)
        p = str(d / f"heatmap_{analysis_id or 'tmp'}.jpg")
        cv2.imwrite(p, img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return p

    # ── Optical flow ───────────────────────────────────────────────

    def _flow(self, prev, curr, shape, step=32):
        h,w = shape[:2]
        flow = cv2.calcOpticalFlowFarneback(prev, curr, None,
               0.5, 3, 15, 3, 5, 1.2, 0)
        vecs = []
        for y in range(0, h, step):
            for x in range(0, w, step):
                dx,dy = flow[y,x]
                mag = float(np.sqrt(dx**2+dy**2))
                if mag > 0.5:
                    vecs.append({"x":round(x/w,3),"y":round(y/h,3),
                                 "dx":round(float(dx),3),"dy":round(float(dy),3),
                                 "magnitude":round(mag,3)})
        return vecs

    # ── Scoring ────────────────────────────────────────────────────

    def _score(self, count, hstats, flow_mag):
        count_s   = min(100,(count/200)*100)*0.60
        density_s = (min(100, hstats.high_density_pct*2)*0.30) if hstats else 0
        flow_s    = min(100,(flow_mag/10)*100)*0.10
        return min(100, count_s+density_s+flow_s)

    def _rlevel(self, s):
        for thresh,label in RISK_BANDS:
            if s >= thresh: return label
        return "Low"

    def _dlabel(self, c):
        for thresh,label in DENSITY_BANDS:
            if c > thresh: return label
        return "low"

    # ── Mock ───────────────────────────────────────────────────────

    def _mock(self, is_video, t0):
        import random
        c = random.randint(10,180)
        s = min(100,(c/200)*100)
        return AnalysisResult(
            crowd_count=c, density=self._dlabel(c),
            risk_level=self._rlevel(s), risk_score=round(s,1),
            confidence=0.0, processing_time_ms=int((time.time()-t0)*1000),
            note="MOCK — YOLOv8 not available",
        )