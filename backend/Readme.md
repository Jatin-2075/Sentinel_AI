# Sentinel — Developer README

## 1. What is Sentinel?

Sentinel is an observability system that monitors a project's:

* Frontend
* Backend/API
* PostgreSQL database

It receives health/error events, processes them asynchronously, detects anomalies, uses RAG + LLM to explain incidents, and pushes results to a live dashboard.

```text
Frontend ───────┐
Backend ────────┼──→ Sentinel API → Redis → Worker → PostgreSQL
Database ───────┘                              │
                                               ↓
                                           RAG + LLM
                                               │
                                               ↓
                                         WebSocket
                                               │
                                               ↓
                                          Dashboard
```

The core design is built around FastAPI ingestion → Redis → Worker → RAG/LLM → WebSocket dashboard.

---

## 2. Project Structure

```text
sentinel/
│
├── backend/
│   ├── main.py
│   │
│   ├── routes/
│   │   ├── auth.py
│   │   ├── projects.py
│   │   ├── events.py
│   │   └── incidents.py
│   │
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── project_service.py
│   │   └── event_service.py
│   │
│   └── dependencies.py
│
├── worker/
│   ├── worker.py
│   │
│   ├── tasks/
│   │   ├── process_event.py
│   │   ├── detect_anomaly.py
│   │   ├── analyze_incident.py
│   │   └── send_alert.py
│   │
│   └── services/
│       ├── rag_service.py
│       └── llm_service.py
│
├── shared/
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── redis.py
│   └── config.py
│
├── frontend/
│
├── tests/
│
├── docker-compose.yml
└── README.md
```

---

## 3. The Golden Rule

Whenever you're confused about **where code belongs**, ask:

> **Does this receive a request? → Backend**
>
> **Does this take a long/heavy job? → Worker**
>
> **Does this describe database data? → Model**
>
> **Does this validate API input/output? → Schema**
>
> **Does this communicate between API and worker? → Redis**
>
> **Does this contain reusable infrastructure? → Shared**

---

## 4. Backend

### Purpose

FastAPI is responsible for **talking to users and receiving events**. It should NOT do expensive processing.

Example endpoints:

```text
POST /events
POST /login
POST /projects
GET /incidents
GET /projects/{id}
```

```python
@router.post("/events")
async def receive_event(event: EventCreate):
    ...
```

The API should:

```text
Receive → Validate → Authenticate → Queue → Return
```

Not:

```text
Receive → Analyze → Run embeddings → Call LLM → Search RAG → Save everything → Finally respond 💀
```

The ingestion endpoint exists to keep event ingestion fast by pushing events onto Redis instead of processing them inline.

---

## 5. Routes

Routes contain **HTTP endpoints** and should be thin.

`backend/routes/events.py`

Bad:

```python
@router.post("/events")
async def create_event():
    # 200 lines of processing 😭
```

Better:

```python
@router.post("/events")
async def create_event(event: EventCreate):
    project = authenticate_project(event)
    await queue_event(event)
    return {"status": "queued"}
```

The actual processing belongs to the worker.

---

## 6. Services

Services contain **business logic**.

`backend/services/project_service.py`

```python
def create_project(...):
    ...
```

```text
Route → Service → Database
```

```python
@router.post("/projects")
def create_project(data: ProjectCreate):
    return project_service.create_project(data)
```

---

## 7. Schemas

Schemas are mainly for **API input/output validation**.

```python
class EventCreate(BaseModel):
    type: str
    message: str
    timestamp: datetime

class EventResponse(BaseModel):
    id: int
    type: str
    message: str
```

**Important:** the worker does not need every API schema. Create a shared/internal schema only if actually useful.

---

## 8. Models

Models represent **database tables** and are usable by both FastAPI and the worker.

```python
class Project(Base):
    id
    user_id
    name
    api_key_hash

class Event(Base):
    id
    project_id
    type
    message
    created_at

class Incident(Base):
    id
    project_id
    severity
    title
    explanation
```

---

## 9. Database

Put database setup in `shared/database.py`. Both services import it.

```text
FastAPI ──────→ shared/database.py
                    ↑
Worker ────────────┘
```

Don't create two completely different DB configurations.

---

## 10. Redis

Redis has two major jobs in Sentinel.

**Job 1 — Queue**

```text
FastAPI → Redis Queue → Worker
```

**Job 2 — Pub/Sub**

```text
Worker → Redis Pub/Sub → WebSocket → Dashboard
```

Redis can also cache expensive repeated lookups such as embeddings or incident matches.

---

## 11. Worker

The worker is **not another FastAPI application** — it's a process that waits for jobs.

`worker/worker.py`

```python
while True:
    job = get_job()
    process(job)
```

With Celery/Arq/RQ/etc., the queue system handles this loop for you.

---

## 12. Worker Tasks

Every task should ideally have **one clear responsibility**.

```text
worker/tasks/
    process_event.py
    detect_anomaly.py
    analyze_incident.py
    send_alert.py
```

**`process_event.py`**
```text
Raw event → Normalize → Save event → Run anomaly detection
```

**`detect_anomaly.py`**
```text
Event → Compare threshold → Normal? → Yes: finish | No: Create incident
```

**`analyze_incident.py`**
```text
Incident → Create embedding → Search pgvector → Retrieve similar incidents
         → Build prompt → LLM → Save explanation
```

**`send_alert.py`**
```text
Incident → Check severity → Send notification
```

---

## 13. The Complete Event Flow

This is the part you should memorize.

```text
User's Application
       │  API Key
       ↓
Sentinel FastAPI (POST /events)
       │  validate / authenticate
       ↓
   Redis Queue
       │
       ↓
    Worker
       │
       ↓
  Save Event
       │
       ↓
Anomaly Detection
   ┌────┴────┐
Normal     Anomaly
   │           │
 finish     Incident
               │
               ↓
          RAG Search
               │
               ↓
              LLM
               │
               ↓
        Save Explanation
               │
               ↓
         Redis Pub/Sub
               │
               ↓
           WebSocket
               │
               ↓
           Dashboard
```

---

## 14. User ID vs Project ID

This is VERY important. Don't trust `{"user_id": 123}` from the client.

Instead:

```text
Incoming API Key → Find project → project_id → Attach project_id server-side
```

The API key is the identity for incoming data; the logged-in session is the identity for dashboard access.

```text
Frontend/backend → API key → project_id
Dashboard        → login   → user_id → project_id
```

---

## 15. What Goes Into the Job?

Don't put an entire object/database connection into Redis. Prefer:

```python
{
    "event_id": 123,
    "project_id": 42
}
```

The worker then does:

```python
event = db.get(Event, event_id)
```

Because the database is the source of truth.

---

## 16. What Is Shared?

**Share these:**
```text
shared/
├── database.py
├── models.py
├── config.py
└── redis.py
```

**Potentially shared:**
```text
schemas.py
utils.py
```
(if both services genuinely need them)

**Don't share blindly:**
```text
routes/
FastAPI dependencies
HTTP middleware
Frontend code
```

The worker doesn't care about HTTP.

---

## 17. Example: Where Does a Function Go?

| Function | Location |
|---|---|
| `create_project()` | `backend/services/project_service.py` |
| `POST /projects` | `backend/routes/projects.py` |
| `Project` DB model | `shared/models.py` |
| `process_event()` | `worker/tasks/process_event.py` |
| `generate_embedding()` | `worker/services/rag_service.py` |
| `get_db()` | `shared/database.py` |
| `validate_api_key()` | `backend/services/auth_service.py` |
| `generate_llm_explanation()` | worker (expensive, asynchronous) |

---

## 18. Database Tables

Initial version:
```text
users
projects
events
incidents
incident_embeddings
```

Potentially:
```text
alerts
api_keys
runbooks
```

Relationships:
```text
User
 └── Projects
       ├── Events
       └── Incidents
              └── Embeddings
```

---

## 19. WebSocket

WebSocket belongs to the **FastAPI/backend side**. The worker shouldn't directly manage browser connections.

```text
Worker → Redis Pub/Sub → FastAPI WebSocket → Browser
```

```text
Worker  = produces result
FastAPI = delivers result
Frontend = displays result
```

---

## 20. If You're Unsure Where Something Goes

```text
Is it an HTTP endpoint?          → backend/routes
Is it business logic for an API? → backend/services
Is it a database table?          → shared/models
Is it API validation?            → schemas
Is it slow/expensive processing? → worker/tasks
Is it RAG/LLM processing?        → worker/services
Is it DB/Redis/config infra?     → shared/
```

---

## 21. The Architecture Build Order

Don't build everything simultaneously.

**Stage 1** — `FastAPI → PostgreSQL`
Auth, Projects, API keys, `/events`, events stored in DB.

**Stage 2** — `FastAPI → Redis → Worker → PostgreSQL`
Move event processing to the worker.

**Stage 3** — `Worker → Anomaly Detection`

**Stage 4** — `Worker → RAG → pgvector → LLM`

**Stage 5** — `Worker → Redis Pub/Sub → FastAPI WebSocket → React`

**Final architecture:**

```text
             ┌─────────────┐
             │   React     │
             └──────┬──────┘
                    │
              HTTP/WebSocket
                    │
             ┌──────▼──────┐
             │   FastAPI   │
             └──┬───────┬──┘
                │       │
              Postgres Redis
                │       │
                │       ▼
                │     Worker
                │       │
                │    ┌──┴───┐
                │    │ RAG  │
                │    │ LLM  │
                │    └──────┘
                │
                └───────────┘
```

**Biggest rule:** don't turn FastAPI into a giant `main.py` that does everything. Keep **API, business logic, worker jobs, DB models, and infrastructure separated**.