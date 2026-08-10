"""
Gemini integration for Sentinel.

Two responsibilities:
  1. embed_text()      -> vector embedding for RAG (pgvector similarity search)
  2. analyze_incident() -> severity classification + root-cause explanation +
                            fix suggestion, grounded on similar past incidents

Uses the google-genai SDK (`from google import genai`).
"""
import json
import logging
from typing import Any, Optional

from google import genai
from google.genai import types

from .settings import settings

logger = logging.getLogger("sentinel.ai")

_client: Optional[genai.Client] = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


def embed_text(text: str) -> list[float]:
    """Return a fixed-dimension embedding vector for the given text."""
    client = get_client()
    result = client.models.embed_content(
        model=settings.GEMINI_EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            output_dimensionality=settings.EMBEDDING_DIM,
            task_type="RETRIEVAL_DOCUMENT",
        ),
    )
    return list(result.embeddings[0].values)


ANALYSIS_SYSTEM_PROMPT = """You are Sentinel, an SRE copilot that triages production incidents
for a full-stack app (React frontend, FastAPI backend, Postgres database).

Given raw telemetry for a single anomalous event and a list of similar PAST incidents
(with how they were fixed, if known), respond with STRICT JSON only, matching this schema:

{
  "title": "short human-readable incident title (<= 80 chars)",
  "severity": "low | medium | high | critical",
  "source_layer": "frontend | backend | database",
  "root_cause": "1-3 sentence best-guess root cause",
  "summary": "plain-language explanation of what happened, for an on-call engineer",
  "ai_suggestion": "concrete next step(s) to fix or mitigate it"
}

Rules:
- Use the comparison across layers to decide the TRUE root cause vs. a symptom
  (e.g. if only the frontend reported failure and no backend event exists, blame network/infra,
  not application code; if backend was healthy but frontend was slow, suspect frontend rendering).
- If similar past incidents are provided, ground your root_cause/ai_suggestion in how they were
  actually resolved when relevant.
- Output JSON only. No markdown fences, no commentary.
"""


def analyze_incident(
    event_context: dict[str, Any],
    similar_incidents: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Call Gemini to classify severity and explain root cause for one anomalous event,
    grounded on similar past incidents (RAG).
    """
    client = get_client()

    prompt = {
        "event": event_context,
        "similar_past_incidents": similar_incidents,
    }

    try:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=json.dumps(prompt, default=str),
            config=types.GenerateContentConfig(
                system_instruction=ANALYSIS_SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )
        data = json.loads(response.text)
    except Exception:
        logger.exception("Gemini analysis failed, falling back to rule-based summary")
        data = _fallback_analysis(event_context)

    data.setdefault("title", f"Anomaly on {event_context.get('endpoint', 'unknown endpoint')}")
    data.setdefault("severity", "medium")
    data.setdefault("source_layer", event_context.get("source", "backend"))
    data.setdefault("root_cause", "Unable to determine automatically.")
    data.setdefault("summary", "An anomaly was detected but AI analysis was unavailable.")
    data.setdefault("ai_suggestion", "Review the raw event payload manually.")
    return data


def _fallback_analysis(event_context: dict[str, Any]) -> dict[str, Any]:
    """Used only if the Gemini call fails, so the pipeline never breaks."""
    source = event_context.get("source", "backend")
    status = event_context.get("status", "error")
    severity = "critical" if status in ("timeout", "error") else "medium"
    return {
        "title": f"{source.title()} anomaly: {event_context.get('endpoint', 'unknown')}",
        "severity": severity,
        "source_layer": source,
        "root_cause": f"Threshold crossed on {source} layer ({status}).",
        "summary": json.dumps(event_context, default=str),
        "ai_suggestion": "Investigate manually; AI analysis was unavailable.",
    }
