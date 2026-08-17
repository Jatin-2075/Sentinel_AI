from dataclasses import dataclass, asdict
from typing import Optional


@dataclass
class SentinelEvent:
    source: str
    service: str
    environment: str
    method: str
    path: str
    status_code: int
    duration_ms: float
    result: str
    timestamp: str
    error_type: Optional[str] = None
    error_message: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            key: value
            for key, value in asdict(self).items()
            if value is not None
        }