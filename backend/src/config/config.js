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

window.CROWDSHIELD_API = 'https://YOUR-BACKEND-URL.onrender.com/api';

// Supabase public keys (safe to expose in frontend)
// These are the same values from your .env file
window.CROWDSHIELD_SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
window.CROWDSHIELD_SUPABASE_ANON = 'YOUR_SUPABASE_ANON_KEY_HERE';
