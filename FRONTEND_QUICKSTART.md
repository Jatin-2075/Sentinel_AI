# Sentinel Quick Start - Frontend Integration

## Project Setup

### 1. Install Dependencies
```bash
cd Frontend
npm install
```

### 2. Environment Configuration
Create `.env` file in Frontend directory:
```env
VITE_API_BASE=http://localhost:8000
VITE_DEBUG=false
```

### 3. Start Development Server
```bash
npm run dev
```

## Using the API Service

All API methods are in `src/config/api.ts` and organized by domain:

### Authentication
```typescript
import { authAPI } from "@/config/api";

// Signup
await authAPI.signup({ username: "user", password: "pass" });

// Login
await authAPI.login({ username: "user", password: "pass" });

// Refresh token
await authAPI.refreshToken(refreshToken);

// Profile management
await authAPI.getProfile();
await authAPI.updateProfile({ name: "New Name" });
```

### Projects
```typescript
import { projectsAPI } from "@/config/api";

// Create project
const project = await projectsAPI.create({
  name: "My App",
  frontend_url: "https://app.example.com",
  backend_url: "https://api.example.com",
});

// List projects
const projects = await projectsAPI.listMyProjects();

// Get project health
const health = await projectsAPI.getHealth(projectId);

// List events
const events = await projectsAPI.listEvents(projectId, { 
  source: "frontend", 
  limit: 50 
});
```

### Incidents
```typescript
import { incidentsAPI } from "@/config/api";

// List incidents
const incidents = await incidentsAPI.list({ 
  projectId: "...", 
  severity: "critical" 
});

// Get incident details with similar incidents
const detail = await incidentsAPI.getDetail(incidentId);

// Update incident status
await incidentsAPI.update(incidentId, { 
  status: "In Progress" 
});

// Resolve incident
await incidentsAPI.resolve(incidentId, { 
  resolution_text: "Fixed by..." 
});
```

### Demo
```typescript
import { demoAPI } from "@/config/api";

// Trigger demo scenario
await demoAPI.triggerFailure({
  project_id: projectId,
  scenario: "db_pool_exhaustion",
});
```

### Live Updates
```typescript
import { api } from "@/config/api";

// Subscribe to live updates
const disconnect = api.connectLiveUpdates(
  projectId,
  accessToken,
  (incident) => console.log("New incident:", incident),
  (error) => console.error("Error:", error),
  () => console.log("Disconnected")
);

// Later: disconnect from updates
disconnect();
```

## Component Examples

### Using Auth Context
```typescript
import { useContext } from "react";
import { Authcontext } from "@/context/auth_context";

function MyComponent() {
  const auth = useContext(Authcontext);
  
  if (!auth?.isAuthenticated) return <p>Not logged in</p>;
  
  return <p>Welcome, {auth.user?.username}!</p>;
}
```

### Fetching Projects
```typescript
import { useEffect, useState } from "react";
import { projectsAPI } from "@/config/api";

function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsAPI.listMyProjects()
      .then(setProjects)
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;
  
  return (
    <div>
      {projects.map(p => (
        <div key={p.id}>{p.name}</div>
      ))}
    </div>
  );
}
```

### WebSocket Live Feed
```typescript
import { useEffect, useState, useContext } from "react";
import { api } from "@/config/api";
import { Authcontext } from "@/context/auth_context";
import type { Incident } from "@/config/types";

function LiveIncidents({ projectId }: { projectId: string }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const auth = useContext(Authcontext);

  useEffect(() => {
    if (!auth?.isAuthenticated) return;

    const token = localStorage.getItem("access")!;
    const disconnect = api.connectLiveUpdates(
      projectId,
      token,
      (incident) => setIncidents(prev => [incident, ...prev]),
      (error) => console.error("WebSocket error:", error),
      () => console.log("WebSocket closed")
    );

    return disconnect;
  }, [projectId, auth?.isAuthenticated]);

  return (
    <div>
      <h2>Live Incidents</h2>
      {incidents.map(i => (
        <div key={i.id}>
          <h3>{i.title}</h3>
          <p>Severity: {i.severity}</p>
          <p>Status: {i.status}</p>
        </div>
      ))}
    </div>
  );
}
```

## TypeScript Types

All types are exported from `@/config/types`:

```typescript
// User & Auth
User, TokenResponse, SignupPayload, LoginPayload

// Projects
Project, ProjectCreatePayload, ProjectHealth, LayerHealth

// Events
Event, EventCreatePayload, DBSnapshotPayload

// Incidents
Incident, IncidentDetailResponse, IncidentUpdatePayload, Runbook, SimilarIncident

// Demo
DemoTriggerPayload
```

## Environment Variables

### Frontend (VITE_* prefixed)
- `VITE_API_BASE`: Backend API URL (default: http://127.0.0.1:8000)
- `VITE_DEBUG`: Enable debug logging

### Accessing in Components
```typescript
const apiBase = import.meta.env.VITE_API_BASE;
const debug = import.meta.env.VITE_DEBUG;
```

## Common Patterns

### Protected Route
Already implemented in `context/protected_routes.tsx`:
```typescript
<ProtectedRoutes>
  {/* Only shown to authenticated users */}
</ProtectedRoutes>
```

### Error Handling
```typescript
try {
  const data = await projectsAPI.create(payload);
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error("Failed:", message);
}
```

### Loading States
```typescript
const [loading, setLoading] = useState(false);

async function handleSubmit() {
  setLoading(true);
  try {
    await api.someMethod();
  } finally {
    setLoading(false);
  }
}
```

## Backend API Reference

### Authentication Endpoints
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /auth/signup | None | Create account |
| POST | /auth/login | None | Login |
| POST | /auth/refresh | None | Refresh token |
| POST | /auth/createprofile | JWT | Create profile |
| GET | /auth/getprofile | JWT | Get profile |
| PUT | /auth/updateprofile | JWT | Update profile |

### Project Endpoints
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /project/create | JWT | Create project |
| GET | /project/myprojectlist | JWT | List projects |
| GET | /project/{id} | JWT | Get project |
| PUT | /project/{id}/regenerate-key | JWT | Regenerate key |
| DELETE | /project/{id} | JWT | Delete project |
| GET | /project/{id}/health | JWT | Get health status |
| GET | /project/{id}/events | JWT | List events |
| POST | /project/event/postproject | API Key | Send event |
| POST | /project/db-snapshot | API Key | Send DB snapshot |

### Incident Endpoints
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | /incidents | JWT | List incidents |
| GET | /incidents/{id} | JWT | Get detail |
| PUT | /incidents/{id} | JWT | Update incident |
| POST | /incidents/{id}/resolve | JWT | Resolve incident |
| DELETE | /incidents/{id} | JWT | Delete incident |
| GET | /incidents/{id}/runbooks | JWT | List runbooks |
| PUT | /runbooks/{id} | JWT | Update runbook |
| DELETE | /runbooks/{id} | JWT | Delete runbook |

### WebSocket
| Endpoint | Auth | Purpose |
|----------|------|---------|
| WS /live/{project_id} | Token param | Live incidents |

## Debugging

### Enable Console Logging
Set `VITE_DEBUG=true` in `.env`

### Check Token Status
```typescript
// In browser console
localStorage.getItem("access");
localStorage.getItem("refresh");
```

### Monitor Network Requests
Open DevTools → Network tab to see all API calls

### WebSocket Debugging
```typescript
const ws = new WebSocket(`ws://localhost:8000/live/${projectId}?token=${token}`);
ws.onmessage = (e) => console.log("Message:", e.data);
ws.onerror = (e) => console.error("Error:", e);
ws.onclose = () => console.log("Closed");
```

## Support

See [INTEGRATION.md](./INTEGRATION.md) for full documentation.
