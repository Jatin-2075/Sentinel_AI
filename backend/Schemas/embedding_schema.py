from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import List


class EmbeddingCreate(BaseModel):
    embedding: List[float]


class EmbeddingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    incident_id: UUID
    embedding: List[float]