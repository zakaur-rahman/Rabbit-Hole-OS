# 📘 Production Deployment Playbook — Rabbit-Hole-OS

> **Version:** 1.0 · **Last Updated:** 2026-02-25  
> **Platform:** Render · **CI/CD:** GitHub Actions · **Runtime:** Python 3.11 + Node 20

---

## Table of Contents

1. [Environment Strategy](#1-environment-strategy)
2. [Variable & Secret Management](#2-variable--secret-management)
3. [CI/CD Pipeline Design](#3-cicd-pipeline-design)
4. [Docker Standards](#4-docker-standards)
5. [Render Service Architecture](#5-render-service-architecture)
6. [Infrastructure Requirements](#6-infrastructure-requirements)
7. [Monitoring & Alerting](#7-monitoring--alerting)
8. [Pre-Launch Checklist](#8-pre-launch-checklist)

---

## 1. Environment Strategy

| Environment | Purpose | Branch | URL Pattern | Auto-Deploy |
|-------------|---------|--------|-------------|-------------|
| **Development** | Local coding, debugging, hot-reload | Feature branches | `localhost:3000/3001/8000` | N/A |
| **Staging/Preview** | QA, integration testing, client demos | `staging` or PR-based | `staging.cognode.tech` | ✅ On PR merge |
| **Production** | Live user traffic | `main` (gated) | `cognode.tech` / `api.cognode.tech` | 🔒 Manual approval |

### Development
- Run all services locally via `npm run dev` (concurrently)
- Backend uses local SQLite or a dev Postgres instance
- Redis optional — degrade gracefully with in-memory fallback
- Environment: [.env](file:///c:/Users/zakau/Rabbit-Hole-OS/apps/web/.env) file per app (gitignored)

### Staging/Preview
- Render **Preview Environments** for every PR against `main`
- Own database instance (Neon branch or Render staging DB)
- Seeded with sanitized production data snapshots
- All secrets are staging-specific (never share prod secrets)

### Production
- Deployed only after CI passes **and** manual approval
- Uses dedicated Render services with custom domains
- Database: production Neon/Render Postgres with connection pooling
- Zero-downtime deploys via Render's rolling updates

---

## 2. Variable & Secret Management

### Classification

| Category | Examples | Storage Method |
|----------|----------|----------------|
| **Public Config** | `NODE_ENV`, `PORT`, `NEXT_PUBLIC_API_URL` | [render.yaml](file:///c:/Users/zakau/Rabbit-Hole-OS/render.yaml) `envVars` (committed) |
| **Standard Secrets** | `DATABASE_URL`, `GEMINI_API_KEY`, `CLERK_SECRET_KEY` | Render Dashboard → Environment (sync: false) |
| **Complex Secrets** | Service account JSON, TLS certs, [.env](file:///c:/Users/zakau/Rabbit-Hole-OS/apps/web/.env) bundles | Render **Secret Files** (`/etc/secrets/`) |
| **Shared Secrets** | Keys used by multiple services | Render **Environment Groups** |

### Best Practices

> [!IMPORTANT]
> **Never commit secrets.** All `.env*` files must be in [.gitignore](file:///c:/Users/zakau/Rabbit-Hole-OS/.gitignore) and [.dockerignore](file:///c:/Users/zakau/Rabbit-Hole-OS/.dockerignore).

1. **No default values for secrets** — config should raise on missing required secrets in production
2. **Rotate secrets quarterly** — `JWT_SECRET_KEY`, API keys, `DATABASE_URL` password
3. **Use Environment Groups** for secrets shared between `cognode-backend` and `cognode-synthesis-worker`
4. **Audit trail** — document all secrets in a private inventory (not in code):

```
Secret Inventory Template:
┌──────────────────────┬──────────────┬──────────────┬────────────┐
│ Variable Name        │ Services     │ Last Rotated │ Owner      │
├──────────────────────┼──────────────┼──────────────┼────────────┤
│ DATABASE_URL         │ backend, wkr │ 2026-02-01   │ @infra     │
│ JWT_SECRET_KEY       │ backend      │ 2026-02-01   │ @infra     │
│ GEMINI_API_KEY       │ backend, wkr │ 2026-01-15   │ @ai-team   │
│ CLERK_SECRET_KEY     │ backend      │ 2026-02-01   │ @auth      │
└──────────────────────┴──────────────┴──────────────┴────────────┘
```

---

## 3. CI/CD Pipeline Design

### Target Architecture

```mermaid
graph LR
    A[Push / PR] --> B[Lint & Type Check]
    B --> C[Unit Tests]
    C --> D[Build Docker Images]
    D --> E{PR?}
    E -- Yes --> F[Deploy Preview]
    E -- No --> G{Branch?}
    G -- staging --> H[Deploy Staging]
    G -- main --> I[Manual Approval]
    I --> J[Deploy Production]
```

### Recommended Workflow Structure

```yaml
# .github/workflows/ci.yml (new - replaces build.yml for deployments)
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - run: npm run lint          # Frontend + Web
      - run: ruff check apps/backend  # Python linting

  test:
    needs: lint
    runs-on: ubuntu-latest
    services:
      postgres: { image: postgres:16 }
    steps:
      - run: pytest apps/backend/tests/
      - run: npm test --workspace=apps/web

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/org/cognode-backend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-production:
    needs: build-and-push
    if: github.ref == 'refs/heads/main'
    environment: production  # Requires manual approval
    steps:
      - run: render deploy --service cognode-backend
```

### Key Improvements Over Current

| Current | Target |
|---------|--------|
| No tests | Lint + Unit tests required |
| Build on every push | Gated deploys with approval |
| No caching | GitHub Actions cache for Docker layers |
| No staging | Preview environments per PR |

---

## 4. Docker Standards

### Backend Dockerfile — Hardened Template

```dockerfile
# ---- Stage 1: Install dependencies ----
FROM python:3.11-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY apps/backend/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---- Stage 2: Production image ----
FROM python:3.11-slim
WORKDIR /app

# Non-root user (CRITICAL)
RUN groupadd -r appgroup && useradd -r -g appgroup -d /app -s /sbin/nologin appuser

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 curl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local
COPY --chown=appuser:appgroup apps/backend/ .

ENV PORT=8000
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

USER appuser
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

### Web Dockerfile — Hardened Template

```dockerfile
# ---- Stage 1: Dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci --legacy-peer-deps --workspace=apps/web

# ---- Stage 2: Build ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY apps/web/ ./apps/web/
COPY package.json ./
WORKDIR /app/apps/web
RUN npm run build

# ---- Stage 3: Production ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE ${PORT}

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/ || exit 1

CMD ["node", "apps/web/server.js"]
```

### [.dockerignore](file:///c:/Users/zakau/Rabbit-Hole-OS/.dockerignore) Additions

```
# Add to root .dockerignore
**/.env
**/.env.*
**/.env.local
**/.git
**/__pycache__
**/node_modules
**/.next
```

---

## 5. Render Service Architecture

### Target Service Map

```mermaid
graph TB
    Internet((Internet / CDN))
    Internet --> WEB[cognode-web-dashboard<br/>type: web<br/>Node.js · port 3001]
    Internet --> API[cognode-backend<br/>type: web or pserv<br/>Python · port 8000]
    API --> DB[(PostgreSQL<br/>Neon / Render DB)]
    API --> REDIS[(Upstash Redis)]
    WORKER[cognode-synthesis-worker<br/>type: worker<br/>Python · arq] --> DB
    WORKER --> REDIS
    API -.-> WORKER
```

### Service Definitions

#### `cognode-web-dashboard` — Web Service
```yaml
- type: web
  name: cognode-web-dashboard
  runtime: docker
  dockerfilePath: apps/web/Dockerfile
  dockerContext: .
  plan: starter        # $7/mo, 512MB RAM
  numInstances: 1
  healthCheckPath: /
  envVars:
    - key: NODE_ENV
      value: production
    - key: NEXT_PUBLIC_API_URL
      value: https://api.cognode.tech/api/v1
  customDomains:
    - cognode.tech
    - www.cognode.tech
```

#### `cognode-backend` — API Service
```yaml
- type: web           # Use 'pserv' if only web-dashboard needs access
  name: cognode-backend
  runtime: docker
  dockerfilePath: apps/backend/Dockerfile
  dockerContext: .
  plan: standard       # $25/mo, 2GB RAM
  numInstances: 1
  healthCheckPath: /api/v1/health/
  scaling:
    minInstances: 1
    maxInstances: 3
    targetMemoryPercent: 80
    targetCPUPercent: 70
  envVars:
    - key: DATABASE_URL
      sync: false
    - key: GEMINI_API_KEY
      sync: false
    - key: JWT_SECRET_KEY
      sync: false
    - key: ALLOWED_ORIGINS
      value: "https://cognode.tech,https://www.cognode.tech"
  customDomains:
    - api.cognode.tech
```

#### `cognode-synthesis-worker` — Background Worker (NEW)
```yaml
- type: worker
  name: cognode-synthesis-worker
  runtime: docker
  dockerfilePath: apps/backend/Dockerfile
  dockerContext: .
  plan: starter
  dockerCommand: python run_worker.py
  envVars:
    - fromGroup: cognode-shared-secrets   # Environment Group
```

---

## 6. Infrastructure Requirements

### Compute Reservations

| Service | Plan | vCPU | RAM | Instances |
|---------|------|------|-----|-----------|
| Web Dashboard | Starter | 0.5 | 512 MB | 1 |
| Backend API | Standard | 1.0 | 2 GB | 1–3 (auto) |
| Synthesis Worker | Starter | 0.5 | 512 MB | 1 |
| **Total baseline** | | **2.0** | **3 GB** | **3** |

### Database Connection Pooling

| Parameter | Recommended Value | Rationale |
|-----------|------------------|-----------|
| `pool_size` | `10` | Matches Neon free tier (or half of paid limit) |
| `max_overflow` | `5` | Safety margin without exhausting DB limits |
| `pool_pre_ping` | `True` | Detects stale connections (already set ✅) |
| `pool_recycle` | `1800` (30 min) | Prevent stale long-lived connections |
| `pool_timeout` | `30` | Fail fast rather than queue indefinitely |

> [!WARNING]
> If using **Neon free tier** (max 20 connections), the backend (pool=10+5) + worker (pool=5) = 20. This is at the limit. Monitor with `SELECT count(*) FROM pg_stat_activity;`

### Redis Configuration

| Parameter | Value | Notes |
|-----------|-------|-------|
| Max connections | 30 (Upstash free) | Use connection pooling with `maxclients` awareness |
| Key TTLs | Set on all cache keys | Prevent unbounded memory growth |
| Command timeout | 5s | Prevent hangs from blocking commands |

---

## 7. Monitoring & Alerting

### Log Management

| Layer | Tool | Configuration |
|-------|------|---------------|
| Application logs | Render Log Streams → **Datadog** or **Better Stack** | JSON structured logging with `python-json-logger` |
| Request logs | FastAPI + `uvicorn --access-log` | Log method, path, status, latency |
| Error tracking | **Sentry** | Python SDK for backend, Next.js SDK for web |
| Audit logs | Custom middleware | Log auth events, data mutations, admin actions |

### Structured Logging Format

```python
# Replace print() + basicConfig with:
import structlog
logger = structlog.get_logger()

# Every log entry should include:
logger.info("request_completed",
    method="GET",
    path="/api/v1/nodes",
    status=200,
    duration_ms=42,
    user_id="usr_abc123"
)
```

### Uptime & Alerting

| Monitor | Tool | Interval | Alert Channel |
|---------|------|----------|---------------|
| `https://cognode.tech` | **Render Health Checks** + **UptimeRobot** | 60s | Slack + Email |
| `https://api.cognode.tech/api/v1/health/` | UptimeRobot | 60s | Slack + PagerDuty |
| SSL certificate expiry | UptimeRobot | Daily | Email (30-day warning) |
| Error rate > 5% | Sentry | Real-time | Slack |
| Response time P95 > 2s | Datadog / Better Stack | 5 min | Slack |
| DB connection pool exhaustion | Custom `/health` endpoint metric | 30s | Slack + PagerDuty |

### Health Check Endpoint Enhancement

The current `/health` endpoint should be expanded to verify downstream dependencies:

```python
@router.get("/deep")
async def deep_health(db: AsyncSession = Depends(get_db)):
    checks = {"api": "ok"}
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"
    try:
        redis = await get_redis()
        await redis.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {e}"

    status = "healthy" if all(v == "ok" for v in checks.values()) else "degraded"
    return {"status": status, "checks": checks}
```

---

## 8. Pre-Launch Checklist

### Security
- [ ] All containers run as non-root
- [ ] `JWT_SECRET_KEY` is 32+ characters, randomly generated
- [ ] CORS origins include only `cognode.tech` and `www.cognode.tech` in production
- [ ] OpenAPI docs disabled in production (`openapi_url=None`)
- [ ] No [.env](file:///c:/Users/zakau/Rabbit-Hole-OS/apps/web/.env) files in Docker images (verified with `docker history`)
- [ ] All dependencies pinned in [requirements.txt](file:///c:/Users/zakau/Rabbit-Hole-OS/apps/backend/requirements.txt) and [package-lock.json](file:///c:/Users/zakau/Rabbit-Hole-OS/package-lock.json)
- [ ] Rate limiting on auth endpoints

### Reliability
- [ ] Health check paths configured in [render.yaml](file:///c:/Users/zakau/Rabbit-Hole-OS/render.yaml)
- [ ] Deep health check verifies DB + Redis connectivity
- [ ] Auto-scaling configured for backend (min 1, max 3)
- [ ] Background worker service deployed separately
- [ ] Database connection pool aligned with DB plan limits
- [ ] Graceful shutdown handles in-flight requests

### CI/CD
- [ ] Tests run on every PR
- [ ] Production deploys require manual approval
- [ ] Docker images cached in CI
- [ ] Preview environments for PR review

### Monitoring
- [ ] Structured JSON logging configured
- [ ] Error tracking (Sentry) integrated
- [ ] Uptime monitoring on all public endpoints
- [ ] Log streams connected to aggregator
- [ ] Alerting configured for error rate and latency spikes

### Documentation
- [ ] All secrets documented in private inventory
- [ ] Runbook for common incidents (DB connection exhaustion, OOM, deploy rollback)
- [ ] On-call rotation and escalation policy defined
