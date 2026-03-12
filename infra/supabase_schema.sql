-- ================================================================
-- CrowdShield — PostgreSQL Schema
-- Paste this ENTIRE file into Supabase → SQL Editor → Run
-- ================================================================

-- 1. Profiles (auto-created on user register)
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT,
  role       TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin','operator')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (NEW.id,
          NEW.raw_user_meta_data->>'name',
          COALESCE(NEW.raw_user_meta_data->>'role','operator'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Main analyses table
CREATE TABLE IF NOT EXISTS public.crowd_analyses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_filename   TEXT NOT NULL,
  s3_key              TEXT NOT NULL,
  s3_heatmap_key      TEXT,
  file_type           TEXT NOT NULL CHECK (file_type IN ('image','video')),
  mime_type           TEXT,
  location            TEXT,

  crowd_count         INTEGER     NOT NULL DEFAULT 0,
  density             TEXT        NOT NULL DEFAULT 'low'
                        CHECK (density IN ('low','medium','high','critical')),
  risk_level          TEXT        NOT NULL DEFAULT 'Low'
                        CHECK (risk_level IN ('Low','Medium','High','Critical')),
  risk_score          NUMERIC(5,2) NOT NULL DEFAULT 0,
  confidence          NUMERIC(5,3),
  processing_time_ms  INTEGER,

  heatmap_stats       JSONB,
  flow_vectors        JSONB,
  frame_results       JSONB,
  ml_note             TEXT,

  uploaded_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ca_created  ON public.crowd_analyses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ca_risk     ON public.crowd_analyses (risk_level);
CREATE INDEX IF NOT EXISTS idx_ca_user     ON public.crowd_analyses (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_ca_location ON public.crowd_analyses (location);

-- 3. Row Level Security
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crowd_analyses  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "analyses_select" ON public.crowd_analyses;
DROP POLICY IF EXISTS "analyses_insert" ON public.crowd_analyses;
DROP POLICY IF EXISTS "analyses_delete" ON public.crowd_analyses;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "analyses_select" ON public.crowd_analyses FOR SELECT TO authenticated USING (true);
CREATE POLICY "analyses_insert" ON public.crowd_analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "analyses_delete" ON public.crowd_analyses FOR DELETE TO authenticated
  USING (auth.uid() = uploaded_by OR
         EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. Trend function (used by /api/analysis/stats/summary)
CREATE OR REPLACE FUNCTION public.crowd_trend_last_7_days()
RETURNS TABLE (day DATE, total BIGINT, avg_count NUMERIC, avg_score NUMERIC,
               critical BIGINT, high BIGINT)
LANGUAGE sql STABLE AS $$
  SELECT
    DATE(created_at)                                      AS day,
    COUNT(*)                                              AS total,
    ROUND(AVG(crowd_count)::numeric, 1)                   AS avg_count,
    ROUND(AVG(risk_score)::numeric, 1)                    AS avg_score,
    COUNT(*) FILTER (WHERE risk_level = 'Critical')       AS critical,
    COUNT(*) FILTER (WHERE risk_level = 'High')           AS high
  FROM public.crowd_analyses
  WHERE created_at >= NOW() - INTERVAL '7 days'
  GROUP BY DATE(created_at)
  ORDER BY 1 DESC;
$$;

-- ================================================================
-- DONE. Check Table Editor — you should see:
--   ✅ profiles
--   ✅ crowd_analyses
-- ================================================================