from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..Database.database import get_db

from ..Models.project_model import Project_Events, Projects
from ..Models.incidents_model import Incidents
from ..Models.auth_model import Auth_User

from ..Schemas.projects_schemas import (
    ProjectCreate,
    ProjectResponse,
    ProjectListResponse,
    EventCreate,
    EventResponse,
    DBSnapshotCreate,
    ProjectHealthResponse,
    LayerHealth,
)
from ..Core.jwt import verify_password
from ..Core.dependencies import decode_access_token, get_api_key, get_current_user, get_user_from_token_ws
from ..Core.anomaly import evaluate_event
from ..Core.incident_pipeline import process_event

router = APIRouter(prefix="/project", tags=["Project"])


async def _maybe_trigger_pipeline(
    background_tasks: BackgroundTasks,
    project_id: UUID,
    event: Project_Events,
    source: str,
    payload: dict,
) -> Optional[str]:
    """Runs the threshold check synchronously (cheap) and, if tripped, schedules
    the AI incident pipeline (embedding + Gemini + RAG + websocket push) as a
    background task so the ingestion endpoint returns immediately."""
    triggered, reason = evaluate_event(source, payload)
    if triggered:
        background_tasks.add_task(process_event, project_id, event.id, reason)
    return reason if triggered else None


def _owned_project_or_404(db: Session, project_id: UUID, user: Auth_User) -> Projects:
    project = (
        db.query(Projects)
        .filter(Projects.id == project_id, Projects.auth_id == user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    return project


@router.post("/create", response_model=ProjectResponse)
async def create_project(
    payload: ProjectCreate,
    current_user: Auth_User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(Projects)
        .filter(
            Projects.auth_id == current_user.id,
            func.lower(Projects.name) == payload.name.strip().lower(),
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have a project with this name.",
        )
    key = get_api_key(23, db=db)

    new_project = Projects(
        auth_id=current_user.id,
        name=payload.name.strip(),
        api_key=key,
        **payload.model_dump(exclude={"name"}),
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project


@router.get("/myprojectlist", response_model=List[ProjectListResponse])
async def get_my_projects(
    current_user: Auth_User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    projects = (
        db.query(Projects)
        .filter(Projects.auth_id == current_user.id)
        .order_by(Projects.created_at.desc())
        .all()
    )
    return projects


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    current_user: Auth_User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _owned_project_or_404(db, project_id, current_user)


@router.put("/{project_id}/regenerate-key", response_model=ProjectResponse)
async def regenerate_api_key(
    project_id: UUID,
    current_user: Auth_User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _owned_project_or_404(db, project_id, current_user)
    project.api_key = get_api_key(23, db=db)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    current_user: Auth_User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _owned_project_or_404(db, project_id, current_user)
    db.delete(project)
    db.commit()


@router.get("/{project_id}/events", response_model=List[EventResponse])
async def list_events(
    project_id: UUID,
    source: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: Auth_User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _owned_project_or_404(db, project_id, current_user)
    q = db.query(Project_Events).filter(Project_Events.project_id == project_id)
    if source:
        q = q.filter(Project_Events.source == source)
    return (
        q.order_by(Project_Events.created_at.desc())
        .offset(skip)
        .limit(min(limit, 200))
        .all()
    )


@router.get("/{project_id}/health", response_model=ProjectHealthResponse)
async def project_health(
    project_id: UUID,
    current_user: Auth_User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Live status per layer (frontend/backend/db) for the architecture diagram,
    plus open-incident counts, per the dashboard requirements in the spec."""
    _owned_project_or_404(db, project_id, current_user)

    layers = {}
    for source in ("frontend", "backend", "db"):
        latest = (
            db.query(Project_Events)
            .filter(Project_Events.project_id == project_id, Project_Events.source == source)
            .order_by(Project_Events.created_at.desc())
            .first()
        )
        if latest is None:
            layers[source] = LayerHealth(status="unknown", last_event_at=None)
            continue

        triggered, _ = evaluate_event(source, latest.payload or {
            "status": latest.status,
            "duration_ms": latest.duration_ms,
            "http_status": latest.http_status,
        })
        layers[source] = LayerHealth(
            status="unhealthy" if triggered else "healthy",
            last_event_at=latest.created_at,
        )

    open_incidents = (
        db.query(func.count(Incidents.id))
        .filter(Incidents.project_id == project_id, Incidents.status == "Open")
        .scalar()
    )
    critical_incidents = (
        db.query(func.count(Incidents.id))
        .filter(
            Incidents.project_id == project_id,
            Incidents.status == "Open",
            Incidents.severity == "critical",
        )
        .scalar()
    )

    return ProjectHealthResponse(
        frontend=layers["frontend"],
        backend=layers["backend"],
        database=layers["db"],
        open_incidents=open_incidents or 0,
        critical_incidents=critical_incidents or 0,
    )


async def resolve_project_from_api_key(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Projects:
    """Every ingest endpoint (frontend interceptor, backend middleware, DB poller)
    authenticates with the project's API key in the Authorization header, never a
    client-supplied project_id — this is the multi-tenancy security boundary."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed API key",
        )

    raw_key = authorization.split(" ", 1)[1].strip()

    project = db.query(Projects).filter(Projects.api_key == raw_key).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    return project


@router.post("/event/postproject", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def receive_event(
    payload: EventCreate,
    background_tasks: BackgroundTasks,
    project: Projects = Depends(resolve_project_from_api_key),
    db: Session = Depends(get_db),
):
    """Frontend interceptor / backend middleware event ingestion (POST /events
    in the spec). Persists immediately, then runs threshold checks; if crossed,
    schedules the AI incident pipeline in the background so this call stays fast."""
    eval_payload = payload.model_dump()
    # Merge the free-form payload with the typed extra fields (error_type,
    # queue_depth, db_query_time_ms, page) so nothing sent by the interceptor/
    # middleware is lost, even though only a few fields have dedicated columns.
    stored_payload = {**(payload.payload or {}), **{
        k: v for k, v in eval_payload.items()
        if k in ("error_type", "queue_depth", "db_query_time_ms", "page") and v is not None
    }}

    new_event = Project_Events(
        project_id=project.id,
        source=payload.source,
        event_type=payload.event_type,
        endpoint=payload.endpoint,
        duration_ms=payload.duration_ms,
        status=payload.status,
        http_status=payload.http_status,
        payload=stored_payload or None,
        created_at=datetime.utcnow(),
    )

    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    await _maybe_trigger_pipeline(background_tasks, project.id, new_event, payload.source, eval_payload)

    return new_event


@router.post("/db-snapshot", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def receive_db_snapshot(
    payload: DBSnapshotCreate,
    background_tasks: BackgroundTasks,
    project: Projects = Depends(resolve_project_from_api_key),
    db: Session = Depends(get_db),
):
    """DB poller ingestion (section 7 of the spec): active_connections,
    pool_usage_pct, slow_queries pushed every few seconds from a background
    script/cron holding a read-only connection to the target Postgres."""
    snapshot = payload.model_dump()

    new_event = Project_Events(
        project_id=project.id,
        source="db",
        event_type="db_snapshot",
        status="error" if snapshot.get("pool_usage_pct", 0) >= 95 else "success",
        payload=snapshot,
        created_at=datetime.utcnow(),
    )

    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    await _maybe_trigger_pipeline(background_tasks, project.id, new_event, "db", snapshot)

    return new_event
