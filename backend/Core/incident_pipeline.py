"""
Orchestrates: threshold trip -> embed -> RAG similarity search -> Gemini analysis
-> persist Incident + IncidentEmbeddings -> push to that project's WebSocket room.

Designed to be run as a FastAPI BackgroundTask right after an event is ingested,
so ingestion (`POST /project/event/postproject`, `POST /project/db-snapshot`,
`POST /demo/trigger`) stays fast and never blocks on the LLM call.

NOTE: the spec's target architecture puts a Redis queue + separate worker process
between ingestion and this pipeline for real production load. This module is that
worker's logic, just invoked in-process via BackgroundTasks for simplicity — swap
the call site (see Router/projects_router.py) for a queue publish if you add Celery/
Redis Streams later; nothing else needs to change.
"""
import logging
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from ..Database.database import SessionLocal
from ..Models.incidents_model import Incidents, Incidents_Resolved
from ..Models.embedding_model import IncidentEmbeddings
from ..Models.project_model import Project_Events
from . import ai_service
from .settings import settings
from .ws_manager import manager

logger = logging.getLogger("sentinel.pipeline")


def _event_context(event: Project_Events, trigger_reason: str) -> dict:
    return {
        "source": event.source,
        "event_type": event.event_type,
        "endpoint": event.endpoint,
        "duration_ms": event.duration_ms,
        "status": event.status,
        "http_status": event.http_status,
        "payload": event.payload,
        "trigger_reason": trigger_reason,
        "created_at": event.created_at,
    }


def _find_similar_incidents(db: Session, project_id: UUID, query_vector: list[float]) -> list[Incidents]:
    rows = (
        db.query(Incidents)
        .join(IncidentEmbeddings, IncidentEmbeddings.incident_id == Incidents.id)
        .filter(IncidentEmbeddings.project_id == project_id)
        .order_by(IncidentEmbeddings.embedding.cosine_distance(query_vector))
        .limit(settings.RAG_TOP_K)
        .all()
    )
    return rows


def _similar_incidents_context(db: Session, incidents: list[Incidents]) -> list[dict]:
    out = []
    for inc in incidents:
        resolution = (
            db.query(Incidents_Resolved)
            .filter(Incidents_Resolved.incident_id == inc.id)
            .order_by(Incidents_Resolved.created_at.desc())
            .first()
        )
        out.append({
            "title": inc.title,
            "severity": inc.severity,
            "root_cause": inc.root_cause,
            "summary": inc.summary,
            "resolution": resolution.resolution_text if resolution else None,
        })
    return out


async def process_event(project_id: UUID, event_id: UUID, trigger_reason: str) -> Optional[UUID]:
    """
    Entry point used as a BackgroundTask. Opens its own DB session since the
    request-scoped session is already closed by the time this runs.
    Returns the new Incident id, or None if something failed.
    """
    db: Session = SessionLocal()
    try:
        event = db.query(Project_Events).filter(Project_Events.id == event_id).first()
        if event is None:
            return None

        context = _event_context(event, trigger_reason)
        query_text = (
            f"[{context['source']}] {context['event_type']} on {context['endpoint']} "
            f"status={context['status']} http={context['http_status']} "
            f"duration_ms={context['duration_ms']} reason={trigger_reason}"
        )

        try:
            query_vector = ai_service.embed_text(query_text)
        except Exception:
            logger.exception("Embedding failed; continuing with empty RAG context")
            query_vector = None

        similar_incidents: list[Incidents] = []
        similar_context: list[dict] = []
        if query_vector is not None:
            similar_incidents = _find_similar_incidents(db, project_id, query_vector)
            similar_context = _similar_incidents_context(db, similar_incidents)

        analysis = ai_service.analyze_incident(context, similar_context)

        incident = Incidents(
            project_id=project_id,
            event_id=event_id,
            title=analysis["title"],
            severity=analysis["severity"],
            source_layer=analysis.get("source_layer") or context["source"],
            status="Open",
            root_cause=analysis.get("root_cause"),
            summary=analysis.get("summary"),
            ai_suggestion=analysis.get("ai_suggestion"),
        )
        db.add(incident)
        db.commit()
        db.refresh(incident)

        if query_vector is not None:
            db.add(IncidentEmbeddings(
                project_id=project_id,
                incident_id=incident.id,
                embedding=query_vector,
            ))
            db.commit()

        await manager.broadcast(project_id, {
            "type": "incident.created",
            "incident": {
                "id": str(incident.id),
                "project_id": str(project_id),
                "title": incident.title,
                "severity": incident.severity,
                "source_layer": incident.source_layer,
                "status": incident.status,
                "root_cause": incident.root_cause,
                "summary": incident.summary,
                "ai_suggestion": incident.ai_suggestion,
                "created_at": str(incident.created_at),
                "similar_incident_titles": [i.title for i in similar_incidents],
            },
        })

        return incident.id
    except Exception:
        logger.exception("Incident pipeline failed for event %s", event_id)
        db.rollback()
        return None
    finally:
        db.close()
