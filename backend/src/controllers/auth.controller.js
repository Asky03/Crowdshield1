const { createClient } = require('@supabase/supabase-js');
const { validationResult } = require('express-validator');

const anonClient = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// POST /api/auth/register
const register = async (req, res) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });

  const { email, password, name } = req.body;
  const { data, error } = await anonClient().auth.signUp({
    email, password,
    options: { data: { name, role: 'operator' } },
  });

  if (error) {
    return res.status(error.message.includes('already') ? 409 : 400).json({ error: error.message });
  }

  res.status(201).json({
    message: 'Registered successfully.',
    user: { id: data.user.id, email: data.user.email, name },
    access_token: data.session?.access_token || null,
    session: data.session,
  });
};

// POST /api/auth/login
const login = async (req, res) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });

  const { email, password } = req.body;
  const { data, error } = await anonClient().auth.signInWithPassword({ email, password });

  if (error) return res.status(401).json({ error: 'Invalid email or password' });

  res.json({
    message: 'Login successful',
    access_token:  data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at:    data.session.expires_at,
    user: {
      id:    data.user.id,
      email: data.user.email,
      name:  data.user.user_metadata?.name,
      role:  data.user.user_metadata?.role || 'operator',
    },
  });
};

// POST /api/auth/refresh
const refresh = async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token required' });

  const { data, error } = await anonClient().auth.refreshSession({ refresh_token });
  if (error) return res.status(401).json({ error: 'Invalid refresh token' });

  res.json({ access_token: data.session.access_token, expires_at: data.session.expires_at });
};

// POST /api/auth/forgot-password
// Supabase sends a password reset email automatically
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  // redirectTo is where Supabase sends the user after they click the reset link
  // For local dev we use localhost — change this to your domain in production
  const { error } = await anonClient().auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5500'}/reset-password.html`,
  });

  // Always return success — never reveal if an email exists (security)
  if (error) {
    console.error('Password reset error:', error.message);
  }

  res.json({
    message: 'If that email is registered, a password reset link has been sent. Check your inbox.',
  });
};

// GET /api/auth/me
const getMe = (req, res) => res.json({ user: req.user });

module.exports = { register, login, refresh, forgotPassword, getMe };