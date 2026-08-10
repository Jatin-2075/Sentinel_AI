"""
Threshold-based anomaly detection.

Per the spec: frontend/backend events are checked per-request; DB snapshots are
checked per-poll. If a check trips, we return (True, reason) so the caller can
kick off the AI incident pipeline. Nothing here talks to Gemini or the DB.
"""
from typing import Optional

from .settings import settings


def evaluate_frontend_event(payload: dict) -> tuple[bool, Optional[str]]:
    status = payload.get("status")
    duration_ms = payload.get("duration_ms") or 0
    http_status = payload.get("http_status")

    if status in ("error", "timeout"):
        return True, f"Frontend reported {status} on {payload.get('endpoint')}"
    if duration_ms >= settings.LATENCY_CRITICAL_MS:
        return True, f"Frontend call to {payload.get('endpoint')} took {duration_ms}ms (critical)"
    if duration_ms >= settings.LATENCY_WARNING_MS:
        return True, f"Frontend call to {payload.get('endpoint')} took {duration_ms}ms (slow)"
    if http_status and http_status >= 500:
        return True, f"Frontend saw HTTP {http_status} on {payload.get('endpoint')}"
    return False, None


def evaluate_backend_event(payload: dict) -> tuple[bool, Optional[str]]:
    status = payload.get("status")
    duration_ms = payload.get("duration_ms") or 0
    http_status = payload.get("http_status")
    db_query_time_ms = payload.get("db_query_time_ms") or 0

    if status == "error":
        return True, f"Backend error on {payload.get('endpoint')}: {payload.get('error_type', 'unknown error')}"
    if duration_ms >= settings.LATENCY_CRITICAL_MS:
        return True, f"Backend handler for {payload.get('endpoint')} took {duration_ms}ms (critical)"
    if duration_ms >= settings.LATENCY_WARNING_MS:
        return True, f"Backend handler for {payload.get('endpoint')} took {duration_ms}ms (slow)"
    if http_status and http_status >= 500:
        return True, f"Backend returned HTTP {http_status} on {payload.get('endpoint')}"
    if db_query_time_ms >= settings.LATENCY_CRITICAL_MS:
        return True, f"DB query inside {payload.get('endpoint')} took {db_query_time_ms}ms"
    return False, None


def evaluate_db_snapshot(payload: dict) -> tuple[bool, Optional[str]]:
    pool_usage_pct = payload.get("pool_usage_pct") or 0
    slow_queries = payload.get("slow_queries") or []

    if pool_usage_pct >= settings.DB_POOL_CRITICAL_PCT:
        return True, f"DB connection pool at {pool_usage_pct}% (critical)"
    if pool_usage_pct >= settings.DB_POOL_WARNING_PCT:
        return True, f"DB connection pool at {pool_usage_pct}% (high)"
    if slow_queries:
        return True, f"{len(slow_queries)} slow quer{'y' if len(slow_queries) == 1 else 'ies'} detected on DB"
    return False, None


def evaluate_event(source: str, payload: dict) -> tuple[bool, Optional[str]]:
    source = (source or "").lower()
    if source == "frontend":
        return evaluate_frontend_event(payload)
    if source == "backend":
        return evaluate_backend_event(payload)
    if source == "db" or source == "database":
        return evaluate_db_snapshot(payload)
    return False, None
