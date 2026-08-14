# Sentinel — Application Monitoring & Incident Intelligence

## 1. What is Sentinel?

Sentinel is an application monitoring system that collects telemetry from a user's **frontend and backend applications** through SDKs.

The SDK observes application requests and reports whether each request was a:

- `success`
- `failure`

Sentinel's backend receives this telemetry through **one ingestion API**, stores it, analyzes it, and eventually uses embeddings + AI/RAG to understand abnormal behavior and identify possible root causes.

### Core principle

> **SDK collects. Sentinel analyzes.**

The SDK should remain lightweight and should not perform heavy analysis.

---

# 2. The New MVP Architecture

The MVP has two SDKs:

- Sentinel Python SDK → backend applications
- Sentinel JavaScript/TypeScript SDK → frontend applications

Both SDKs communicate with the **same Sentinel ingestion endpoint**.

```text
                     USER APPLICATION
                 ┌─────────────────────┐
                 │                     │
          React Frontend        FastAPI Backend
                 │                     │
          Sentinel JS SDK      Sentinel Python SDK
                 │                     │
                 └──────────┬──────────┘
                            │
                            ▼
                 POST /api/v1/events
                            │
                            ▼
                  Sentinel FastAPI
                            │
                       Validation
                            │
                            ▼
                       Event Router
                            │
                  ┌─────────┴─────────┐
                  │                   │
             Frontend             Backend
              Events               Events
                  │                   │
                  ▼                   ▼
          Frontend Table        Backend Table
                  │                   │
                  ▼                   ▼
        Frontend Embeddings   Backend Embeddings
                  │                   │
                  └─────────┬─────────┘
                            │
                            ▼
                     Analysis Engine
                            │
                            ▼
                       Anomalies
                            │
                            ▼
                        Incidents
                            │
                            ▼
                     AI / RAG / RCA
```

---

# 3. What Exactly Does the SDK Send?

The SDK does **not** send the user's actual business data.

It sends telemetry describing what happened.

For example:

```text
Request:
POST /api/login

Status:
500

Duration:
2400ms

Result:
failure

Error:
DatabaseTimeout
```

The SDK should avoid collecting:

- Passwords
- JWT tokens
- Credit card information
- Request bodies containing sensitive information
- Unnecessary personal information

---

# 4. One Ingestion API

The MVP uses only one ingestion endpoint:

```http
POST /api/v1/events
```

Both SDKs use it.

```text
Python SDK
     │
     └──────────────┐
                    │
                    ▼
          POST /api/v1/events
                    ▲
                    │
     ┌──────────────┘
     │
JavaScript SDK
```

The event contains a field that identifies its source:

```json
{
  "source": "backend"
}
```

or:

```json
{
  "source": "frontend"
}
```

Sentinel then decides where the event belongs.

---

# 5. Event Schema

The initial event schema should be simple.

```python
class Event(BaseModel):
    source: Literal["frontend", "backend"]

    service: str
    environment: str
    timestamp: str

    method: str
    path: str

    status_code: int
    duration_ms: float

    result: Literal["success", "failure"]

    error_type: str | None = None
    error_message: str | None = None

    page: str | None = None
```

The important fields are:

```text
source
service
environment
timestamp
method
path
status_code
duration_ms
result
```

Additional fields can be added later.

---

# 6. Success and Failure

The SDK should primarily report the outcome of a request.

### Successful request

```json
{
  "source": "backend",
  "service": "api",
  "environment": "production",
  "method": "GET",
  "path": "/api/users",
  "status_code": 200,
  "duration_ms": 120,
  "result": "success"
}
```

### Failed request

```json
{
  "source": "backend",
  "service": "api",
  "environment": "production",
  "method": "POST",
  "path": "/api/login",
  "status_code": 500,
  "duration_ms": 2400,
  "result": "failure",
  "error_type": "DatabaseTimeout"
}
```

The SDK does not decide whether this failure is an incident.

It simply reports:

```text
success
```

or:

```text
failure
```

Sentinel determines the significance later.

---

# 7. Backend Processing Flow

After Sentinel receives an event:

```text
SDK
 │
 ▼
POST /api/v1/events
 │
 ▼
Pydantic Validation
 │
 ▼
Identify source
 │
 ├───────────────┐
 ▼               ▼
frontend        backend
 │               │
 ▼               ▼
Frontend DB     Backend DB
 │               │
 ▼               ▼
Embedding       Embedding
 │               │
 ▼               ▼
Analysis Engine
```

The ingestion API should remain lightweight.

It should not immediately perform expensive AI processing inside the request.

---

# 8. Database Design

The MVP should maintain separate logical tables for frontend and backend telemetry.

## Frontend Events

```text
frontend_events
-------------------------
id
service
environment
timestamp
method
path
page
status_code
duration_ms
result
error_type
error_message
```

## Backend Events

```text
backend_events
-------------------------
id
service
environment
timestamp
method
path
status_code
duration_ms
result
error_type
error_message
```

The separation makes analysis easier because frontend and backend telemetry have different characteristics.

---

# 9. Why Separate Frontend and Backend Data?

A frontend failure might look like:

```text
User opens /dashboard
↓
JavaScript TypeError
↓
Frontend failure
```

A backend failure might look like:

```text
POST /api/users
↓
Database timeout
↓
Backend failure
```

They are related, but they are not identical types of telemetry.

Therefore:

```text
Frontend Events
      ↓
Frontend analysis
      ↓
Frontend embeddings
```

and:

```text
Backend Events
      ↓
Backend analysis
      ↓
Backend embeddings
```

This gives Sentinel two different semantic spaces.

---

# 10. Embeddings

Embeddings are **not part of the SDK**.

The SDK only sends telemetry.

Sentinel creates embeddings after receiving/storing the event.

```text
SDK
 ↓
Event
 ↓
Database
 ↓
Create normalized event representation
 ↓
Embedding Model
 ↓
Vector Storage
```

## Frontend embeddings

Frontend events can be converted into representations such as:

```text
Frontend application experienced a failure
on /dashboard
with TypeError
during production
```

This representation is embedded and stored in the frontend vector store.

---

## Backend embeddings

Backend events can become:

```text
Backend payment-service experienced
POST /api/payment failure
with DatabaseTimeout
latency 2400ms
in production
```

This is embedded separately.

---

# 11. Important: Don't Embed Raw Data Blindly

Do not immediately do:

```python
embedding_model.embed(json.dumps(event))
```

for everything.

First normalize the event into meaningful information.

For example:

```text
service = payment-service
endpoint = POST /api/payment
result = failure
error = DatabaseTimeout
latency = 2400ms
environment = production
```

Then construct a clean textual representation.

This produces a much more useful semantic representation.

---

# 12. What Does Sentinel Analyze?

Initially, use simple statistics and rules.

For example:

```text
Total requests
Successful requests
Failed requests
Error rate
Average latency
Maximum latency
Requests per endpoint
Failures per endpoint
Repeated errors
Status-code distribution
```

Example:

```text
Requests: 10,000

Success: 9,700
Failure: 300

Error rate: 3%
```

If the normal error rate was:

```text
0.2%
```

Sentinel can identify:

```text
0.2% → normal
3.0% → abnormal
```

This is the beginning of anomaly detection.

---

# 13. Incident Detection

Sentinel eventually groups related failures.

Example:

```text
POST /api/payment
500
DatabaseTimeout
```

occurs:

```text
100 times
```

within:

```text
2 minutes
```

Sentinel can create:

```text
Incident #42

Service:
payment-service

Endpoint:
POST /api/payment

Error:
DatabaseTimeout

Occurrences:
100

Average latency:
2.4s

Status:
OPEN
```

---

# 14. Frontend + Backend Correlation

This is where Sentinel becomes more interesting.

Imagine:

```text
Frontend
POST /api/payment
↓
failure
```

and at approximately the same time:

```text
Backend
POST /api/payment
↓
500
↓
DatabaseTimeout
```

Sentinel can correlate them.

```text
Frontend failure
       │
       │ same endpoint
       │ same time
       ▼
Backend failure
       │
       ▼
DatabaseTimeout
```

The backend failure may be the actual cause of the frontend failure.

This correlation should happen in Sentinel's backend, not inside the SDK.

---

# 15. Future AI / RAG Pipeline

AI should come **after** reliable telemetry collection and basic detection.

The future pipeline:

```text
Frontend Events ──────┐
                      │
Backend Events ───────┤
                      ▼
                Anomaly Detection
                      │
                      ▼
                   Incident
                      │
             ┌────────┴────────┐
             │                 │
      Frontend Vector     Backend Vector
          Search              Search
             │                 │
             └────────┬────────┘
                      ▼
                 Relevant Events
                      │
                      ▼
                     RAG
                      │
                      ▼
                     LLM
                      │
                      ▼
              Root Cause Analysis
                      │
                      ▼
             Recommendation
```

Example final output:

```text
Incident:
Payment failures increased significantly.

Likely root cause:
Database connection pool exhaustion.

Evidence:
- 100 DatabaseTimeout failures
- Payment latency increased from 180ms → 2.4s
- Backend failures started at 15:40
- Frontend payment failures started shortly afterward
```

---

# 16. Python SDK

The Python SDK will be installed by backend developers.

```bash
pip install sentinel-sdk
```

Structure:

```text
sentinel-python-sdk/
│
├── pyproject.toml
├── README.md
│
└── sentinel/
    ├── __init__.py
    ├── client.py
    └── middleware.py
```

### client.py

Responsible for sending telemetry.

```python
class Sentinel:
    def __init__(self, api_key: str, endpoint: str):
        self.api_key = api_key
        self.endpoint = endpoint

    def send_event(self, event: dict):
        # Send event to Sentinel
        pass
```

### middleware.py

Responsible for observing backend requests.

It should capture:

```text
HTTP method
Endpoint
Status code
Response time
Success/failure
Exception
Timestamp
Environment
Service
```

The developer should not manually call:

```python
sentinel.send_event(...)
```

for every request.

Middleware should automate this.

---

# 17. JavaScript SDK

The frontend SDK will eventually be published as:

```bash
npm install @sentinel/sdk
```

Structure:

```text
sentinel-js-sdk/
│
├── package.json
│
└── src/
    ├── index.ts
    ├── client.ts
    └── error-handler.ts
```

It should observe:

```text
JavaScript errors
API failures
HTTP status
Request latency
Current page
Success/failure
Timestamp
Environment
```

Example:

```typescript
import Sentinel from "@sentinel/sdk";

Sentinel.init({
  apiKey: "YOUR_API_KEY",
});
```

After initialization, the SDK automatically sends telemetry to:

```http
POST /api/v1/events
```

---

# 18. Sentinel Backend Structure

```text
sentinel-backend/
│
├── app/
│   │
│   ├── main.py
│   │
│   ├── routes/
│   │   └── events.py
│   │
│   ├── schemas/
│   │   └── events.py
│   │
│   ├── models/
│   │   ├── frontend_event.py
│   │   └── backend_event.py
│   │
│   ├── services/
│   │   ├── ingestion.py
│   │   ├── analyzer.py
│   │   ├── embedding.py
│   │   └── correlation.py
│   │
│   └── core/
│       ├── config.py
│       └── database.py
│
└── requirements.txt
```

---

# 19. Development Order

Do not start with embeddings or AI.

Build the system incrementally.

## Phase 1 — One ingestion API

Build:

```http
POST /api/v1/events
```

Test it manually.

Send:

```json
{
  "source": "backend",
  "service": "test-api",
  "environment": "development",
  "method": "GET",
  "path": "/users",
  "status_code": 200,
  "duration_ms": 100,
  "result": "success"
}
```

Make sure Sentinel receives it.

---

## Phase 2 — Store Events

Add the database.

Separate events internally into:

```text
frontend_events
backend_events
```

Verify that data is stored correctly.

---

## Phase 3 — Python SDK

Create the Python SDK.

Test:

```text
FastAPI Application
       ↓
Python SDK
       ↓
POST /api/v1/events
       ↓
Sentinel
       ↓
backend_events
```

---

## Phase 4 — JavaScript SDK

Create the JavaScript SDK.

Test:

```text
React Application
       ↓
JavaScript SDK
       ↓
POST /api/v1/events
       ↓
Sentinel
       ↓
frontend_events
```

---

## Phase 5 — Dashboard

Create two views:

```text
Frontend Monitoring
```

and:

```text
Backend Monitoring
```

Show:

```text
Requests
Successes
Failures
Error rate
Latency
Recent failures
```

---

## Phase 6 — Detection

Implement simple rules first.

```text
Error rate
Latency spikes
Repeated failures
Status-code spikes
Endpoint failures
```

No AI yet.

---

## Phase 7 — Embeddings

Create separate embedding pipelines:

```text
Frontend Events
      ↓
Frontend Embedding
      ↓
Frontend Vector Store
```

and:

```text
Backend Events
      ↓
Backend Embedding
      ↓
Backend Vector Store
```

---

## Phase 8 — Correlation

Connect frontend and backend events using things such as:

```text
timestamp
endpoint
HTTP method
service
environment
request identifiers (if later introduced)
```

Goal:

```text
Frontend failure
      ↓
Find corresponding backend failure
      ↓
Determine likely source
```

---

## Phase 9 — RAG + LLM

Only after everything above works:

```text
Incident
 ↓
Retrieve relevant frontend events
 ↓
Retrieve relevant backend events
 ↓
Retrieve related historical incidents
 ↓
RAG
 ↓
LLM
 ↓
Root cause
 ↓
Recommendation
```

---

# 20. Final Architecture

The final MVP should be understood as:

```text
                 FRONTEND APP
                      │
               Sentinel JS SDK
                      │
                      │
                      ▼
                ┌───────────┐
                │           │
BACKEND APP ──► │  Sentinel │ ◄── One API
      │          │   API     │
Python SDK ─────►│           │
                └─────┬─────┘
                      │
                 Validation
                      │
                      ▼
                 Event Storage
                ┌─────┴─────┐
                │           │
                ▼           ▼
          Frontend DB   Backend DB
                │           │
                ▼           ▼
          Frontend       Backend
          Embeddings     Embeddings
                │           │
                └─────┬─────┘
                      ▼
                Anomaly Engine
                      │
                      ▼
                   Incident
                      │
                      ▼
                  Correlation
                      │
                      ▼
                     RAG
                      │
                      ▼
                     LLM
                      │
                      ▼
              Root Cause Analysis
```

# 21. The Most Important Rule

Keep the responsibilities separated.

```text
SDK
 │
 ├── Observe request
 ├── Collect telemetry
 └── Send ONE event
          │
          ▼
   Sentinel Ingestion API
          │
          ├── Validate
          ├── Store
          ├── Separate frontend/backend
          ├── Analyze
          ├── Create embeddings
          ├── Detect anomalies
          ├── Correlate events
          └── Eventually perform RAG + AI
```

**The SDK does not analyze.**

**The SDK does not create embeddings.**

**The SDK does not decide incidents.**

**The Sentinel backend does all of that.**

That separation keeps the SDK small and makes the actual Sentinel intelligence live where it belongs: **your backend.**
