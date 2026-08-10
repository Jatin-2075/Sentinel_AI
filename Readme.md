# Sentinel - AI-Powered Health & Incident Copilot

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://www.typescriptlang.org/)

> **Watch your full-stack app in real time. When something breaks, Sentinel tells you what failed and why.**

Sentinel ingests health signals from your frontend, backend, and database, detects anomalies, and uses AI (grounded in past incidents via RAG) to explain the likely root cause — instead of leaving engineers manually digging through logs.

## 🎯 Quick Links

- **Getting Started**
  - [Frontend Setup](./FRONTEND_QUICKSTART.md) - React + TypeScript
  - [Backend Setup](./BACKEND_QUICKSTART.md) - FastAPI + PostgreSQL
  - [Full Integration](./INTEGRATION.md) - Complete architecture & flows

- **Try It Now**
  ```bash
  # Terminal 1: Backend
  cd backend && python -m backend.main
  
  # Terminal 2: Frontend
  cd Frontend && npm run dev
  
  # Open http://localhost:5173, sign up, create project, copy API key
  ```

## What It Does

```
Your App                    Sentinel                   Dashboard
   │                            │                           │
   ├─ Frontend events ────────► Ingestion API              │
   ├─ Backend events ────────► (validate + queue)          │
   └─ DB snapshots ─────────►                              │
                               │                            │
                           Anomaly Check                    │
                           (threshold)                      │
                               │                            │
                           AI Pipeline                      │
                           ├─ Embed event                   │
                           ├─ RAG search                    │
                           ├─ LLM analysis                  │
                           └─ WebSocket push               │
                                                           │
                                    ┌──────────────────────┘
                                    │
                                    ▼
                          Live Incident Card
                          • Root Cause: "DB connection pool exhausted"
                          • Severity: Critical
                          • Similar Past Fix: "Increased pool size from 20 → 50"
```

## Key Features

| Feature | Description |
|---------|-------------|
| **Full-Stack Monitoring** | Frontend, backend, database unified in one view |
| **Real-time Anomaly Detection** | Latency spikes, error rates, connection exhaustion |
| **AI Root-Cause Analysis** | Powered by Gemini/Claude |
| **RAG-Grounded Fixes** | Suggests solutions based on similar past incidents |
| **Live Dashboard** | WebSocket-powered, updates as incidents happen |
| **Multi-tenancy** | Secure project isolation with API keys |
| **Zero Config** | Drop interceptors into your app, start monitoring |

## 📦 Architecture

### Components
```
Backend (FastAPI)
├─ Authentication (JWT + refresh tokens)
├─ Project Management (multi-tenant, API keys)
├─ Event Ingestion (frontend/backend/DB)
├─ Anomaly Detection (threshold-based)
├─ AI Pipeline (Gemini integration)
├─ RAG Layer (pgvector similarity search)
└─ WebSocket (real-time updates)

Frontend (React + TypeScript)
├─ Auth Context (session management)
├─ API Service Layer (organized by domain)
├─ Pages (auth, dashboard, projects, incidents)
├─ WebSocket Client (live updates)
└─ TypeScript Types (complete type safety)

Database (PostgreSQL + pgvector)
├─ Users, Projects, API Keys
├─ Events, Incidents, Runbooks
└─ Incident Embeddings (for RAG)
```

### Tech Stack
| Layer | Technology | Why |
|-------|-----------|-----|
| Backend API | FastAPI | Async, type-safe, great DX |
| Frontend | React + TypeScript | Modern, type-safe components |
| Database | PostgreSQL + pgvector | Relational + vector search |
| Queue | Redis Streams | Decouples ingestion from processing |
| Realtime | WebSockets | Live incident updates |
| LLM | Gemini/Claude | Root-cause analysis |

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 12+ (with pgvector)
- Gemini API key (free tier available)

### 1️⃣ Backend Setup (5 minutes)

```bash
cd backend
pip install -r requirements.txt

# Create .env
cat > .env << EOF
DATABASE_URL=postgresql://user:pass@localhost/sentinel
SECRET_KEY=$(python -c 'import secrets; print(secrets.token_urlsafe(32))')
GEMINI_API_KEY=your-key-here
EOF

# Run database migrations
alembic upgrade head

# Start server
python -m backend.main
# ✅ Server running at http://localhost:8000
```

### 2️⃣ Frontend Setup (2 minutes)

```bash
cd Frontend
npm install
# .env already configured for localhost

# Start dev server
npm run dev
# ✅ Frontend at http://localhost:5173
```

### 3️⃣ Create First Project (1 minute)

1. Go to http://localhost:5173
2. Sign up (username: `demo`, password: anything)
3. Click "Create Project"
4. Fill in: name, frontend URL, backend URL
5. Copy the **API Key**

### 4️⃣ Send Test Event (1 minute)

```bash
API_KEY="<paste your key here>"

curl -X POST http://localhost:8000/project/event/postproject \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "frontend",
    "event_type": "api_call",
    "endpoint": "/checkout",
    "duration_ms": 5500,
    "status": "timeout",
    "http_status": 504
  }'

# ✅ Check dashboard — incident appears!
```

## 📚 Documentation

### Setup Guides
- [FRONTEND_QUICKSTART.md](./FRONTEND_QUICKSTART.md) - React setup, API usage, patterns
- [BACKEND_QUICKSTART.md](./BACKEND_QUICKSTART.md) - FastAPI setup, configuration, deployment
- [INTEGRATION.md](./INTEGRATION.md) - Full architecture, data flows, instrumentation examples

### Learning Paths
1. **I want to use Sentinel in my app**
   - Read: [Instrumentation Examples](./INTEGRATION.md#instrumentation-setup)
   - Implement: Frontend interceptor + backend middleware

2. **I want to understand the code**
   - Read: [Architecture](./INTEGRATION.md#architecture-summary)
   - Explore: Frontend `src/config/api.ts`, Backend `Core/incident_pipeline.py`

3. **I want to deploy to production**
   - Read: [BACKEND_QUICKSTART.md](./BACKEND_QUICKSTART.md#production-deployment)
   - Follow: Environment setup, database backups, monitoring

## 🔌 API Examples

### Subscribe to Live Incidents (Frontend)
```typescript
import { api } from "@/config/api";

function Dashboard({ projectId }) {
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("access");
    const disconnect = api.connectLiveUpdates(
      projectId,
      token,
      (incident) => setIncidents(prev => [incident, ...prev])
    );
    return disconnect;
  }, [projectId]);

  return incidents.map(i => (
    <div key={i.id}>
      <h3>{i.title}</h3>
      <p>💡 {i.summary}</p>
    </div>
  ));
}
```

### Send Events from Backend
```python
from fastapi import FastAPI
from datetime import datetime

app = FastAPI()

@app.middleware("http")
async def log_to_sentinel(request, call_next):
    import httpx
    start = datetime.utcnow()
    response = await call_next(request)
    duration_ms = (datetime.utcnow() - start).total_seconds() * 1000
    
    await httpx.AsyncClient().post(
        f"{SENTINEL_URL}/project/event/postproject",
        json={
            "source": "backend",
            "event_type": "api_call",
            "endpoint": str(request.url.path),
            "duration_ms": int(duration_ms),
            "status": "success" if response.status_code < 400 else "error",
            "http_status": response.status_code,
        },
        headers={"Authorization": f"Bearer {PROJECT_API_KEY}"}
    )
    return response
```

### Send Events from Frontend
```typescript
const apiKey = "your-project-api-key";

async function monitoredFetch(endpoint, options) {
  const start = performance.now();
  try {
    const res = await fetch(endpoint, options);
    const duration = performance.now() - start;
    
    await navigator.sendBeacon(
      `${API_BASE}/project/event/postproject`,
      JSON.stringify({
        source: "frontend",
        event_type: "api_call",
        endpoint,
        duration_ms: Math.round(duration),
        status: res.ok ? "success" : "error",
        http_status: res.status,
        page: window.location.pathname,
        Authorization: `Bearer ${apiKey}`, // ⚠️ Not ideal, use proper headers
      })
    );
    return res;
  } catch (error) {
    // Send error event...
    throw error;
  }
}
```

## 🧪 Testing

### Test Auth
```bash
# Signup
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "pass123"}'

# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "pass123"}'
```

### Test Events
```bash
# Send latency spike
curl -X POST http://localhost:8000/project/event/postproject \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "backend",
    "event_type": "api_call",
    "endpoint": "/api/users",
    "duration_ms": 5500,
    "status": "success",
    "http_status": 200
  }'
```

### Trigger Demo Scenario
```bash
# Requires JWT token from login
curl -X POST http://localhost:8000/demo/trigger \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "your-project-uuid",
    "scenario": "db_pool_exhaustion"
  }'
```

## 🔒 Security

### Multi-Tenancy Boundary
- **Incoming events**: Validated against project API key (never trust client)
- **Dashboard queries**: Filtered by authenticated user's projects
- **WebSocket**: Only users who own the project can subscribe

### Secrets
- Never commit `.env` files
- Rotate `SECRET_KEY` in production
- Use strong API keys (generated with `secrets.token_urlsafe()`)

## 📊 Monitoring

### Database Health
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT query, mean_exec_time FROM pg_stat_statements 
ORDER BY mean_exec_time DESC LIMIT 5;
```

### Logs
```bash
# Backend
tail -f <backend-log-file>

# Watch for ERROR, WARNING
# Check WebSocket connections
# Monitor queue depth
```

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| `401 Unauthorized` | Token expired. Auth context auto-refreshes, but check localStorage. |
| `CORS Error` | Backend CORS enabled. For prod, set `ALLOWED_HOSTS` in .env |
| `WebSocket closes immediately` | Token must be query param: `/live/{id}?token=TOKEN` |
| `Events not creating incidents` | Check API key, verify thresholds in `Core/settings.py` |
| `pgvector not found` | Run: `CREATE EXTENSION vector;` in PostgreSQL |
| `Gemini errors` | Verify API key, check quota at console.cloud.google.com |

## 📋 Project Structure

```
sentinel/
├── backend/              # FastAPI server
│   ├── Core/            # Business logic (AI pipeline, anomaly detection)
│   ├── Models/          # SQLAlchemy ORM models
│   ├── Router/          # API endpoints
│   └── Schemas/         # Pydantic validation
│
├── Frontend/            # React TypeScript app
│   ├── src/
│   │   ├── config/api.ts        # API service layer ⭐ NEW
│   │   ├── config/types.tsx     # TypeScript types ⭐ NEW
│   │   ├── context/auth_context # Auth session ⭐ ENHANCED
│   │   ├── pages/               # Page components ⭐ INTEGRATED
│   │   └── components/          # Reusable components
│   └── .env                     # Frontend config ⭐ NEW
│
├── INTEGRATION.md               # Full architecture ⭐ NEW
├── FRONTEND_QUICKSTART.md       # Frontend guide ⭐ NEW
├── BACKEND_QUICKSTART.md        # Backend guide ⭐ NEW
└── README.md                    # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

MIT License - see [LICENSE](./LICENSE) file for details

## 🗺️ Roadmap

- [x] Full frontend-backend integration
- [x] TypeScript types & API service
- [x] WebSocket support
- [ ] Email/Slack notifications
- [ ] Custom webhooks
- [ ] Mobile app
- [ ] On-prem deployment guide
- [ ] OpenTelemetry integration
- [ ] Advanced alerting policies

## 🙋 Support

- 📖 **Documentation**: [INTEGRATION.md](./INTEGRATION.md)
- 🐛 **Issues**: GitHub Issues
- 💬 **Discussions**: GitHub Discussions
- 📧 **Email**: support@sentinel-ai.dev

## ⭐ What's New

### Latest Integration (This Session)
- ✅ Complete TypeScript type system
- ✅ Organized API service layer (`api.ts`)
- ✅ Enhanced auth context with session management
- ✅ Integrated all pages with backend
- ✅ WebSocket helpers for live updates
- ✅ Comprehensive documentation
- ✅ Environment configuration examples

---

**Made with ❤️ for developers who want to stop guessing and start knowing when their apps break.**

*Questions? Check out [INTEGRATION.md](./INTEGRATION.md) for complete documentation.*


---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │     │   Backend   │     │  Postgres   │
│  (React)    │     │  (FastAPI)  │     │     DB      │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │  events           │  events           │  polled snapshots
       └───────────┬───────┴───────────┬───────┘
                    ▼                   
          ┌───────────────────┐        
          │  Ingestion API     │  POST /events
          │  (FastAPI)         │  → validates API key, resolves project_id
          └─────────┬──────────┘
                    ▼
          ┌───────────────────┐
          │   Redis Queue      │  decouples ingestion from processing
          └─────────┬──────────┘
                    ▼
          ┌───────────────────┐        ┌──────────────────────┐
          │      Worker        │◄──────►│  RAG Layer            │
          │  threshold checks  │        │  Postgres + pgvector  │
          │  + LLM call        │        │  (past incidents)     │
          └─────────┬──────────┘        └──────────────────────┘
                    ▼
          ┌───────────────────┐
          │    WebSocket        │  pushed to project:<id> channel
          └─────────┬──────────┘
                    ▼
          ┌───────────────────┐
          │   Dashboard         │  live architecture diagram + incident feed
          │  (React + WS)       │
          └───────────────────┘
```

**Demo/target app** — a small React frontend + FastAPI backend + Postgres DB (e.g. a checkout flow), built specifically so it can be broken on demand.

**Instrumentation** — each layer sends lightweight health events to Sentinel: the frontend reports per-call timing/errors, the backend reports per-request timing/errors plus internal state, and the DB is polled for connection/query health rather than instrumented per query.

**Ingestion API** — receives events at `POST /events` and pushes them onto a Redis queue instead of processing inline, so ingestion stays fast under load.

**Worker service** — consumes the queue, runs anomaly checks against thresholds, and when something crosses a threshold, calls the LLM with the event context.

**RAG layer** — Postgres + pgvector storing a seeded set of past incidents/runbooks. The worker embeds the current issue and retrieves the closest matches, scoped to the correct project, to ground the LLM's explanation.

**Dashboard** — a live architecture diagram (Frontend / Backend / DB boxes) that changes color with health, plus a live incident feed with AI explanations.

**Cache (Redis)** — caches repeated embedding lookups and frequent incident matches to cut LLM cost and latency.

---

## Data Flow (End-to-End)

| Step | Component | What Happens |
|------|-----------|---------------|
| 1 | Demo app | An issue is triggered (e.g. DB pool exhausted) |
| 2 | Ingestion API | Health event received + API key validated, pushed to Redis queue |
| 3 | Worker | Picks up event, checks against thresholds |
| 4 | RAG store | Worker embeds issue, retrieves similar past incidents (same project only) |
| 5 | LLM | Generates severity + root-cause explanation + fix suggestion |
| 6 | WebSocket | Result pushed live to that project's dashboard channel |
| 7 | Dashboard | Architecture box turns red, incident card appears with explanation |

---

## Instrumentation

### Frontend

One interceptor wraps every `fetch`/`axios` call app-wide — nothing manual per button. On failure, timeout, or slow response, it fires an event via `navigator.sendBeacon()` so it never blocks the UI.

| Field | Meaning |
|-------|---------|
| `endpoint` | Which API route was called (e.g. `/checkout`) |
| `duration_ms` | Time from request sent to response received |
| `status` | `success` / `error` / `timeout` |
| `http_status` | HTTP code returned (200, 500, 504, etc.) |
| `page` | Page/component that triggered the call |
| `timestamp` | When it happened |

```json
{
  "source": "frontend",
  "event_type": "api_call",
  "endpoint": "/checkout",
  "duration_ms": 4200,
  "status": "timeout",
  "http_status": 504,
  "page": "/checkout",
  "timestamp": "2026-07-26T10:15:00Z"
}
```

### Backend

One FastAPI middleware wraps every route. It measures internal latency, catches errors, and reports its own internal state — independent of what the frontend observed for the same request.

| Field | Meaning |
|-------|---------|
| `endpoint` | Route that was hit |
| `duration_ms` | How long the handler took internally |
| `status` | `success` / `error` |
| `error_type` | If it failed — DB timeout, validation error, etc. |
| `queue_depth` | How many jobs are waiting (backend load) |
| `db_query_time_ms` | How long the DB call inside this request took |
| `timestamp` | When it happened |

**Why send both frontend and backend events for the same request?** Comparing what each layer saw is how Sentinel identifies the true root cause:
- Both report failure → the backend/DB is likely the source
- Only the frontend reports failure, no backend event arrives → the issue is network/infra, not application code
- Backend was fast and healthy but the frontend still reported slowness → the problem is likely frontend-side rendering

### Database

Unlike the frontend/backend, the DB is **not** instrumented per-request — that's expensive and fragile. A small background job polls Postgres's own stats every few seconds and reports a health snapshot.

| Field | Meaning |
|-------|---------|
| `active_connections` | Connections currently open |
| `pool_usage_pct` | How full the connection pool is |
| `slow_queries` | Top N queries by execution time right now |
| `timestamp` | When this snapshot was taken |

```sql
-- connection pool usage
SELECT count(*) FROM pg_stat_activity;

-- slow queries
SELECT query, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 5;
```

---

## Connecting Your App to Sentinel

| Layer | How it connects |
|-------|------------------|
| Frontend | Interceptor sends events to Sentinel's public URL over HTTPS, with the project's API key attached as a header |
| Backend | Same as frontend — or, if backend and Sentinel share infrastructure, writes directly into the shared Redis queue, skipping the HTTP hop |
| Database | A read-only connection string to the target Postgres instance; runs as a small background script/cron and pushes snapshots the same way as the other layers |

- **Same Docker network (hackathon/local):** all services call Sentinel by its service name, e.g. `http://sentinel-api:8000/events` — no public internet involved.
- **Separately deployed (production-like):** each service is given Sentinel's public URL and sends events over HTTPS with an API key header so requests can be authenticated and attributed.

> **Configuration rule:** Sentinel's URL and API key are always environment variables (`SENTINEL_URL`, `SENTINEL_API_KEY`) in each service — never hardcoded — so switching between local and deployed environments requires no code changes.

---

## Multi-Tenancy

The API key is the identity for **incoming** data; the logged-in session is the identity for **outgoing** data. Everything else follows from these two facts.

**Incoming data (frontend/backend/DB → Sentinel):**
- Every request to `/events` carries the project's API key in the `Authorization` header, never in the body
- Sentinel hashes the incoming key and looks up which project it belongs to — unknown/invalid keys are rejected (401)
- The resolved `project_id` is attached server-side to the event before it is stored — the client never supplies `project_id` directly

**Outgoing data (Sentinel → dashboard):**
- The user logs in with email/password (or OAuth) — this resolves to their `user_id`
- Their projects are looked up via `projects.user_id = current_user`
- Every dashboard query (incidents, RAG matches, live feed) filters by `project_id` derived from the session, never from a client-supplied parameter
- WebSocket connections join a room/channel scoped to the project (e.g. a Redis pub/sub channel named `project:<id>`), so results are only pushed to clients subscribed to that project's channel

> **The one rule that matters most:** `project_id` is always derived server-side from an authenticated identity (API key or session) — never trusted from a client-supplied field. That is the actual security boundary; everything else is filtering.

---

## Onboarding Flow

1. User signs up / logs in to Sentinel (email/password or OAuth)
2. User clicks **"Add Project"** and enters a project name — the only manual input required
3. Sentinel generates and displays a unique API key + Sentinel URL for that project, to copy once
4. User adds the interceptor (frontend), middleware (backend), and poller script (DB) to their own codebase, pointing at the API key + URL via env vars — a one-time code change, not a UI configuration step
5. Events start flowing in, tagged to that project via the API key
6. User's dashboard shows only their project's live architecture diagram and incident feed

---

## Database Schema

| Table | Columns |
|-------|---------|
| `users` | `id`, `email`, `password_hash`, `created_at` |
| `projects` | `id`, `user_id` (FK), `name`, `created_at` |
| `api_keys` | `id`, `project_id` (FK), `key_hash`, `created_at` |
| `events` | `id`, `project_id` (FK), `source` (frontend/backend/db), `event_type`, `payload` (JSON), `created_at` |
| `incidents` | `id`, `project_id` (FK), `title`, `severity`, `summary` (AI-generated), `source_layer`, `status`, `created_at` |
| `incident_embeddings` | `id`, `project_id` (FK), `incident_id` (FK), `embedding` (vector) — used for similarity search |
| `runbooks` | `id`, `project_id` (FK), `incident_id` (FK), `resolution_text`, `created_at` — how past incidents were fixed |

Every table beyond `users`/`projects`/`api_keys` carries a `project_id` foreign key, and every read query filters by it. This is the entire multi-tenancy mechanism — no separate databases per customer needed.

---

## API Endpoints

| Method & Path | Description |
|----------------|--------------|
| `POST /events` | Receive a health event; validates API key, resolves `project_id`, pushes to queue |
| `GET /incidents` | List incidents for the authenticated user's project(s) |
| `GET /incidents/{id}` | Incident detail with AI summary + similar past incidents (same project only) |
| `WS /live` | WebSocket stream, joined to the caller's project channel, pushing new incidents in real time |
| `POST /demo/trigger` | Manually trigger a synthetic failure (for the hackathon demo button) |
| `POST /projects` | Create a project and issue its API key |

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Backend API | FastAPI | Fast, async, already familiar |
| Queue | Redis Streams / Celery | Decouples ingestion from processing |
| Database | PostgreSQL + pgvector | Relational + vector search in one DB |
| Cache | Redis | Cache embeddings / frequent lookups |
| Realtime | WebSockets (FastAPI native) | Push live updates to dashboard |
| LLM | LangChain + Claude/OpenAI API | Summarization + RAG grounding |
| Frontend | React + TypeScript | Dashboard + demo app UI |
| Auth | JWT with refresh rotation | Session identity for dashboard access |
| Deployment | Docker Compose | Separate containers: API, worker, Postgres, Redis, frontend |

---

## Demo Script

1. Dashboard is open, showing green Frontend / Backend / DB boxes — system healthy
2. Click **"Simulate Failure"** — e.g. hammer the DB with requests to exhaust the connection pool
3. DB box turns red within seconds; an incident card appears in the live feed
4. Click the card — AI explanation shows what failed, likely cause, which layer is the real root cause vs. a symptom
5. Below that: **"Similar Past Incident"** pulled via RAG, with how it was resolved before
6. Close by walking through the pipeline: event → queue → worker → RAG → LLM → WebSocket → dashboard

---

## Build Order (24–36hr Hackathon)

| Phase | Task |
|-------|------|
| 1 | Demo app skeleton (React + FastAPI + Postgres); seed 3–5 fake past incidents |
| 2 | Ingestion API + Redis queue wired up; `project_id` resolved from API key |
| 3 | Worker: threshold checks + LLM call for severity/summary |
| 4 | pgvector similarity search wired into worker, scoped by `project_id` (RAG step) |
| 5 | WebSocket push (per-project channel) + dashboard live feed + architecture diagram |
| 6 | "Simulate Failure" button + polish + rehearse demo script |

---

## Stretch Goals

- Full self-serve onboarding UI (project creation, API key management, regeneration)
- Slack/email notification on critical incidents
- Auto-suggested fix as a code diff, not just text explanation
- Role-based dashboard access within a project (on-call engineer vs admin)

---

## Resume Framing

> Built a multi-tenant, distributed incident-response platform that ingests health signals across frontend, backend, and database layers via a Redis-queued FastAPI pipeline; used pgvector-based RAG scoped per project to ground LLM root-cause analysis in historical incident data; delivered live per-tenant updates via WebSockets and Dockerized the full multi-service deployment.

---

## License

MIT