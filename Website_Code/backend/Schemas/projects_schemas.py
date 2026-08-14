from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any, List


class ProjectCreate(BaseModel):
    name: str
    frontend_url: str
    backend_url: str
    database_type: Optional[str] = None
    database_host: Optional[str] = None
    database_port: Optional[int] = None
    database_name: Optional[str] = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    auth_id: UUID
    name: str
    frontend_url: str
    backend_url: str
    database_type: Optional[str]
    database_host: Optional[str]
    database_port: Optional[int]
    database_name: Optional[str]
    api_key: str
    created_at: datetime


class ProjectListResponse(ProjectResponse):
    pass


class EventCreate(BaseModel):
    source: str  # "frontend" | "backend" | "db"
    event_type: str
    endpoint: Optional[str] = None
    duration_ms: Optional[int] = None
    status: Optional[str] = None  # success | error | timeout
    http_status: Optional[int] = None
    error_type: Optional[str] = None
    queue_depth: Optional[int] = None
    db_query_time_ms: Optional[int] = None
    page: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    source: str
    event_type: str
    endpoint: Optional[str]
    duration_ms: Optional[int]
    status: Optional[str]
    http_status: Optional[int]
    payload: Optional[Dict[str, Any]]
    created_at: datetime


class DBSnapshotCreate(BaseModel):
    active_connections: Optional[int] = None
    pool_usage_pct: Optional[int] = None
    slow_queries: Optional[List[Dict[str, Any]]] = None


class LayerHealth(BaseModel):
    status: str  # healthy | unhealthy | unknown
    last_event_at: Optional[datetime] = None


class ProjectHealthResponse(BaseModel):
    frontend: LayerHealth
    backend: LayerHealth
    database: LayerHealth
    open_incidents: int
    critical_incidents: int
