// ============= Auth & User =============
export interface User {
    id: string;
    username: string;
    is_active: boolean;
}

export interface SignupPayload {
    username: string;
    password: string;
}

export interface LoginPayload {
    username: string;
    password: string;
}

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
}

export interface RefreshTokenPayload {
    refresh_token: string;
}

// ============= Projects =============
export interface Project {
    id: string;
    auth_id: string;
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

export interface ProjectCreatePayload {
    name: string;
    frontend_url: string;
    backend_url: string;
    database_type?: string;
    database_host?: string;
    database_port?: number;
    database_name?: string;
}

// ============= Events =============
export interface Event {
    id: string;
    project_id: string;
    source: "frontend" | "backend" | "db";
    event_type: string;
    endpoint?: string;
    duration_ms?: number;
    status: "success" | "error" | "timeout";
    http_status?: number;
    payload?: Record<string, any>;
    created_at: string;
}

export interface EventCreatePayload {
    source: "frontend" | "backend" | "db";
    event_type: string;
    endpoint?: string;
    duration_ms?: number;
    status: "success" | "error" | "timeout";
    http_status?: number;
    error_type?: string;
    queue_depth?: number;
    db_query_time_ms?: number;
    page?: string;
    payload?: Record<string, any>;
}

export interface DBSnapshotPayload {
    active_connections: number;
    pool_usage_pct: number;
    slow_queries?: Array<{ query: string; mean_exec_time: number }>;
}

// ============= Incidents =============
export interface Incident {
    id: string;
    project_id: string;
    title: string;
    severity: "warning" | "critical";
    summary: string;
    root_cause?: string;
    source_layer: "frontend" | "backend" | "database";
    status: "Open" | "In Progress" | "Resolved";
    created_at: string;
    resolved_at?: string;
}

export interface IncidentDetailResponse extends Incident {
    similar_incidents?: SimilarIncident[];
}

export interface SimilarIncident {
    id: string;
    title: string;
    severity: string;
    root_cause?: string;
    resolution?: string;
}

export interface IncidentUpdatePayload {
    title?: string;
    status?: "Open" | "In Progress" | "Resolved";
    root_cause?: string;
}

export interface RunbookCreatePayload {
    resolution_text: string;
}

export interface Runbook {
    id: string;
    project_id: string;
    incident_id: string;
    resolution_text: string;
    created_at: string;
}

// ============= Health & Status =============
export interface LayerHealth {
    status: "healthy" | "unhealthy" | "unknown";
    last_event_at?: string;
}

export interface ProjectHealth {
    frontend: LayerHealth;
    backend: LayerHealth;
    database: LayerHealth;
    open_incidents: number;
    critical_incidents: number;
}

// ============= Demo =============
export interface DemoTriggerPayload {
    project_id: string;
    scenario: "latency_spike" | "error_spike" | "frontend_timeout" | "db_pool_exhaustion";
}

// ============= Personal Data =============
export interface PersonalData {
  id: string;
  name: string;
  dob: string;
  phone: string;
  email: string;
  occupation: string | null;
}

export interface PersonalDataCreatePayload {
  name: string;
  dob: string;
  phone: string;
  email: string;
  occupation?: string;
}

export type PersonalDataUpdatePayload = Partial<PersonalDataCreatePayload>;