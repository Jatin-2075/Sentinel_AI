from enum import Enum
from uuid import UUID

from pydantic import BaseModel


class DemoScenario(str, Enum):
    latency_spike = "latency_spike"
    error_spike = "error_spike"
    db_pool_exhaustion = "db_pool_exhaustion"
    frontend_timeout = "frontend_timeout"


class DemoTriggerRequest(BaseModel):
    project_id: UUID
    scenario: DemoScenario = DemoScenario.db_pool_exhaustion
