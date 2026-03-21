/**
 * backend/src/__tests__/api.test.js
 * CrowdShield backend API tests
 * Run: npm test  (from backend/ folder)
 *
 * These tests mock Supabase and AWS so no real keys needed.
 * They test route behaviour, auth logic, and error handling.
 */

// ── Mock external services before importing app ────────────
jest.mock('../config/supabase', () => ({
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    head: true,
  })),
  rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
}));

jest.mock('../services/s3.service', () => ({
  uploadFile: jest.fn().mockResolvedValue('media/2026/03/test.jpg'),
  getPresignedUrl: jest.fn().mockResolvedValue('https://s3.amazonaws.com/test-presigned'),
  buildS3Key: jest.fn().mockReturnValue('media/2026/03/test.jpg'),
  deleteFile: jest.fn().mockResolvedValue(true),
}));

jest.mock('../services/sns.service', () => ({
  sendCrowdAlert: jest.fn().mockResolvedValue(true),
}));

// Mock Supabase auth for token verification
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@test.com', user_metadata: { role: 'operator' } } },
        error: null,
      }),
      signUp: jest.fn().mockResolvedValue({
        data: { user: { id: 'new-user-id', email: 'newuser@test.com', user_metadata: { name: 'Test' } }, session: { access_token: 'mock-token-123' } },
        error: null,
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: {
          user: { id: 'test-user-id', email: 'test@test.com', user_metadata: { name: 'Test', role: 'operator' } },
          session: { access_token: 'mock-token-123', refresh_token: 'mock-refresh', expires_at: 9999999999 },
        },
        error: null,
      }),
      resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
    },
  })),
}));

// ── Test setup ─────────────────────────────────────────────
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-minimum-32-chars-long-abc123';
process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
process.env.SUPABASE_ANON_KEY = 'placeholder';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder';
process.env.AWS_S3_BUCKET = 'placeholder-bucket';
process.env.AWS_SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:000:placeholder';
process.env.ADMIN_EMAILS = 'admin@test.com';
process.env.FRONTEND_URL = 'http://localhost:5000';

const request = require('supertest');
const app     = require('../app');

const MOCK_TOKEN = 'Bearer mock-token-123';

// ════════════════════════════════════════════════════════════
// HEALTH ENDPOINT
// ════════════════════════════════════════════════════════════
describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('CrowdShield Backend v2');
    expect(res.body.services).toHaveProperty('database');
    expect(res.body.services).toHaveProperty('s3');
    expect(res.body.services).toHaveProperty('sns');
    expect(res.body.services).toHaveProperty('mlService');
  });

  it('always returns timestamp', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.timestamp).toBeDefined();
    expect(new Date(res.body.timestamp).getTime()).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════
// AUTH — REGISTER
// ════════════════════════════════════════════════════════════
describe('POST /api/auth/register', () => {
  it('registers successfully with valid data', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'newuser@test.com', password: 'ValidPass1', name: 'Test User' });
    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('newuser@test.com');
  });

  it('rejects missing email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: 'ValidPass1', name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('rejects weak password — too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'user@test.com', password: 'abc', name: 'Test' });
    expect(res.status).toBe(400);
  });

  it('rejects password with no uppercase', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'user@test.com', password: 'lowercase1', name: 'Test' });
    expect(res.status).toBe(400);
  });

  it('rejects password with no number', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'user@test.com', password: 'NoNumbers', name: 'Test' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'ValidPass1', name: 'Test' });
    expect(res.status).toBe(400);
  });

  it('assigns admin role to whitelisted email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'admin@test.com', password: 'ValidPass1', name: 'Admin' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('admin');
  });

  it('assigns operator role to non-whitelisted email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'random@test.com', password: 'ValidPass1', name: 'Random' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('operator');
  });
});

// ════════════════════════════════════════════════════════════
// AUTH — LOGIN
// ════════════════════════════════════════════════════════════
describe('POST /api/auth/login', () => {
  it('returns access token on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'ValidPass1' });
    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.message).toBe('Login successful');
  });

  it('rejects missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-email', password: 'pass' });
    expect(res.status).toBe(400);
  });
});

// ════════════════════════════════════════════════════════════
// AUTH — FORGOT PASSWORD
// ════════════════════════════════════════════════════════════
describe('POST /api/auth/forgot-password', () => {
  it('returns success message for any email (does not reveal if registered)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'anyone@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
  });

  it('rejects missing email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({});
    expect(res.status).toBe(400);
  });
});

// ════════════════════════════════════════════════════════════
// AUTH — PROTECTED ROUTE
// ════════════════════════════════════════════════════════════
describe('GET /api/auth/me', () => {
  it('returns user when valid token provided', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', MOCK_TOKEN);
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
  });

  it('returns 401 when no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 when malformed Authorization header', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'NotBearer token');
    expect(res.status).toBe(401);
  });
});

// ════════════════════════════════════════════════════════════
// ANALYSIS — PROTECTED ROUTES
// ════════════════════════════════════════════════════════════
describe('GET /api/analysis', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/analysis');
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid token', async () => {
    const res = await request(app)
      .get('/api/analysis')
      .set('Authorization', MOCK_TOKEN);
    expect(res.status).toBe(200);
  });

  it('accepts limit and offset query params', async () => {
    const res = await request(app)
      .get('/api/analysis?limit=5&offset=0')
      .set('Authorization', MOCK_TOKEN);
    expect(res.status).toBe(200);
  });

  it('accepts risk level filter', async () => {
    const res = await request(app)
      .get('/api/analysis?risk=High')
      .set('Authorization', MOCK_TOKEN);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/analysis/stats/summary', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/analysis/stats/summary');
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid token', async () => {
    const res = await request(app)
      .get('/api/analysis/stats/summary')
      .set('Authorization', MOCK_TOKEN);
    expect(res.status).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════
// UPLOAD — AUTH GUARD
// ════════════════════════════════════════════════════════════
describe('POST /api/upload', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/upload');
    expect(res.status).toBe(401);
  });

  it('returns 400 when no file uploaded', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', MOCK_TOKEN);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No file uploaded');
  });
});

// ════════════════════════════════════════════════════════════
// 404 HANDLER
// ════════════════════════════════════════════════════════════
describe('404 handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/doesnotexist');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});