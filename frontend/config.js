// CrowdShield — Production Config
// ─────────────────────────────────────────────────────────────
// Fill in your 3 real values below, then:
//   git add frontend/config.js
//   git commit -m "config: production URLs"
//   git push
// Vercel auto-redeploys in ~30 seconds after push.
// ─────────────────────────────────────────────────────────────

// 1. Your Render backend URL — looks like crowdshield-backend-hdlm.onrender.com
window.CROWDSHIELD_API = 'https://crowdshield-backend-hdlm.onrender.com/api';

// 2 & 3. From your backend/.env file — SUPABASE_URL and SUPABASE_ANON_KEY
window.CROWDSHIELD_SUPABASE_URL  = 'https://lddscwgovmhkaspcdxhw.supabase.co';
window.CROWDSHIELD_SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZHNjd2dvdm1oa2FzcGNkeGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyODM4NDAsImV4cCI6MjA4ODg1OTg0MH0.C_NI_RmdfdalGaCbejKioTKKjWWY7-jTHEIuweOnkig';