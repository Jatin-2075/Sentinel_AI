from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..Database.database import get_db
from ..Models.auth_model import Auth_User
from ..Models.project_model import Projects
from ..Models.incidents_model import Incidents, Incidents_Resolved
from ..Models.embedding_model import IncidentEmbeddings
from ..Schemas.incident_schema import (
    IncidentUpdate,
    IncidentResponse,
    IncidentDetailResponse,
    SimilarIncident,
    RunbookCreate,
    RunbookUpdate,
    RunbookResponse,
)
from ..Core.dependencies import get_current_user
from ..Core.settings import settings

router = APIRouter(tags=["Incidents"])


def _user_project_ids(db: Session, user: Auth_User) -> list[UUID]:
    return [p.id for p in db.query(Projects.id).filter(Projects.auth_id == user.id).all()]


def _owned_incident_or_404(db: Session, incident_id: UUID, user: Auth_User) -> Incidents:
    incident = (
        db.query(Incidents)
        .join(Projects, Projects.id == Incidents.project_id)
        .filter(Incidents.id == incident_id, Projects.auth_id == user.id)
        .first()
    )
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")
    return incident


@router.get("/incidents", response_model=List[IncidentResponse])
async def list_incidents(
    project_id: Optional[UUID] = None,
    status_filter: Optional[str] = None,
    severity: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: Auth_User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List incidents for the authenticated user's project(s) — GET /incidents
    from the spec. Always scoped server-side to projects the caller owns."""
    project_ids = _user_project_ids(db, current_user)
    if project_id is not None:
        if project_id not in project_ids:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
        project_ids = [project_id]

    q = db.query(Incidents).filter(Incidents.project_id.in_(project_ids))
    if status_filter:
        q = q.filter(Incidents.status == status_filter)
    if severity:
        q = q.filter(Incidents.severity == severity)

    return (
        q.order_by(Incidents.created_at.desc())
        .offset(skip)
        .limit(min(limit, 200))
        .all()
    )


@router.get("/incidents/{incident_id}", response_model=IncidentDetailResponse)
async def get_incident(
    incident_id: UUID,
    current_user: Auth_User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Incident detail with AI summary + similar past incidents (same project
    only) — GET /incidents/{id} from the spec."""
    incident = _owned_incident_or_404(db, incident_id, current_user)

    similar: list[SimilarIncident] = []
    own_embedding = (
        db.query(IncidentEmbeddings)
        .filter(IncidentEmbeddings.incident_id == incident.id)
        .first()
    )
    if own_embedding is not None:
        rows = (
            db.query(Incidents, Incidents_Resolved)
            .join(IncidentEmbeddings, IncidentEmbeddings.incident_id == Incidents.id)
            .outerjoin(Incidents_Resolved, Incidents_Resolved.incident_id == Incidents.id)
            .filter(
                IncidentEmbeddings.project_id == incident.project_id,
                Incidents.id != incident.id,
            )
            .order_by(IncidentEmbeddings.embedding.cosine_distance(own_embedding.embedding))
            .limit(settings.RAG_TOP_K)
            .all()
        )
        seen = set()
        for inc, runbook in rows:
            if inc.id in seen:
                continue
            seen.add(inc.id)
            similar.append(SimilarIncident(
                id=inc.id,
                title=inc.title,
                severity=inc.severity,
                root_cause=inc.root_cause,
                resolution=runbook.resolution_text if runbook else None,
            ))

    return IncidentDetailResponse(
        **IncidentResponse.model_validate(incident).model_dump(),
        similar_incidents=similar,
    )


@router.put("/incidents/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: UUID,
    payload: IncidentUpdate,
    current_user: Auth_User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    incident = _owned_incident_or_404(db, incident_id, current_user)

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(incident, key, value)

    if update_data.get("status") == "Resolved" and incident.resolved_at is None:
        incident.resolved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(incident)
    return incident


@router.delete("/incidents/{incident_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_incident(
    incident_id: UUID,
    current_user: Auth_User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    incident = _owned_incident_or_404(db, incident_id, current_user)
    db.delete(incident)
    db.commit()


@router.post("/incidents/{incident_id}/resolve", response_model=RunbookResponse, status_code=status.HTTP_201_CREATED)
async def resolve_incident(
    incident_id: UUID,
    payload: RunbookCreate,
    current_user: Auth_User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Marks the incident Resolved and records how it was fixed as a runbook
    entry, which future incidents' RAG lookups will be grounded on."""
    incident = _owned_incident_or_404(db, incident_id, current_user)

    runbook = Incidents_Resolved(
        project_id=incident.project_id,
        incident_id=incident.id,
        created_by=current_user.id,
        source="human_edited",
        resolution_text=payload.resolution_text,
    )
    db.add(runbook)

    incident.status = "Resolved"
    incident.resolved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(runbook)
    return runbook


@router.get("/incidents/{incident_id}/runbooks", response_model=List[RunbookResponse])
async def list_runbooks(
    incident_id: UUID,
    current_user: Auth_User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    incident = _owned_incident_or_404(db, incident_id, current_user)
    return (
        db.query(Incidents_Resolved)
        .filter(Incidents_Resolved.incident_id == incident.id)
        .order_by(Incidents_Resolved.created_at.desc())
        .all()
    )


@router.put("/runbooks/{runbook_id}", response_model=RunbookResponse)
async def update_runbook(
    runbook_id: UUID,
    payload: RunbookUpdate,
    current_user: Auth_User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    runbook = (
        db.query(Incidents_Resolved)
        .join(Projects, Projects.id == Incidents_Resolved.project_id)
        .filter(Incidents_Resolved.id == runbook_id, Projects.auth_id == current_user.id)
        .first()
    )
    if not runbook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Runbook not found.")

    runbook.resolution_text = payload.resolution_text
    runbook.source = "human_edited"
    db.commit()
    db.refresh(runbook)
    return runbook


@router.delete("/runbooks/{runbook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_runbook(
    runbook_id: UUID,
    current_user: Auth_User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    runbook = (
        db.query(Incidents_Resolved)
        .join(Projects, Projects.id == Incidents_Resolved.project_id)
        .filter(Incidents_Resolved.id == runbook_id, Projects.auth_id == current_user.id)
        .first()
    )
    if not runbook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Runbook not found.")

    db.delete(runbook)
    db.commit()
