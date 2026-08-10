# Sentinel Backend Quick Start - FastAPI Setup

## Prerequisites

- Python 3.10+
- PostgreSQL 12+ (with pgvector extension)
- Redis (for queue)
- Gemini API key (or OpenAI)

## Installation

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Database Setup

#### Install pgvector extension
```bash
# Connect to your PostgreSQL database
psql -U postgres -d your_database

# Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;
```

#### Set Environment Variables
Create `.env` file:
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/sentinel_db

# Auth
SECRET_KEY=generate-a-random-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=120
REFRESH_TOKEN_EXPIRES_DAYS=30

# Gemini/LLM
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIM=768

# CORS
ALLOWED_HOSTS=*

# Anomaly Detection Thresholds
LATENCY_WARNING_MS=2000
LATENCY_CRITICAL_MS=5000
DB_POOL_WARNING_PCT=80
DB_POOL_CRITICAL_PCT=95
RAG_TOP_K=3
```

### 3. Database Migrations

```bash
# Create migrations (if not already done)
alembic revision --autogenerate -m "Initial schema"

# Apply migrations
alembic upgrade head
```

### 4. Seed Data (Optional)

```python
# Add sample incidents for RAG
python -c "
from backend.Database.database import SessionLocal
from backend.Models.incidents_model import Incidents
from datetime import datetime

db = SessionLocal()
# Add past incidents for RAG to use
db.close()
"
```

## Running the Server

### Development
```bash
# Auto-reload on code changes
python -m backend.main
```

### Production
```bash
# Using Gunicorn + Uvicorn
gunicorn backend.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## Project Structure

```
backend/
├── __init__.py
├── main.py                 # FastAPI app entry
├── requirements.txt        # Python dependencies
├── alembic/               # Database migrations
├── Core/
│   ├── settings.py        # Environment config
│   ├── jwt.py             # JWT token handling
│   ├── dependencies.py    # Dependency injection
│   ├── anomaly.py         # Threshold checks
│   ├── incident_pipeline.py # AI incident processing
│   └── ws_manager.py      # WebSocket management
├── Database/
│   └── database.py        # SQLAlchemy setup
├── Models/
│   ├── auth_model.py      # User & auth models
│   ├── project_model.py   # Project & events models
│   ├── incidents_model.py # Incident models
│   ├── embedding_model.py # RAG embeddings
│   └── __init__.py
├── Schemas/              # Pydantic schemas (validation)
│   ├── auth_schema.py
│   ├── projects_schemas.py
│   ├── incident_schema.py
│   ├── demo_schema.py
│   └── embedding_schema.py
└── Router/              # API routes
    ├── auth_router.py
    ├── projects_router.py
    ├── incidents_router.py
    ├── live_router.py    # WebSocket
    └── demo_router.py
```

## Core Components

### 1. Authentication (JWT)
- Located: `Core/jwt.py`, `Router/auth_router.py`
- Features:
  - Token-based auth with refresh
  - Password hashing with bcrypt
  - Multi-user support
  - Profile management

### 2. Project Management
- Located: `Router/projects_router.py`, `Models/project_model.py`
- Features:
  - Multi-tenant projects
  - API key generation
  - Health monitoring
  - Event ingestion

### 3. Incident Detection
- Located: `Core/anomaly.py`, `Core/incident_pipeline.py`
- Features:
  - Threshold-based anomaly detection
  - AI-powered root cause analysis
  - Gemini integration
  - RAG-grounded suggestions

### 4. RAG (Retrieval-Augmented Generation)
- Located: `Models/embedding_model.py`, `Core/incident_pipeline.py`
- Features:
  - pgvector similarity search
  - Historical incident matching
  - Grounding for LLM responses
  - Per-project scoping

### 5. Real-time Updates
- Located: `Router/live_router.py`, `Core/ws_manager.py`
- Features:
  - WebSocket connections
  - Per-project channels
  - Live incident notifications
  - Health status updates

### 6. Demo Scenarios
- Located: `Router/demo_router.py`
- Scenarios:
  - Latency spike
  - Error spike
  - Frontend timeout
  - DB pool exhaustion

## Key Endpoints

### Authentication
```
POST   /auth/signup        - Create account
POST   /auth/login         - Login
POST   /auth/refresh       - Refresh token
POST   /auth/createprofile - Create profile
GET    /auth/getprofile    - Get profile
PUT    /auth/updateprofile - Update profile
```

### Projects
```
POST   /project/create                    - Create project
GET    /project/myprojectlist             - List user's projects
GET    /project/{project_id}              - Get project details
PUT    /project/{project_id}/regenerate-key - Regenerate API key
DELETE /project/{project_id}              - Delete project
GET    /project/{project_id}/health       - Get layer health
GET    /project/{project_id}/events       - List events
```

### Event Ingestion (Instrumentation)
```
POST   /project/event/postproject - Send health event (requires API key)
POST   /project/db-snapshot       - Send DB snapshot (requires API key)
```

### Incidents
```
GET    /incidents                      - List all incidents
GET    /incidents/{incident_id}        - Get incident detail
PUT    /incidents/{incident_id}        - Update incident
POST   /incidents/{incident_id}/resolve - Resolve incident
DELETE /incidents/{incident_id}        - Delete incident
GET    /incidents/{incident_id}/runbooks - List runbooks
PUT    /runbooks/{runbook_id}          - Update runbook
DELETE /runbooks/{runbook_id}          - Delete runbook
```

### WebSocket
```
WS     /live/{project_id}?token=TOKEN - Live incident stream
```

### Demo
```
POST   /demo/trigger - Trigger demo scenario
```

## Dependency Injection

FastAPI dependencies handle:
- Database session: `Depends(get_db)`
- Current user: `Depends(get_current_user)`
- API key validation: `Depends(resolve_project_from_api_key)`
- WebSocket auth: `get_user_from_token_ws(token)`

## Database Models

### Users
```python
class Auth_User(Base):
    id: UUID
    username: str (unique)
    password: str (hashed)
    is_active: bool
    created_at: DateTime
```

### Projects
```python
class Projects(Base):
    id: UUID
    auth_id: UUID (FK to Auth_User)
    name: str
    frontend_url: str
    backend_url: str
    database_type: str (nullable)
    database_host: str (nullable)
    database_port: int (nullable)
    database_name: str (nullable)
    api_key: str (unique, hashed)
    created_at: DateTime
```

### Events
```python
class Project_Events(Base):
    id: UUID
    project_id: UUID (FK to Projects)
    source: str (frontend/backend/db)
    event_type: str
    endpoint: str (nullable)
    duration_ms: int (nullable)
    status: str (success/error/timeout)
    http_status: int (nullable)
    payload: JSON (nullable)
    created_at: DateTime
```

### Incidents
```python
class Incidents(Base):
    id: UUID
    project_id: UUID (FK)
    title: str
    severity: str (critical/warning)
    summary: str (AI-generated)
    root_cause: str (nullable)
    source_layer: str (frontend/backend/db)
    status: str (Open/In Progress/Resolved)
    created_at: DateTime
    resolved_at: DateTime (nullable)
```

### Embeddings (RAG)
```python
class IncidentEmbeddings(Base):
    id: UUID
    project_id: UUID (FK)
    incident_id: UUID (FK)
    embedding: Vector[768]  # pgvector
```

## Configuration

### Thresholds (anomaly detection)
Edit `Core/settings.py` or .env:
```env
LATENCY_WARNING_MS=2000        # Yellow if > 2s
LATENCY_CRITICAL_MS=5000       # Red if > 5s
DB_POOL_WARNING_PCT=80         # Yellow if > 80%
DB_POOL_CRITICAL_PCT=95        # Red if > 95%
```

### LLM Settings
```env
GEMINI_API_KEY=...             # Get from https://aistudio.google.com
GEMINI_MODEL=gemini-2.5-flash  # Model to use
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIM=768              # pgvector dimension
```

### Token Expiry
```env
ACCESS_TOKEN_EXPIRE_MINUTES=120   # 2 hours
REFRESH_TOKEN_EXPIRES_DAYS=30     # 30 days
```

## Testing

### Unit Tests
```bash
pytest tests/ -v
```

### Manual Testing
```bash
# Test auth
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "pass123"}'

# Test event ingestion
curl -X POST http://localhost:8000/project/event/postproject \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "frontend",
    "event_type": "api_call",
    "endpoint": "/checkout",
    "duration_ms": 5500,
    "status": "timeout",
    "http_status": 504
  }'
```

## Monitoring

### Logs
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Database Monitoring
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT query, mean_exec_time FROM pg_stat_statements 
ORDER BY mean_exec_time DESC LIMIT 5;
```

### API Metrics
- Use FastAPI's built-in metrics
- Or integrate with Prometheus/Grafana

## Common Issues

### Database Connection Failed
- Check DATABASE_URL in .env
- Ensure PostgreSQL is running
- Verify credentials

### pgvector Not Found
- Install pgvector extension: `CREATE EXTENSION vector;`
- Restart database connection

### Gemini API Errors
- Verify GEMINI_API_KEY is valid
- Check quota limits
- Try different model

### Token Invalid
- Check SECRET_KEY is set consistently
- Verify token not expired
- Check Authorization header format: `Bearer <token>`

### WebSocket Connection Fails
- Token must be passed as query: `?token=YOUR_TOKEN`
- Ensure project_id exists and user owns it
- Check browser WebSocket support

## Production Deployment

### Environment
```env
# Use strong SECRET_KEY
SECRET_KEY=generate-with-secrets.token_urlsafe(32)

# Use PostgreSQL with SSL
DATABASE_URL=postgresql+psycopg://user:pass@prod-db:5432/db?sslmode=require

# CORS restrictions
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Production LLM
GEMINI_API_KEY=production-key
```

### Database Backups
```bash
pg_dump sentinel_db > backup.sql
# Or use managed database backups
```

### Monitoring & Alerts
- Set up error logging (Sentry, etc.)
- Monitor database performance
- Alert on high error rates
- Track API latency

## Documentation

See [INTEGRATION.md](./INTEGRATION.md) for frontend integration details.

## Support

For issues, check the logs:
```bash
# See recent logs
tail -f /var/log/sentinel.log

# Or check FastAPI output
# Look for ERROR or WARNING messages
```
