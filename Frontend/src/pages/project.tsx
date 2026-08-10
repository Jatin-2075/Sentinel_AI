import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { projectsAPI, incidentsAPI } from "../config/api";
import type { Project, Incident } from "../config/types";
import "../styles/pages/projects.css"

/* ------------------------------------------------------------------ */
/*  Types — mirror the SQLAlchemy models                              */
/* ------------------------------------------------------------------ */

interface Project {
    id: string;
    name: string;
    frontend_url: string;
    backend_url: string;
    database_type: string | null;
    database_host: string | null;
    database_port: number | null;
    database_name: string | null;
    api_key: string;
    created_at: string;
}

type EventSource = "frontend" | "backend" | "db";

interface ProjectEvent {
    id: string;
    source: EventSource;
    event_type: string;
    endpoint: string | null;
    duration_ms: number | null;
    status: string | null;
    http_status: number | null;
    created_at: string;
}

type Severity = "critical" | "high" | "medium" | "low";
type IncidentStatus = "Open" | "Investigating" | "Resolved";

interface Incident {
    id: string;
    event_id: string;
    title: string;
    severity: Severity;
    source_layer: EventSource | null;
    status: IncidentStatus;
    root_cause: string | null;
    summary: string | null;
    ai_suggestion: string | null;
    resolved_at: string | null;
    created_at: string;
}

interface ResolvedIncident {
    id: string;
    incident_id: string;
    incident_title: string;
    created_by: string | null;
    source: "ai_edited" | "manual" | string;
    resolution_text: string;
    created_at: string;
}

type Tab = "overview" | "incidents" | "resolved" | "events";

/* ------------------------------------------------------------------ */
/*  API — adjust base paths to match your router once the read       */
/*  endpoints exist (only /create, /myprojectlist and delete are      */
/*  wired up in projects_router.py today).                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Small presentational helpers                                      */
/* ------------------------------------------------------------------ */

const SEVERITY_LABEL: Record<Severity, string> = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
};

function SeverityBadge({ severity }: { severity: Severity }) {
    return (
        <span className={`pp-badge pp-badge-sev-${severity}`}>
            {SEVERITY_LABEL[severity]}
        </span>
    );
}

function StatusPill({ status }: { status: IncidentStatus }) {
    const cls =
        status === "Open" ? "open" : status === "Investigating" ? "inv" : "res";
    return (
        <span className={`pp-status pp-status-${cls}`}>
            <span className="pp-status-dot" />
            {status}
        </span>
    );
}

function SourceTag({ source }: { source: EventSource | null }) {
    if (!source) return <span className="pp-tag pp-tag-muted">unknown</span>;
    return <span className={`pp-tag pp-tag-${source}`}>{source}</span>;
}

function timeAgo(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diffMs / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
}

/* ------------------------------------------------------------------ */
/*  Architecture pulse — the page's signature element.                */
/*  Reads real incident + event data to color each layer, rather      */
/*  than the decorative dot-cycle used in the topbar.                 */
/* ------------------------------------------------------------------ */

type LayerHealth = "healthy" | "degraded" | "critical";

function layerHealth(
    layer: EventSource,
    incidents: Incident[],
    events: ProjectEvent[]
): LayerHealth {
    const openHit = incidents.some(
        (i) => i.source_layer === layer && i.status !== "Resolved"
    );
    if (openHit) return "critical";

    const recent = events.filter((e) => e.source === layer).slice(0, 20);
    const errorRate =
        recent.length === 0
            ? 0
            : recent.filter((e) => e.status && e.status !== "success").length /
            recent.length;
    if (errorRate > 0.15) return "degraded";
    return "healthy";
}

function ArchitecturePulse({
    incidents,
    events,
}: {
    incidents: Incident[];
    events: ProjectEvent[];
}) {
    const layers: { key: EventSource; label: string }[] = [
        { key: "frontend", label: "Frontend" },
        { key: "backend", label: "Backend" },
        { key: "db", label: "Database" },
    ];

    return (
        <div className="pp-arch">
            {layers.map((layer, i) => {
                const health = layerHealth(layer.key, incidents, events);
                return (
                    <div className="pp-arch-item" key={layer.key}>
                        <div className={`pp-arch-node pp-arch-${health}`}>
                            <span className="pp-arch-node-dot" />
                            <span className="pp-arch-node-label">{layer.label}</span>
                            <span className="pp-arch-node-state">
                                {health === "healthy"
                                    ? "Healthy"
                                    : health === "degraded"
                                        ? "Degraded"
                                        : "Critical"}
                            </span>
                        </div>
                        {i < layers.length - 1 && (
                            <span
                                className={`pp-arch-link pp-arch-link-${health}`}
                                aria-hidden="true"
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

export default function ProjectDashboard() {
    const { projectId } = useParams<{ projectId: string }>();

    const [project, setProject] = useState<Project | null>(null);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [resolved, setResolved] = useState<ResolvedIncident[]>([]);
    const [events, setEvents] = useState<ProjectEvent[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<Tab>("overview");
    const [incidentFilter, setIncidentFilter] = useState<
        "all" | IncidentStatus
    >("all");
    const [keyRevealed, setKeyRevealed] = useState(false);
    const [copied, setCopied] = useState(false);

    const load = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        try {
            const [proj, inc, evt] = await Promise.all([
                projectsAPI.getProject(projectId),
                incidentsAPI.list(projectId),
                projectsAPI.listEvents(projectId),
            ]);
            setProject(proj);
            setIncidents(inc);
            setEvents(evt);
            // Resolved incidents - fetch from incident detail if available
            setResolved([]);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load project.");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        load();
    }, [load]);

    const openCount = useMemo(
        () => incidents.filter((i) => i.status !== "Resolved").length,
        [incidents]
    );
    const resolvedCount = resolved.length;
    const eventsLast24h = useMemo(() => {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        return events.filter((e) => new Date(e.created_at).getTime() > cutoff)
            .length;
    }, [events]);
    const avgDuration = useMemo(() => {
        const withDur = events.filter((e) => typeof e.duration_ms === "number");
        if (withDur.length === 0) return null;
        const sum = withDur.reduce((a, e) => a + (e.duration_ms ?? 0), 0);
        return Math.round(sum / withDur.length);
    }, [events]);

    const filteredIncidents = useMemo(
        () =>
            incidentFilter === "all"
                ? incidents
                : incidents.filter((i) => i.status === incidentFilter),
        [incidents, incidentFilter]
    );

    function copyKey() {
        if (!project) return;
        navigator.clipboard.writeText(project.api_key).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        });
    }

    if (loading) {
        return (
            <div className="pp-page">
                <div className="pp-loading">
                    <span className="pp-loading-dot" />
                    Loading project…
                </div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="pp-page">
                <div className="pp-error-state">
                    <p className="pp-error-title">Couldn't load this project</p>
                    <p className="pp-error-body">
                        {error ?? "The project may have been removed, or the link is wrong."}
                    </p>
                    <button className="pp-btn-primary" onClick={load}>
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="pp-page">
            <div className="pp-container">
                {/* ---------------- header ---------------- */}
                <div className="pp-header">
                    <div className="pp-header-top">
                        <div className="pp-eyebrow">
                            <span className="pp-eyebrow-dot" />
                            PROJECT
                        </div>
                        <span className="pp-created">
                            created {new Date(project.created_at).toLocaleDateString()}
                        </span>
                    </div>
                    <h1 className="pp-title">{project.name}</h1>
                    <div className="pp-meta-row">
                        <a
                            className="pp-meta-chip"
                            href={project.frontend_url}
                            target="_blank"
                            rel="noreferrer"
                        >
                            {project.frontend_url}
                        </a>
                        <a
                            className="pp-meta-chip"
                            href={project.backend_url}
                            target="_blank"
                            rel="noreferrer"
                        >
                            {project.backend_url}
                        </a>
                        {project.database_type && (
                            <span className="pp-meta-chip pp-meta-chip-static">
                                {project.database_type}
                                {project.database_host ? ` · ${project.database_host}` : ""}
                            </span>
                        )}
                    </div>

                    <div className="pp-key-row">
                        <div className="pp-key-label">API KEY</div>
                        <div className="pp-key-value">
                            {keyRevealed ? project.api_key : "•".repeat(28)}
                        </div>
                        <button
                            className="pp-key-btn"
                            onClick={() => setKeyRevealed((v) => !v)}
                        >
                            {keyRevealed ? "Hide" : "Reveal"}
                        </button>
                        <button className="pp-key-btn" onClick={copyKey}>
                            {copied ? "Copied" : "Copy"}
                        </button>
                    </div>
                </div>

                {/* ---------------- tabs ---------------- */}
                <div className="pp-tabs">
                    {(
                        [
                            ["overview", "Overview"],
                            ["incidents", `Incidents${openCount ? ` (${openCount})` : ""}`],
                            ["resolved", "Resolved"],
                            ["events", "Live Events"],
                        ] as [Tab, string][]
                    ).map(([key, label]) => (
                        <button
                            key={key}
                            className={`pp-tab ${tab === key ? "active" : ""}`}
                            onClick={() => setTab(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* ---------------- overview ---------------- */}
                {tab === "overview" && (
                    <div className="pp-panel">
                        <ArchitecturePulse incidents={incidents} events={events} />

                        <div className="pp-stat-grid">
                            <div className="pp-stat-card">
                                <div className="pp-stat-value pp-stat-alert">{openCount}</div>
                                <div className="pp-stat-label">Open incidents</div>
                            </div>
                            <div className="pp-stat-card">
                                <div className="pp-stat-value pp-stat-ok">{resolvedCount}</div>
                                <div className="pp-stat-label">Resolved incidents</div>
                            </div>
                            <div className="pp-stat-card">
                                <div className="pp-stat-value">{eventsLast24h}</div>
                                <div className="pp-stat-label">Events, last 24h</div>
                            </div>
                            <div className="pp-stat-card">
                                <div className="pp-stat-value">
                                    {avgDuration !== null ? `${avgDuration}ms` : "—"}
                                </div>
                                <div className="pp-stat-label">Avg. response time</div>
                            </div>
                        </div>

                        <div className="pp-section-head">
                            <h2>Recent incidents</h2>
                            <button className="pp-link-btn" onClick={() => setTab("incidents")}>
                                View all
                            </button>
                        </div>
                        {incidents.length === 0 ? (
                            <EmptyState
                                title="No incidents yet"
                                body="Once Sentinel detects an anomaly across your stack, it will show up here with an AI root-cause summary."
                            />
                        ) : (
                            <div className="pp-incident-list">
                                {incidents.slice(0, 3).map((inc) => (
                                    <IncidentCard key={inc.id} incident={inc} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ---------------- incidents ---------------- */}
                {tab === "incidents" && (
                    <div className="pp-panel">
                        <div className="pp-filter-row">
                            {(["all", "Open", "Investigating", "Resolved"] as const).map(
                                (f) => (
                                    <button
                                        key={f}
                                        className={`pp-filter-chip ${incidentFilter === f ? "active" : ""
                                            }`}
                                        onClick={() => setIncidentFilter(f)}
                                    >
                                        {f === "all" ? "All" : f}
                                    </button>
                                )
                            )}
                        </div>

                        {filteredIncidents.length === 0 ? (
                            <EmptyState
                                title="Nothing here"
                                body="No incidents match this filter yet."
                            />
                        ) : (
                            <div className="pp-incident-list">
                                {filteredIncidents.map((inc) => (
                                    <IncidentCard key={inc.id} incident={inc} expanded />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ---------------- resolved ---------------- */}
                {tab === "resolved" && (
                    <div className="pp-panel">
                        {resolved.length === 0 ? (
                            <EmptyState
                                title="No resolutions logged yet"
                                body="When an incident is marked resolved, the fix that worked is saved here — and used to ground future AI suggestions."
                            />
                        ) : (
                            <div className="pp-resolved-list">
                                {resolved.map((r) => (
                                    <div className="pp-resolved-card" key={r.id}>
                                        <div className="pp-resolved-head">
                                            <span className="pp-resolved-title">
                                                {r.incident_title}
                                            </span>
                                            <span
                                                className={`pp-tag ${r.source === "ai_edited"
                                                        ? "pp-tag-ai"
                                                        : "pp-tag-manual"
                                                    }`}
                                            >
                                                {r.source === "ai_edited" ? "AI-assisted" : "Manual"}
                                            </span>
                                        </div>
                                        <p className="pp-resolved-text">{r.resolution_text}</p>
                                        <div className="pp-resolved-foot">
                                            {r.created_by && <span>by {r.created_by}</span>}
                                            <span>{timeAgo(r.created_at)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ---------------- events ---------------- */}
                {tab === "events" && (
                    <div className="pp-panel">
                        {events.length === 0 ? (
                            <EmptyState
                                title="No events received yet"
                                body="Point your frontend interceptor, backend middleware, and DB poller at this project's API key to start streaming health signals."
                            />
                        ) : (
                            <div className="pp-table-wrap">
                                <table className="pp-table">
                                    <thead>
                                        <tr>
                                            <th>Source</th>
                                            <th>Event</th>
                                            <th>Endpoint</th>
                                            <th>Duration</th>
                                            <th>Status</th>
                                            <th>Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {events.map((e) => (
                                            <tr key={e.id}>
                                                <td>
                                                    <SourceTag source={e.source} />
                                                </td>
                                                <td className="pp-mono">{e.event_type}</td>
                                                <td className="pp-mono pp-dim">
                                                    {e.endpoint ?? "—"}
                                                </td>
                                                <td className="pp-mono">
                                                    {e.duration_ms !== null ? `${e.duration_ms}ms` : "—"}
                                                </td>
                                                <td>
                                                    <span
                                                        className={`pp-event-status ${e.status === "success" ? "ok" : "bad"
                                                            }`}
                                                    >
                                                        {e.status ?? "—"}
                                                        {e.http_status ? ` · ${e.http_status}` : ""}
                                                    </span>
                                                </td>
                                                <td className="pp-dim">{timeAgo(e.created_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Incident card + empty state                                       */
/* ------------------------------------------------------------------ */

function IncidentCard({
    incident,
    expanded = false,
}: {
    incident: Incident;
    expanded?: boolean;
}) {
    return (
        <div className="pp-incident-card">
            <div className="pp-incident-top">
                <div className="pp-incident-top-left">
                    <SeverityBadge severity={incident.severity} />
                    <SourceTag source={incident.source_layer} />
                </div>
                <StatusPill status={incident.status} />
            </div>
            <div className="pp-incident-title">{incident.title}</div>
            {incident.summary && (
                <p className="pp-incident-summary">{incident.summary}</p>
            )}
            {expanded && incident.root_cause && (
                <div className="pp-incident-block">
                    <div className="pp-incident-block-label">Root cause</div>
                    <p>{incident.root_cause}</p>
                </div>
            )}
            {expanded && incident.ai_suggestion && (
                <div className="pp-incident-block pp-incident-block-ai">
                    <div className="pp-incident-block-label">AI suggested fix</div>
                    <p>{incident.ai_suggestion}</p>
                </div>
            )}
            <div className="pp-incident-foot">{timeAgo(incident.created_at)}</div>
        </div>
    );
}

function EmptyState({ title, body }: { title: string; body: string }) {
    return (
        <div className="pp-empty">
            <p className="pp-empty-title">{title}</p>
            <p className="pp-empty-body">{body}</p>
        </div>
    );
}