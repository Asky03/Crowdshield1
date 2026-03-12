# CrowdShield API — Phase 1

Base URL: `http://localhost:5000/api`

---

## Authentication

All protected routes require:
```
Authorization: Bearer <jwt_token>
```

---

### POST /auth/register
Create a new account. First user gets `admin` role, subsequent users get `operator`.

**Body:**
```json
{
  "email": "admin@example.com",
  "password": "SecurePass1",
  "name": "Admin User"
}
```
**Response 201:**
```json
{
  "message": "Registration successful",
  "token": "eyJhb...",
  "user": { "id": "uuid", "email": "...", "name": "...", "role": "admin" }
}
```

---

### POST /auth/login
```json
{ "email": "admin@example.com", "password": "SecurePass1" }
```
**Response 200:** Same shape as register.

---

### GET /auth/me *(protected)*
Returns the current user from token.

---

## Upload & Analysis

### POST /upload *(protected)*
Upload an image or video for crowd analysis.

**Form-data:**
| Field    | Type   | Required | Notes                    |
|----------|--------|----------|--------------------------|
| media    | file   | ✅       | JPG/PNG/WEBP/MP4/AVI/MOV |
| location | string | ❌       | Free-text location tag   |

**Response 201:**
```json
{
  "message": "Upload and analysis complete",
  "analysisId": "uuid",
  "result": {
    "crowdCount": 47,
    "density": "medium",
    "riskLevel": "Medium",
    "riskScore": 23.5,
    "confidence": 0.872,
    "processingTimeMs": 412
  }
}
```

**Risk Levels:**
| Level    | Score Range | Crowd Count (approx) |
|----------|-------------|----------------------|
| Low      | 0–30        | 0–30 people          |
| Medium   | 31–60       | 31–80 people         |
| High     | 61–85       | 81–150 people        |
| Critical | 86–100      | 150+ people          |

---

## Analysis Results

### GET /analysis *(protected)*
```
GET /api/analysis?limit=20&offset=0
```
Returns paginated list of all past analyses.

### GET /analysis/:id *(protected)*
Returns a single result by ID.

### GET /analysis/stats/summary *(protected)*
Returns aggregate statistics:
```json
{
  "totalAnalyses": 12,
  "riskDistribution": { "Low": 5, "Medium": 4, "High": 2, "Critical": 1 },
  "averageCrowdCount": 63,
  "maxCrowdCount": 187,
  "lastAnalyzed": "2024-01-15T10:30:00.000Z"
}
```

---

## Health

### GET /health
```json
{
  "status": "ok",
  "service": "CrowdShield Backend",
  "timestamp": "...",
  "mlService": "online"
}
```

---

## Error Responses

| Code | Meaning                  |
|------|--------------------------|
| 400  | Bad request / validation |
| 401  | Not authenticated        |
| 403  | Insufficient permissions |
| 404  | Resource not found       |
| 409  | Conflict (duplicate)     |
| 413  | File too large           |
| 500  | Internal server error    |
