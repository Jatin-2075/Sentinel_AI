import uuid
from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..Database.database import Base


class IncidentEmbeddings(Base):
    __tablename__ = "Incident_Embeddings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    project_id = Column(UUID(as_uuid=True), ForeignKey("Projects.id"), nullable=False)

    incident_id = Column(UUID(as_uuid=True), ForeignKey("Incidents.id"), nullable=False)

    embedding = Column(Vector(768))

    project = relationship(
        "Projects",
        back_populates="embeddings",
        uselist=False,
    )

    incident = relationship(
        "Incidents",
        back_populates="embedding",
        uselist=False,
    )