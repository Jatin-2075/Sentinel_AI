from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..Database.database import get_db
from ..Models.auth_model import Auth_User
from ..Models.project_model import Projects, Project_Events
from ..Schemas.demo_schema import DemoTriggerRequest, DemoScenario
from ..Schemas.projects_schemas import EventResponse
from ..Core.dependencies import get_current_user
from ..Core.incident_pipeline import process_event

router = APIRouter(prefix="/demo", tags=["Demo"])

_SCENARIOS = {
    DemoScenario.latency_spike: dict(
        source="backend", event_type="api_call", endpoint="/checkout",
        status="success", http_status=200, duration_ms=6500,
        reason="Simulated: backend handler latency spike",
    ),
    DemoScenario.error_spike: dict(
        source="backend", event_type="api_call", endpoint="/checkout",
        status="error", http_status=500, duration_ms=120,
        reason="Simulated: backend error spike (500s on /checkout)",
    ),
    DemoScenario.frontend_timeout: dict(
        source="frontend", event_type="api_call", endpoint="/checkout",
        status="timeout", http_status=504, duration_ms=8000,
        reason="Simulated: frontend request timeout on /checkout",
    ),
    DemoScenario.db_pool_exhaustion: dict(
        source="db", event_type="db_snapshot", status="error", http_status=None,
        duration_ms=None,
        payload={"active_connections": 98, "pool_usage_pct": 98, "slow_queries": [
            {"query": "SELECT * FROM orders WHERE ...", "mean_exec_time": 4200.0}
        ]},
        reason="Simulated: DB connection pool exhaustion",
    ),
}


@router.post("/trigger", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def trigger_demo_failure(
    payload: DemoTriggerRequest,
    background_tasks: BackgroundTasks,
    current_user: Auth_User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """POST /demo/trigger — manually trigger a synthetic failure for the
    hackathon demo button. Always routes through the same anomaly + AI
    pipeline as real events, so it's a faithful end-to-end demo."""
    project = (
        db.query(Projects)
        .filter(Projects.id == payload.project_id, Projects.auth_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    scenario = _SCENARIOS[payload.scenario]

    new_event = Project_Events(
        project_id=project.id,
        source=scenario["source"],
        event_type=scenario["event_type"],
        endpoint=scenario.get("endpoint"),
        duration_ms=scenario.get("duration_ms"),
        status=scenario.get("status"),
        http_status=scenario.get("http_status"),
        payload=scenario.get("payload"),
        created_at=datetime.utcnow(),
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    background_tasks.add_task(process_event, project.id, new_event.id, scenario["reason"])

    return new_event
