# Sentinel Full-Stack Integration Guide

## Overview

Sentinel is fully integrated with seamless communication between frontend and backend. This document outlines the complete integration architecture, API endpoints, and how each component communicates.

## Architecture Summary

```
Frontend (React + TypeScript)
  ├─ API Service Layer (config/api.ts)
  │  └─ Handles all HTTP requests with auth & token refresh
  ├─ Auth Context (context/auth_context.tsx)
  │  └─ Manages user session and authentication lifecycle
  ├─ Pages & Components
  │  ├─ Auth page (sign-up/login)
  │  ├─ Dashboard (project list)
  │  ├─ Projects page (create/manage)
  │  └─ Project details (incidents, events, health)
  └─ WebSocket Client
     └─ Live incident updates via project channels

Backend (FastAPI)
  ├─ Auth Router (/auth/*)
  │  ├─ POST /auth/signup
  │  ├─ POST /auth/login
  │  ├─ POST /auth/refresh
  │  ├─ POST /auth/createprofile
  │  ├─ GET /auth/getprofile
  │  └─ PUT /auth/updateprofile
  ├─ Projects Router (/project/*)
  │  ├─ POST /project/create
  │  ├─ GET /project/myprojectlist
  │  ├─ GET /project/{project_id}
  │  ├─ PUT /project/{project_id}/regenerate-key
  │  ├─ DELETE /project/{project_id}
  │  ├─ GET /project/{project_id}/events
  │  ├─ GET /project/{project_id}/health
  │  ├─ POST /project/event/postproject (event ingestion)
  │  └─ POST /project/db-snapshot (database monitoring)
  ├─ Incidents Router (/incidents/*)
  │  ├─ GET /incidents
  │  ├─ GET /incidents/{incident_id}
  │  ├─ PUT /incidents/{incident_id}
  │  ├─ POST /incidents/{incident_id}/resolve
  │  ├─ DELETE /incidents/{incident_id}
  │  ├─ GET /incidents/{incident_id}/runbooks
  │  ├─ PUT /runbooks/{runbook_id}
  │  └─ DELETE /runbooks/{runbook_id}
  ├─ Demo Router (/demo/*)
  │  └─ POST /demo/trigger
  └─ Live Router (/live/*)
     └─ WS /live/{project_id} (WebSocket)

Database (PostgreSQL + pgvector)
  ├─ users
  ├─ projects
  ├─ api_keys
  ├─ events
  ├─ incidents
  ├─ incident_embeddings (for RAG)
  └─ runbooks (resolution history)
```

## API Domains

All API methods are organized by domain in [config/api.ts](src/config/api.ts):

### 1. Auth API (`api.auth`)
- `signup(payload)` - Create new account
- `login(payload)` - Login with credentials
- `refreshToken(refreshToken)` - Refresh access token
- `createProfile(data)` - Create user profile
- `getProfile()` - Get current user's profile
- `updateProfile(data)` - Update user profile

### 2. Projects API (`api.projects`)
- `create(payload)` - Create new project
- `listMyProjects()` - Get user's projects
- `getProject(projectId)` - Get project details
- `regenerateApiKey(projectId)` - Regenerate API key
- `delete(projectId)` - Delete project
- `getHealth(projectId)` - Get layer health (frontend/backend/db)
- `listEvents(projectId, options)` - List events with filtering

### 3. Events API (`api.events`)
*Used by frontend/backend interceptors and DB pollers*
- `send(payload, apiKey)` - Send health event
- `sendDBSnapshot(payload, apiKey)` - Send database snapshot

### 4. Incidents API (`api.incidents`)
- `list(options)` - List incidents with filtering
- `getDetail(incidentId)` - Get incident with similar incidents
- `update(incidentId, payload)` - Update incident
- `resolve(incidentId, payload)` - Resolve and save runbook
- `delete(incidentId)` - Delete incident
- `listRunbooks(incidentId)` - Get runbooks for incident
- `updateRunbook(runbookId, payload)` - Update runbook
- `deleteRunbook(runbookId)` - Delete runbook

### 5. Demo API (`api.demo`)
- `triggerFailure(payload)` - Trigger demo scenario

### 6. WebSocket API
- `createWebSocketConnection(projectId, accessToken)` - Create WS connection
- `connectLiveUpdates(projectId, accessToken, callbacks)` - Handle live updates

## Frontend-Backend Communication Flow

### Authentication Flow
```
1. User submits signup/login form
   └─> auth.tsx calls authContext.signup() or authContext.login()

2. Auth context calls api.auth.signup() or api.auth.login()
   └─> connecting_api.tsx handles HTTP request
       └─> Backend auth_router returns tokens

3. Auth context stores tokens in localStorage
   └─> Updates user state in context

4. Automatic redirect to dashboard
   └─> Protected routes check authContext.isAuthenticated
```

### Project Creation Flow
```
1. User clicks "Create Project"
   └─> Projects page navigates to add modal

2. User fills form and submits
   └─> Modal calls api.projects.create(payload)
       └─> connecting_api.tsx attaches Authorization header
           └─> Backend /project/create creates project
               └─> Returns project with API key

3. Modal displays success with API key
   └─> User can copy API key for instrumentation
```

### Incident Detection Flow
```
1. Frontend/Backend instrumentation sends events
   └─> Uses eventsAPI.send() with API key authentication
       └─> Backend /project/event/postproject receives event
           └─> Anomaly threshold check
               └─> If triggered: AI pipeline + embedding + RAG
                   └─> Creates Incident record
                       └─> Broadcasts via WebSocket

2. Dashboard receives WebSocket notification
   └─> Incident appears in live feed
       └─> Architecture diagram updates color
```

### Health Monitoring Flow
```
1. Dashboard loads project page
   └─> Calls api.projects.getHealth(projectId)
       └─> Backend /project/{project_id}/health returns status
           └─> Shows Frontend/Backend/DB health

2. User can drill into incidents
   └─> Calls api.incidents.getDetail(incidentId)
       └─> Returns incident + similar incidents from RAG
```

## Environment Configuration

### Frontend (.env)
```env
VITE_API_BASE=http://127.0.0.1:8000
VITE_DEBUG=false
```

### Backend (.env)
```env
DATABASE_URL=postgresql://...
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=120
REFRESH_TOKEN_EXPIRES_DAYS=30
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-2.5-flash
EMBEDDING_DIM=768
ALLOWED_HOSTS=*
```

## Using the API Service

### Simple Example: List Projects
```typescript
import { projectsAPI } from "@/config/api";

function MyComponent() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    projectsAPI.listMyProjects()
      .then(setProjects)
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      {projects.map(p => (
        <div key={p.id}>{p.name}</div>
      ))}
    </div>
  );
}
```

### Real-time Updates Example: WebSocket
```typescript
import { api } from "@/config/api";

function LiveIncidents({ projectId }: { projectId: string }) {
  const [incidents, setIncidents] = useState([]);
  const authContext = useContext(Authcontext);

  useEffect(() => {
    if (!authContext?.user) return;

    const disconnect = api.connectLiveUpdates(
      projectId,
      localStorage.getItem("access")!,
      (incident) => setIncidents(prev => [incident, ...prev]),
      (error) => console.error("WebSocket error:", error),
      () => console.log("WebSocket closed")
    );

    return disconnect;
  }, [projectId, authContext?.user]);

  return (
    <div>
      {incidents.map(i => (
        <div key={i.id}>{i.title} - {i.severity}</div>
      ))}
    </div>
  );
}
```

## Instrumentation Setup

### Frontend Interceptor
```typescript
// In your frontend app
import { eventsAPI } from "@/config/api";

const apiKey = "your-project-api-key";

// Wrap your fetch calls
export async function monitoredFetch(endpoint, options) {
  const startTime = Date.now();
  try {
    const response = await fetch(endpoint, options);
    const duration = Date.now() - startTime;
    
    await eventsAPI.send({
      source: "frontend",
      event_type: "api_call",
      endpoint: endpoint,
      duration_ms: duration,
      status: response.ok ? "success" : "error",
      http_status: response.status,
      page: window.location.pathname,
    }, apiKey);
    
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    await eventsAPI.send({
      source: "frontend",
      event_type: "api_call",
      endpoint: endpoint,
      duration_ms: duration,
      status: "timeout",
      page: window.location.pathname,
    }, apiKey);
    throw error;
  }
}
```

### Backend Middleware
```python
# In your FastAPI app
from fastapi import FastAPI
from datetime import datetime
import httpx

app = FastAPI()

@app.middleware("http")
async def sentinel_middleware(request, call_next):
    start = datetime.utcnow()
    response = await call_next(request)
    duration_ms = (datetime.utcnow() - start).total_seconds() * 1000
    
    # Send to Sentinel
    await httpx.AsyncClient().post(
        f"{SENTINEL_URL}/project/event/postproject",
        json={
            "source": "backend",
            "event_type": "api_call",
            "endpoint": request.url.path,
            "duration_ms": int(duration_ms),
            "status": "success" if response.status_code < 400 else "error",
            "http_status": response.status_code,
        },
        headers={"Authorization": f"Bearer {API_KEY}"}
    )
    return response
```

### Database Poller
```python
# Background script/cron
import psycopg2
import httpx
from datetime import datetime

def poll_database():
    conn = psycopg2.connect("postgresql://...")
    cur = conn.cursor()
    
    # Check connection pool
    cur.execute("SELECT count(*) FROM pg_stat_activity;")
    active_connections = cur.fetchone()[0]
    
    # Get slow queries
    cur.execute("""
        SELECT query, mean_exec_time 
        FROM pg_stat_statements 
        ORDER BY mean_exec_time DESC 
        LIMIT 5;
    """)
    slow_queries = cur.fetchall()
    
    # Send to Sentinel
    httpx.post(
        f"{SENTINEL_URL}/project/db-snapshot",
        json={
            "active_connections": active_connections,
            "pool_usage_pct": (active_connections / pool_max) * 100,
            "slow_queries": [
                {"query": q, "mean_exec_time": t} 
                for q, t in slow_queries
            ],
        },
        headers={"Authorization": f"Bearer {API_KEY}"}
    )
```

## Multi-Tenancy & Security

All endpoints enforce multi-tenancy at the server level:
- **Incoming data**: Authenticated via API key (project-specific)
- **Outgoing data**: Authenticated via JWT session
- **Authorization**: Always derived server-side, never trusted from client

Example: When listing incidents, the backend:
1. Decodes JWT from Authorization header
2. Extracts user_id
3. Queries projects WHERE user_id = current_user
4. Returns only incidents from those projects

This means users cannot access data from other projects, even with valid tokens.

## Testing the Integration

### 1. Test Authentication
```bash
# Signup
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "password123"}'

# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "password123"}'
```

### 2. Test Project Creation
```bash
curl -X POST http://localhost:8000/project/create \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My App",
    "frontend_url": "https://app.example.com",
    "backend_url": "https://api.example.com"
  }'
```

### 3. Test Event Ingestion
```bash
curl -X POST http://localhost:8000/project/event/postproject \
  -H "Authorization: Bearer YOUR_PROJECT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "frontend",
    "event_type": "api_call",
    "endpoint": "/checkout",
    "duration_ms": 4200,
    "status": "timeout",
    "http_status": 504,
    "page": "/checkout"
  }'
```

### 4. Test WebSocket
```javascript
// In browser console
const ws = new WebSocket(
  "ws://localhost:8000/live/PROJECT_ID?token=YOUR_ACCESS_TOKEN"
);
ws.onmessage = (event) => console.log(JSON.parse(event.data));
```

## Common Issues & Solutions

### 401 Unauthorized
**Issue**: API returns 401  
**Solution**: Check token in localStorage. Auth context automatically refreshes tokens.

### CORS Error
**Issue**: Browser blocks cross-origin requests  
**Solution**: Backend has CORS enabled for all origins (development). For production, set `ALLOWED_HOSTS`.

### WebSocket Connection Failed
**Issue**: WebSocket connects but immediately closes  
**Solution**: Ensure token is passed as query parameter: `/live/{project_id}?token=YOUR_TOKEN`

### Events Not Appearing
**Issue**: Events sent but no incidents created  
**Solution**: Check API key is correct and threshold isn't too high. Check backend logs.

## Next Steps

1. **Deploy**: Set up production environment with proper URLs and secrets
2. **Instrumentation**: Add event interceptors to your actual frontend/backend
3. **Thresholds**: Tune anomaly detection thresholds in backend settings
4. **RAG Seeding**: Add past incidents to database for better suggestions
5. **Monitoring**: Set up alerts and notifications for critical incidents
