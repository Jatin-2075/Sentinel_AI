import uuid

from sqlalchemy import Column, String, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..Database.database import Base


class Incidents(Base):
    __tablename__ = "Incidents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    project_id = Column(UUID(as_uuid=True), ForeignKey("Projects.id"), nullable=False)

    event_id = Column(UUID(as_uuid=True), ForeignKey("Project_Events.id"), nullable=False)

    title = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    source_layer = Column(String)
    status = Column(String, default="Open")
    root_cause = Column(String)
    summary = Column(String)
    ai_suggestion = Column(String)
    resolved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship(
        "Projects",
        back_populates="incidents",
        uselist=False,
    )

    event = relationship(
        "Project_Events",
        back_populates="incident",
        uselist=False,
    )

    embedding = relationship(
        "IncidentEmbeddings",
        back_populates="incident",
        uselist=False,
    )

    runbook = relationship(
        "Incidents_Resolved",
        back_populates="incident",
        uselist=True,
    )


class Incidents_Resolved(Base):
    __tablename__ = "Incidents_Resolved"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    project_id = Column(UUID(as_uuid=True), ForeignKey("Projects.id"), nullable=False)

    incident_id = Column(UUID(as_uuid=True), ForeignKey("Incidents.id"), nullable=False)

    created_by = Column(UUID(as_uuid=True), ForeignKey("Auth_User.id"))

    source = Column(String, default="ai_edited")

    resolution_text = Column(String, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship(
        "Projects",
        back_populates="incidents_resolved",
        uselist=False,
    )

    incident = relationship(
        "Incidents",
        back_populates="runbook",
        uselist=False,
    )