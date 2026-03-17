// config.js
// ─────────────────────────────────────────────────────────────────
// This file sets the backend API URL for the frontend.
// 
// LOCAL DEV:
//   Leave this file as-is. The app uses localhost:5000 automatically.
//
// AFTER DEPLOYING BACKEND TO RENDER:
//   Replace the URL below with your actual Render backend URL.
//   It looks like: https://crowdshield-backend.onrender.com
//
// ─────────────────────────────────────────────────────────────────

window.CROWDSHIELD_API = 'https://dashboard.render.com/web/srv-d6s688q4d50c73bi4710/env';

// Supabase public keys (safe to expose in frontend)
// These are the same values from your .env file
window.CROWDSHIELD_SUPABASE_URL  = 'https://lddscwgovmhkaspcdxhw.supabase.co';
window.CROWDSHIELD_SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZHNjd2dvdm1oa2FzcGNkeGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyODM4NDAsImV4cCI6MjA4ODg1OTg0MH0.C_NI_RmdfdalGaCbejKioTKKjWWY7-jTHEIuweOnkig';
