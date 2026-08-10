import uuid
from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, String, ForeignKey, DateTime, func, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..Database.database import Base


class Projects(Base):
    __tablename__ = "Projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)

    auth_id = Column(UUID(as_uuid=True), ForeignKey("Auth_User.id"), nullable=False, index=True)

    name = Column(String, nullable=False)
    frontend_url = Column(String, nullable=False, unique=True)
    backend_url = Column(String, nullable=False, unique=True)
    database_type = Column(String)
    database_host = Column(String)
    database_port = Column(Integer)
    database_name = Column(String)
    api_key = Column(String, nullable=False, unique=True)   # yaad se make a func to hash it and then check hashed api fron request bhooliyo mat

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    owner = relationship("Auth_User",back_populates="projects",uselist=False,)
    events = relationship("Project_Events",back_populates="project",uselist=True,cascade="all, delete-orphan",)
    embeddings = relationship("IncidentEmbeddings",back_populates="project",uselist=True,cascade="all, delete-orphan",)
    incidents = relationship("Incidents",back_populates="project",uselist=True,cascade="all, delete-orphan",)
    incidents_resolved = relationship("Incidents_Resolved",back_populates="project",uselist=True,cascade="all, delete-orphan",)


class Project_Events(Base):
    __tablename__ = "Project_Events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    project_id = Column(UUID(as_uuid=True), ForeignKey("Projects.id"), nullable=False, index=True)

    source = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    endpoint = Column(String)
    duration_ms = Column(Integer)
    status = Column(String)
    http_status = Column(Integer)
    payload = Column(JSON)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    project = relationship(
        "Projects",
        back_populates="events",
        uselist=False,
    )

    incident = relationship(
        "Incidents",
        back_populates="event",
        uselist=False,
    )