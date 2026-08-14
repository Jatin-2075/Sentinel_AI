import { useState } from "react";
import "../styles/setup.css"


const API_KEY = "sk_live_8f2a1c9d4b7e6f30";
const SENTINEL_URL = "https://api.sentinel.dev/events";

const snippets: Record<string, { label: string; lang: string; code: string }> = {
    frontend: {
        label: "Frontend (interceptor)",
        lang: "ts",
        code: `// sentinel.ts
export function reportEvent(data: {
  endpoint: string; duration_ms: number;
  status: "success" | "error" | "timeout"; http_status?: number;
}) {
  navigator.sendBeacon(
    "${SENTINEL_URL}",
    JSON.stringify({ source: "frontend", ...data, timestamp: new Date().toISOString() })
  );
}
// Attach with header: Authorization: Bearer ${API_KEY}`,
    },
    backend: {
        label: "Backend (FastAPI middleware)",
        lang: "py",
        code: `# sentinel_middleware.py
import time, httpx

@app.middleware("http")
async def sentinel_middleware(request, call_next):
    start = time.time()
    response = await call_next(request)
    await httpx.AsyncClient().post(
        "${SENTINEL_URL}",
        json={
            "source": "backend",
            "endpoint": request.url.path,
            "duration_ms": (time.time() - start) * 1000,
            "status": "error" if response.status_code >= 400 else "success",
        },
        headers={"Authorization": "Bearer ${API_KEY}"},
    )
    return response`,
    },
    db: {
        label: "Database (health poller)",
        lang: "py",
        code: `# sentinel_db_poller.py — runs every 10s as a background job
import psycopg2, requests, time

def poll():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute("SELECT count(*) FROM pg_stat_activity;")
    active = cur.fetchone()[0]
    requests.post(
        "${SENTINEL_URL}",
        json={"source": "db", "event_type": "pool_usage", "active_connections": active},
        headers={"Authorization": "Bearer ${API_KEY}"},
    )

while True:
    poll()
    time.sleep(10)`,
    },
};

export default function Setup() {
    const [copied, setCopied] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<keyof typeof snippets>("frontend");

    function copy(text: string, key: string) {
        navigator.clipboard?.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 1500);
    }

    return (
        <div className="sn-setup-page">
            <style>{`
        
      `}</style>

            <div className="sn-setup-container">
                <div className="sn-setup-eyebrow sn-mono">Project setup</div>
                <h1 className="sn-setup-title">Connect your app to Sentinel</h1>
                <p className="sn-setup-sub">
                    Copy your API key once, then add the matching snippet to your frontend,
                    backend, and database. No dashboard configuration needed after this.
                </p>

                <div className="sn-key-card">
                    <div className="sn-key-label sn-mono">API key</div>
                    <div className="sn-key-row">
                        <div className="sn-key-value sn-mono">{API_KEY}</div>
                        <button className="sn-copy-btn" onClick={() => copy(API_KEY, "key")}>
                            {copied === "key" ? "Copied" : "Copy"}
                        </button>
                    </div>
                    <div className="sn-key-warning">
                        Store this as an environment variable — it won't be shown again in full.
                    </div>
                </div>

                <div className="sn-steps">
                    <div className="sn-step-row">
                        <div className="sn-step-marker">1</div>
                        <div className="sn-step-content">
                            <h3 className="sn-step-title">Set your environment variables</h3>
                            <p className="sn-step-body">
                                In each service (frontend, backend, DB poller), set SENTINEL_URL and
                                SENTINEL_API_KEY — never hardcode the key directly in your code.
                            </p>
                        </div>
                    </div>
                    <div className="sn-step-row">
                        <div className="sn-step-marker">2</div>
                        <div className="sn-step-content">
                            <h3 className="sn-step-title">Add the matching snippet below</h3>
                            <p className="sn-step-body">
                                Pick your layer's tab and paste the snippet into your codebase — one
                                interceptor, one middleware, one small poller script.
                            </p>
                        </div>
                    </div>
                    <div className="sn-step-row">
                        <div className="sn-step-marker">3</div>
                        <div className="sn-step-content">
                            <h3 className="sn-step-title">Confirm events are flowing</h3>
                            <p className="sn-step-body">
                                Trigger any action in your app. Within a few seconds you should see
                                your architecture diagram go live on the dashboard.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="sn-tabs" role="tablist">
                    {(Object.keys(snippets) as Array<keyof typeof snippets>).map((key) => (
                        <button
                            key={key}
                            className={`sn-tab ${activeTab === key ? "active" : ""}`}
                            onClick={() => setActiveTab(key)}
                            role="tab"
                            aria-selected={activeTab === key}
                        >
                            {snippets[key].label}
                        </button>
                    ))}
                </div>

                <div className="sn-code-card">
                    <div className="sn-code-head">
                        <div className="sn-code-dots">
                            <span /><span /><span />
                        </div>
                        <button
                            className="sn-copy-btn"
                            onClick={() => copy(snippets[activeTab].code, activeTab)}
                        >
                            {copied === activeTab ? "Copied" : "Copy snippet"}
                        </button>
                    </div>
                    <pre className="sn-code-body sn-mono">{snippets[activeTab].code}</pre>
                </div>

                <div className="sn-status-card">
                    <div className="sn-status-left">
                        <span className="sn-status-dot" />
                        Waiting for first event…
                    </div>
                    <span className="sn-status-hint">This updates automatically once data arrives.</span>
                </div>
            </div>
        </div>
    );
}