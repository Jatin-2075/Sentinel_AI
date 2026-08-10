from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, List


class IncidentCreate(BaseModel):
    title: str
    severity: str
    source_layer: Optional[str] = None
    root_cause: Optional[str] = None
    summary: Optional[str] = None
    ai_suggestion: Optional[str] = None


class IncidentUpdate(BaseModel):
    status: Optional[str] = None
    severity: Optional[str] = None
    root_cause: Optional[str] = None
    summary: Optional[str] = None
    ai_suggestion: Optional[str] = None


class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    event_id: UUID
    title: str
    severity: str
    source_layer: Optional[str]
    status: str
    root_cause: Optional[str]
    summary: Optional[str]
    ai_suggestion: Optional[str]
    resolved_at: Optional[datetime]
    created_at: datetime


class SimilarIncident(BaseModel):
    id: UUID
    title: str
    severity: str
    root_cause: Optional[str] = None
    resolution: Optional[str] = None


class IncidentDetailResponse(IncidentResponse):
    similar_incidents: List[SimilarIncident] = []


class RunbookCreate(BaseModel):
    resolution_text: str


class RunbookUpdate(BaseModel):
    resolution_text: str


class RunbookResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    incident_id: UUID
    created_by: Optional[UUID]
    source: str
    resolution_text: str
    created_at: datetime
