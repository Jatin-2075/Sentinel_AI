# Sentinel

**AI-powered error observability SDK for FastAPI.**
Drop-in middleware that captures request logs and tracebacks, embeds them with the Gemini API, and lets you ask a built-in `/sentinel` dashboard *why* an error happened and *where* to fix it — powered by Retrieval-Augmented Generation (RAG).

```bash
pip install sentinel-sdk
```

```python
from fastapi import FastAPI
from sentinel_sdk import SentinelMiddleware, SentinelConfig

app = FastAPI()

app.add_middleware(
    SentinelMiddleware,
    config=SentinelConfig(gemini_api_key="env:GEMINI_API_KEY"),
)
```

Run your app as usual, then open **`/sentinel`** in your browser.

---

## Table of Contents

- [Why Sentinel](#why-sentinel)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [How It Works](#how-it-works)
- [Dashboard & API Reference](#dashboard--api-reference)
- [Tech Stack](#tech-stack)
- [Security & Privacy](#security--privacy)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Why Sentinel

- **Zero-config install** — one line of middleware registration, no external log aggregator required.
- **Self-hosted dashboard** — `/sentinel` is served by your own FastAPI app, so it works identically on localhost and in production.
- **Semantic error search** — ask in plain English instead of grepping logs; Gemini embeddings find semantically related past errors, not just string matches.
- **Root-cause explanations** — RAG grounds Gemini's answer in the actual traceback, request payload, and code context.
- **Pluggable storage** — SQLite by default for local dev, swappable for Postgres/pgvector in production.

---

## Project Structure

```
sentinel-sdk/
├── sentinel_sdk/
│   ├── __init__.py                 # Public exports: SentinelMiddleware, SentinelConfig
│   ├── config.py                   # SentinelConfig dataclass + env var resolution
│   ├── middleware.py               # Core ASGI middleware (request/error capture)
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── event.py                 # ErrorEvent / RequestEvent data models
│   │   └── rag.py                   # RagAnswer, ErrorDocument models
│   │
│   ├── storage/
│   │   ├── __init__.py
│   │   ├── base.py                  # Abstract StorageBackend interface
│   │   ├── sqlite_backend.py        # Default local dev backend (aiosqlite)
│   │   └── postgres_backend.py      # Production backend (asyncpg + pgvector)
│   │
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── engine.py                # index_error() / answer_question()
│   │   ├── gemini_client.py         # Thin wrapper around Gemini embed + generate calls
│   │   ├── prompts.py               # SENTINEL_SYSTEM_PROMPT and templates
│   │   └── vector_store.py          # In-memory / pgvector / FAISS vector index
│   │
│   ├── redact.py                    # Field redaction (passwords, tokens, headers)
│   │
│   └── dashboard/
│       ├── __init__.py
│       ├── app.py                   # Sub-application mounted at /sentinel
│       ├── routes/
│       │   ├── logs.py              # /sentinel/api/logs, /sentinel/api/logs/stream
│       │   ├── errors.py            # /sentinel/api/errors/grouped
│       │   ├── ask.py               # /sentinel/api/ask (RAG chat)
│       │   └── health.py            # /sentinel/api/health
│       └── static/
│           ├── index.html           # Dashboard shell
│           ├── app.js               # Log stream, error explorer, chat UI
│           └── styles.css
│
├── examples/
│   └── basic_app/
│       ├── main.py                  # Minimal FastAPI app wired up with Sentinel
│       └── requirements.txt
│
├── tests/
│   ├── test_middleware.py
│   ├── test_rag_engine.py
│   ├── test_storage_sqlite.py
│   └── test_dashboard_routes.py
│
├── docs/
│   └── Sentinel_FastAPI_SDK_Spec.pdf   # Full technical design document
│
├── pyproject.toml
├── README.md
├── LICENSE
└── .env.example
```

---

## Installation

```bash
pip install sentinel-sdk

# with Postgres + pgvector support for production
pip install "sentinel-sdk[postgres]"
```

Set your Gemini API key as an environment variable:

```bash
export GEMINI_API_KEY="your-key-here"
```

---

## Quick Start

```python
from fastapi import FastAPI
from sentinel_sdk import SentinelMiddleware, SentinelConfig

app = FastAPI()

app.add_middleware(
    SentinelMiddleware,
    config=SentinelConfig(
        gemini_api_key="env:GEMINI_API_KEY",
        storage_url="sqlite:///./sentinel.db",
        dashboard_path="/sentinel",
        redact_fields=["password", "authorization", "token"],
        capture_request_body=True,
    ),
)

@app.get("/boom")
def boom():
    raise ValueError("something went wrong")
```

```bash
uvicorn main:app --reload
```

Trigger `/boom`, then open **http://localhost:8000/sentinel** — the error shows up in the live log stream, and you can ask the chat panel *"why did /boom fail?"* for a grounded explanation.

---

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `gemini_api_key` | `str` | — | Gemini API key, or `"env:VAR_NAME"` to read from an environment variable |
| `storage_url` | `str` | `sqlite:///./sentinel.db` | Storage backend connection string |
| `dashboard_path` | `str` | `/sentinel` | Path the dashboard and its API are mounted under |
| `redact_fields` | `list[str]` | `["password", "authorization", "token"]` | Field/header names stripped before storage or embedding |
| `capture_request_body` | `bool` | `True` | Whether to store a truncated, redacted request body for context |
| `embedding_model` | `str` | `gemini-embedding-001` | Gemini model used to embed error documents and questions |
| `generation_model` | `str` | `gemini-2.5-flash` | Gemini model used to answer RAG queries |
| `retention_days` | `int` | `30` | Auto-purge log/vector entries older than this |

---

## How It Works

```
 Client Request
      │
      ▼
┌──────────────────────┐
│  FastAPI App         │
│  ┌─────────────────┐ │        ┌───────────────────┐
│  │ SentinelMiddle- │ │───────▶│  Log Store         │
│  │ ware (ASGI)     │ │        │  (SQLite/Postgres) │
│  └─────────────────┘ │        └───────────────────┘
│  Normal Routes        │                 │
└──────────────────────┘                 ▼
      │                          ┌───────────────────┐
      ▼                          │  Embedding Worker  │
  Response / Error               │  (Gemini API)      │
                                  └───────────────────┘
                                           │
                                           ▼
                                  ┌───────────────────┐
                                  │  Vector Index     │
                                  │  (in-proc / db)   │
                                  └───────────────────┘
                                           │
                     GET /sentinel  ──▶  RAG Query Engine
                     (dashboard UI)      (retrieve + Gemini answer)
```

1. **Capture** — the middleware wraps every request; on failure it records exception type, message, traceback, source location, and redacted request context.
2. **Index** — each error is turned into a structured document, embedded via the Gemini embedding model, and stored in the vector index alongside the raw log.
3. **Ask** — a question typed into the dashboard is embedded, matched against past errors (cosine similarity, top-k), and the retrieved context is passed to Gemini to generate a grounded, cited explanation.

---

## Dashboard & API Reference

Mounted under your configured `dashboard_path` (default `/sentinel`):

| Endpoint | Method | Purpose |
|---|---|---|
| `/sentinel` | GET | Dashboard UI (live logs, error explorer, chat) |
| `/sentinel/api/logs` | GET | Paginated, filterable log query |
| `/sentinel/api/logs/stream` | WS | Live log stream |
| `/sentinel/api/errors/grouped` | GET | Deduplicated error groups + frequency counts |
| `/sentinel/api/ask` | POST | RAG question → grounded answer + source log IDs |
| `/sentinel/api/health` | GET | SDK + storage + Gemini connectivity check |

**Example: asking a question programmatically**

```bash
curl -X POST http://localhost:8000/sentinel/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Why does POST /checkout keep returning 500?"}'
```

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Middleware | Starlette `BaseHTTPMiddleware` / pure ASGI | Matches FastAPI's underlying framework |
| Storage (dev) | SQLite (`aiosqlite`) | Zero-config local persistence |
| Storage (prod) | PostgreSQL + `pgvector` | Scales log volume and vector search together |
| Embeddings | Gemini Embedding API | Configurable model, batched calls |
| Generation | Gemini API (chat/generate) | Streams grounded answers for the dashboard |
| Vector search | pgvector or in-process FAISS | Chosen based on storage backend |
| Dashboard frontend | Server-rendered + lightweight JS | Ships as static assets bundled with the package |
| Packaging | PyPI (`sentinel-sdk`) | Optional extra: `sentinel-sdk[postgres]` |

---

## Security & Privacy

- **Field redaction** — configurable deny-list (passwords, tokens, auth headers) stripped before storage or embedding.
- **Local-first by default** — SQLite + local vector index; nothing leaves your server except the text sent to the Gemini API for embeddings/generation.
- **Dashboard auth** — protect `/sentinel` (basic auth, IP allowlist, or your app's existing auth dependency) since it exposes stack traces and request bodies.
- **API key handling** — the Gemini API key is read from environment/secret manager and never logged or embedded in stored documents.
- **Data retention** — configurable TTL (`retention_days`) auto-purges old log/vector entries.

---

## Roadmap

- [ ] **Phase 1** — Core middleware: capture request/error events, write to SQLite
- [ ] **Phase 2** — Dashboard v1: live log stream + error explorer (no AI yet)
- [ ] **Phase 3** — Gemini embeddings: index every error event as a vector on capture
- [ ] **Phase 4** — RAG chat: `/sentinel/api/ask` endpoint + chat UI with citations
- [ ] **Phase 5** — Production hardening: Postgres/pgvector backend, auth, redaction, retention policy
- [ ] **Phase 6** — Packaging & docs: publish to PyPI, quick-start docs, example repo

Full technical design doc: [`docs/Sentinel_FastAPI_SDK_Spec.pdf`](./docs/Sentinel_FastAPI_SDK_Spec.pdf)

---

## Contributing

1. Fork the repo and create a feature branch.
2. Install dev dependencies: `pip install -e ".[dev]"`.
3. Run tests: `pytest`.
4. Open a PR describing the change and linking any related issue.

---

## License

MIT — see [`LICENSE`](./LICENSE).