# Sentinel Python SDK

Python SDK for Sentinel application monitoring.

The Sentinel Python SDK is designed for backend applications such as FastAPI, Flask, and other Python web applications.

Its job is simple:

> **Observe backend requests → collect telemetry → send telemetry to Sentinel.**

The SDK does **not** perform anomaly detection, embeddings, RAG, or AI analysis.

---

## 1. Architecture

```text
Backend Application
       │
       ▼
Sentinel Python SDK
       │
       │ telemetry
       ▼
POST /api/v1/events
       │
       ▼
Sentinel Backend
       │
       ├── Validate
       ├── Store
       ├── Analyze
       ├── Create embeddings
       └── Detect incidents
```

---

## 2. Installation

During development:

```bash
pip install -e .
```

Eventually, after publishing:

```bash
pip install sentinel-sdk
```

---

## 3. Basic Usage

```python
from sentinel import Sentinel

sentinel = Sentinel(
    api_key="YOUR_API_KEY",
    endpoint="https://your-sentinel-api.com/api/v1/events"
)
```

The SDK should normally be initialized once when the application starts.

---

## 4. What Does the SDK Collect?

The SDK collects backend telemetry such as:

```text
HTTP method
Endpoint/path
Status code
Response duration
Success/failure
Error type
Error message
Timestamp
Service
Environment
```

Example:

```json
{
  "source": "backend",
  "service": "payment-api",
  "environment": "production",
  "method": "POST",
  "path": "/api/payment",
  "status_code": 500,
  "duration_ms": 2400,
  "result": "failure",
  "error_type": "DatabaseTimeout"
}
```

---

## 5. Automatic Request Monitoring

The SDK should provide middleware so developers don't have to manually report every request.

Example:

```python
from fastapi import FastAPI
from sentinel import Sentinel
from sentinel.middleware import SentinelMiddleware

app = FastAPI()

sentinel = Sentinel(
    api_key="YOUR_API_KEY",
    endpoint="https://your-sentinel-api.com/api/v1/events"
)

app.add_middleware(
    SentinelMiddleware,
    client=sentinel,
    service="payment-api",
    environment="production"
)
```

Now the SDK can automatically observe:

```text
Request
   ↓
Application
   ↓
Response
   ↓
Collect telemetry
   ↓
Send event to Sentinel
```

---

## 6. Success Request

For:

```http
GET /api/users
```

with:

```text
200 OK
120ms
```

the SDK sends:

```json
{
  "source": "backend",
  "method": "GET",
  "path": "/api/users",
  "status_code": 200,
  "duration_ms": 120,
  "result": "success"
}
```

---

## 7. Failed Request

For:

```http
POST /api/payment
```

with:

```text
500
2400ms
DatabaseTimeout
```

the SDK sends:

```json
{
  "source": "backend",
  "method": "POST",
  "path": "/api/payment",
  "status_code": 500,
  "duration_ms": 2400,
  "result": "failure",
  "error_type": "DatabaseTimeout"
}
```

---

## 8. Manual Event Sending

Automatic middleware is preferred, but the SDK can also expose a manual method.

```python
sentinel.send_event({
    "source": "backend",
    "service": "payment-api",
    "environment": "production",
    "method": "POST",
    "path": "/api/payment",
    "status_code": 500,
    "duration_ms": 2400,
    "result": "failure",
    "error_type": "DatabaseTimeout"
})
```

This is useful for events that are not normal HTTP requests.

---

## 9. SDK Structure

```text
sentinel-python-sdk/
│
├── pyproject.toml
├── README.md
│
└── sentinel/
    ├── __init__.py
    ├── client.py
    ├── middleware.py
    └── types.py
```

### `client.py`

Responsible for:

```text
API authentication
HTTP communication
Sending events
Handling Sentinel API responses
```

### `middleware.py`

Responsible for:

```text
Intercepting requests
Measuring duration
Reading status codes
Detecting exceptions
Creating telemetry events
```

### `types.py`

Responsible for:

```text
Event structures
Type definitions
Validation
```

---

## 10. What the SDK Does NOT Do

The SDK does not:

* Detect anomalies
* Generate embeddings
* Search vectors
* Run RAG
* Call an LLM
* Determine root cause
* Create incidents

Those responsibilities belong to the Sentinel backend.

```text
SDK
 ↓
Collect + Send
```

```text
Sentinel Backend
 ↓
Store + Analyze + Embed + Detect + AI
```

---

## 11. Security

The SDK must never intentionally collect:

```text
Passwords
JWT tokens
Credit card information
Sensitive request bodies
Unnecessary personal information
```

Only telemetry required for application monitoring should be sent.

---

## 12. Development Goal

The first version should prove:

```text
FastAPI Application
       ↓
SentinelMiddleware
       ↓
Sentinel Python SDK
       ↓
POST /api/v1/events
       ↓
Sentinel Backend
       ↓
backend_events
```

Do not add embeddings or AI to the SDK.

The SDK should remain lightweight.
