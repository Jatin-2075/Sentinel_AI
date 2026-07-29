import uuid

from sqlalchemy import Column, String, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..Database.database import Base


class Projects(Base):
    __tablename__ = "Projects"

    id = Column( UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False,)

    auth_id = Column( UUID(as_uuid=True), ForeignKey("Auth_User.id"), nullable=False, index=True,)

    name = Column(String, nullable=False)
    frontend_url = Column(String, nullable=False, unique=True)
    backend_url = Column(String, nullable=False, unique=True)
    database_url = Column(String, nullable=False, unique=True)
    api_key = Column(String, nullable=False, unique=True)

    created_at = Column( DateTime(timezone=True), server_default=func.now(), nullable=False,)

    owner = relationship("Auth_User",back_populates="projects",)
    events = relationship("Project_Events",back_populates="project",cascade="all, delete-orphan",)


class Project_Events(Base):
    __tablename__ = "Project_Events"

    id = Column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4,unique=True,nullable=False,)

    project_id = Column(UUID(as_uuid=True),ForeignKey("Projects.id"),nullable=False,index=True,)

    source = Column(String, nullable=False)
    event_type = Column(String, nullable=False)

    created_at = Column(DateTime(timezone=True),server_default=func.now(),nullable=False,)

    project = relationship("Projects",back_populates="events",)