# Sentinel Frontend SDK

Frontend SDK for Sentinel application monitoring.

The Sentinel Frontend SDK is designed for frontend applications such as React, Next.js, Vue, and other JavaScript/TypeScript web applications.

Its job is simple:

> **Observe frontend activity → collect telemetry → send telemetry to Sentinel.**

The SDK does **not** perform anomaly detection, embeddings, RAG, or AI analysis.

---

## 1. Architecture

```text
Frontend Application
       │
       ▼
Sentinel Frontend SDK
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
npm install
```

For local SDK development:

```bash
npm install ../sentinel-frontend-sdk
```

Eventually, after publishing:

```bash
npm install @sentinel/frontend
```

---

## 3. Basic Usage

```typescript
import { Sentinel } from "@sentinel/frontend";

const sentinel = new Sentinel({
    apiKey: "YOUR_API_KEY",
    endpoint: "https://your-sentinel-api.com/api/v1/events"
});

sentinel.init();
```

The SDK should normally be initialized once when the application starts.

---

## 4. What Does the SDK Collect?

The SDK collects frontend telemetry such as:

```text
JavaScript errors
Unhandled exceptions
Unhandled promise rejections
API/network failures
HTTP status code
Request duration
Page/route
Timestamp
Service
Environment
Browser information
```

Example:

```json
{
  "source": "frontend",
  "service": "web-app",
  "environment": "production",
  "event_type": "api_error",
  "method": "POST",
  "path": "/api/payment",
  "status_code": 500,
  "duration_ms": 2400,
  "result": "failure",
  "error_type": "HTTPError"
}
```

---

## 5. Automatic Error Monitoring

The SDK should automatically capture frontend JavaScript errors.

Example:

```typescript
sentinel.init();
```

The SDK can observe:

```text
Application
    ↓
JavaScript Error
    ↓
Sentinel SDK
    ↓
Collect telemetry
    ↓
Send event to Sentinel
```

Example:

```json
{
  "source": "frontend",
  "event_type": "javascript_error",
  "path": "/dashboard",
  "result": "failure",
  "error_type": "TypeError",
  "error_message": "Cannot read properties of undefined"
}
```

---

## 6. API / Network Monitoring

The SDK should monitor frontend API requests.

For:

```http
GET /api/users
```

with:

```text
200 OK
120ms
```

the SDK can send:

```json
{
  "source": "frontend",
  "event_type": "api_request",
  "method": "GET",
  "path": "/api/users",
  "status_code": 200,
  "duration_ms": 120,
  "result": "success"
}
```

For a failed request:

```json
{
  "source": "frontend",
  "event_type": "api_request",
  "method": "POST",
  "path": "/api/payment",
  "status_code": 500,
  "duration_ms": 2400,
  "result": "failure"
}
```

---

## 7. Page / Route Monitoring

The SDK can collect basic page and route information.

Example:

```text
/dashboard
/products
/checkout
/payment
```

Example event:

```json
{
  "source": "frontend",
  "event_type": "page_view",
  "path": "/dashboard",
  "result": "success"
}
```

This allows Sentinel to understand where frontend problems are occurring.

---

## 8. Manual Event Sending

Automatic monitoring is preferred, but the SDK can also expose a manual method.

```typescript
sentinel.sendEvent({
    source: "frontend",
    service: "web-app",
    environment: "production",
    event_type: "checkout_error",
    path: "/checkout",
    result: "failure",
    error_type: "PaymentFailed"
});
```

This is useful for application-specific events that cannot be detected automatically.

---

## 9. SDK Structure

```text
sentinel-frontend-sdk/
│
├── package.json
├── README.md
├── tsconfig.json
│
└── src/
    ├── index.ts
    ├── client.ts
    ├── errors.ts
    ├── network.ts
    ├── performance.ts
    └── types.ts
```

### `client.ts`

Responsible for:

```text
API authentication
HTTP communication
Sending events
Handling Sentinel API responses
```

### `errors.ts`

Responsible for:

```text
JavaScript errors
Unhandled exceptions
Unhandled promise rejections
Error normalization
```

### `network.ts`

Responsible for:

```text
Monitoring API requests
Reading status codes
Measuring request duration
Detecting network failures
```

### `performance.ts`

Responsible for:

```text
Frontend performance telemetry
Request timing
Page timing
```

### `types.ts`

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
Frontend SDK
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
Sensitive form data
Sensitive request/response bodies
Unnecessary personal information
```

Only telemetry required for application monitoring should be sent.

Frontend API keys should be treated as public/client-side credentials and must not provide privileged access to Sentinel administrative APIs.

---

## 12. Development Goal

The first version should prove:

```text
React Application
       ↓
Sentinel Frontend SDK
       ↓
Capture frontend event
       ↓
POST /api/v1/events
       ↓
Sentinel Backend
       ↓
backend_events
```

Do not add embeddings or AI to the SDK.

The SDK should remain lightweight.
