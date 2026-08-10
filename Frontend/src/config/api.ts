import { API } from "./connecting_api";
import type {
    User,
    TokenResponse,
    SignupPayload,
    LoginPayload,
    RefreshTokenPayload,
    Project,
    ProjectCreatePayload,
    Event,
    EventCreatePayload,
    DBSnapshotPayload,
    Incident,
    IncidentDetailResponse,
    IncidentUpdatePayload,
    Runbook,
    RunbookCreatePayload,
    ProjectHealth,
    PersonalData,
    PersonalDataCreatePayload,
    PersonalDataUpdatePayload,
    DemoTriggerPayload,
} from "./types";

/**
 * Sentinel API Service
 * Comprehensive API client for all Sentinel backend endpoints
 * Organized by domain: Auth, Projects, Events, Incidents, Demo, Profile, WebSocket
 */

// ============= AUTH ENDPOINTS =============
export const authAPI = {
    /**
     * Sign up a new user
     */
    signup: async (payload: SignupPayload): Promise<TokenResponse & { message: string }> => {
        return API("POST", "/auth/signup", payload);
    },

    /**
     * Login with username and password
     */
    login: async (payload: LoginPayload): Promise<TokenResponse> => {
        return API("POST", "/auth/login", payload);
    },

    /**
     * Refresh access token using refresh token
     */
    refreshToken: async (refreshToken: string): Promise<TokenResponse> => {
        return API("POST", "/auth/refresh", { refresh_token: refreshToken });
    },

    /**
     * Create user profile (personal data)
     */
    createProfile: async (data: PersonalDataCreatePayload): Promise<PersonalData> => {
        return API("POST", "/auth/createprofile", data);
    },

    /**
     * Get current user's profile
     */
    getProfile: async (): Promise<PersonalData> => {
        return API("GET", "/auth/getprofile");
    },

    /**
     * Update user profile
     */
    updateProfile: async (data: PersonalDataUpdatePayload): Promise<PersonalData> => {
        return API("PUT", "/auth/updateprofile", data);
    },
};

// ============= PROJECT ENDPOINTS =============
export const projectsAPI = {
    /**
     * Create a new project and get API key
     */
    create: async (payload: ProjectCreatePayload): Promise<Project> => {
        return API("POST", "/project/create", payload);
    },

    /**
     * Get list of user's projects
     */
    listMyProjects: async (): Promise<Project[]> => {
        return API("GET", "/project/myprojectlist");
    },

    /**
     * Get project details
     */
    getProject: async (projectId: string): Promise<Project> => {
        return API("GET", `/project/${projectId}`);
    },

    /**
     * Regenerate API key for a project
     */
    regenerateApiKey: async (projectId: string): Promise<Project> => {
        return API("PUT", `/project/${projectId}/regenerate-key`);
    },

    /**
     * Delete a project
     */
    delete: async (projectId: string): Promise<void> => {
        return API("DELETE", `/project/${projectId}`);
    },

    /**
     * Get health status of all layers (frontend, backend, database)
     */
    getHealth: async (projectId: string): Promise<ProjectHealth> => {
        return API("GET", `/project/${projectId}/health`);
    },

    /**
     * List events for a project with optional filtering
     */
    listEvents: async (
        projectId: string,
        options?: { source?: string; skip?: number; limit?: number }
    ): Promise<Event[]> => {
        const params = new URLSearchParams();
        if (options?.source) params.append("source", options.source);
        if (options?.skip) params.append("skip", options.skip.toString());
        if (options?.limit) params.append("limit", options.limit.toString());
        const query = params.toString() ? `?${params.toString()}` : "";
        return API("GET", `/project/${projectId}/events${query}`);
    },
};

// ============= EVENT ENDPOINTS (Ingestion API) =============
/**
 * Event ingestion - used by frontend/backend interceptors and DB pollers
 * These endpoints require API key authentication (not JWT)
 * Use these from your instrumentation (frontend/backend/database monitoring)
 */
export const eventsAPI = {
    /**
     * Send a health event from frontend/backend
     * Should be called with Authorization: Bearer <API_KEY> header
     * This is handled by the instrumentation code, not the dashboard
     */
    send: async (payload: EventCreatePayload, apiKey: string): Promise<Event> => {
        return fetch(`${import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000"}/project/event/postproject`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
        }).then(r => r.json());
    },

    /**
     * Send database snapshot
     * Should be called with Authorization: Bearer <API_KEY> header
     */
    sendDBSnapshot: async (payload: DBSnapshotPayload, apiKey: string): Promise<Event> => {
        return fetch(`${import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000"}/project/db-snapshot`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
        }).then(r => r.json());
    },
};

// ============= INCIDENT ENDPOINTS =============
export const incidentsAPI = {
    /**
     * List all incidents across user's projects with optional filtering
     */
    list: async (options?: {
        projectId?: string;
        statusFilter?: string;
        severity?: string;
        skip?: number;
        limit?: number;
    }): Promise<Incident[]> => {
        const params = new URLSearchParams();
        if (options?.projectId) params.append("project_id", options.projectId);
        if (options?.statusFilter) params.append("status_filter", options.statusFilter);
        if (options?.severity) params.append("severity", options.severity);
        if (options?.skip) params.append("skip", options.skip.toString());
        if (options?.limit) params.append("limit", options.limit.toString());
        const query = params.toString() ? `?${params.toString()}` : "";
        return API("GET", `/incidents${query}`);
    },

    /**
     * Get incident details with similar incidents from RAG
     */
    getDetail: async (incidentId: string): Promise<IncidentDetailResponse> => {
        return API("GET", `/incidents/${incidentId}`);
    },

    /**
     * Update incident status, title, or root cause
     */
    update: async (incidentId: string, payload: IncidentUpdatePayload): Promise<Incident> => {
        return API("PUT", `/incidents/${incidentId}`, payload);
    },

    /**
     * Mark incident as resolved and save resolution/runbook
     */
    resolve: async (incidentId: string, payload: RunbookCreatePayload): Promise<Runbook> => {
        return API("POST", `/incidents/${incidentId}/resolve`, payload);
    },

    /**
     * Delete an incident
     */
    delete: async (incidentId: string): Promise<void> => {
        return API("DELETE", `/incidents/${incidentId}`);
    },

    /**
     * Get runbooks (resolution history) for an incident
     */
    listRunbooks: async (incidentId: string): Promise<Runbook[]> => {
        return API("GET", `/incidents/${incidentId}/runbooks`);
    },

    /**
     * Update a runbook entry
     */
    updateRunbook: async (runbookId: string, payload: Partial<RunbookCreatePayload>): Promise<Runbook> => {
        return API("PUT", `/runbooks/${runbookId}`, payload);
    },

    /**
     * Delete a runbook entry
     */
    deleteRunbook: async (runbookId: string): Promise<void> => {
        return API("DELETE", `/runbooks/${runbookId}`);
    },
};

// ============= DEMO ENDPOINTS =============
export const demoAPI = {
    /**
     * Trigger a demo failure scenario for testing
     * Runs through the full pipeline: event → queue → worker → RAG → LLM → WebSocket → dashboard
     */
    triggerFailure: async (payload: DemoTriggerPayload): Promise<Event> => {
        return API("POST", "/demo/trigger", payload);
    },
};

// ============= WEBSOCKET =============
/**
 * WebSocket connection for live incident updates
 * Joins user into a project-specific channel
 * Pushes new incidents and architecture diagram updates in real time
 */
export const createWebSocketConnection = (projectId: string, accessToken: string): WebSocket => {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsBaseUrl = (import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000")
        .replace("https://", "")
        .replace("http://", "");
    
    const wsUrl = `${wsProtocol}//${wsBaseUrl}/live/${projectId}?token=${encodeURIComponent(accessToken)}`;
    return new WebSocket(wsUrl);
};

/**
 * Helper to handle WebSocket connection lifecycle
 */
export const connectLiveUpdates = (
    projectId: string,
    accessToken: string,
    onIncident: (incident: Incident) => void,
    onError: (error: Event) => void,
    onClose: () => void
): (() => void) => {
    const ws = createWebSocketConnection(projectId, accessToken);

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            if (message.type === "incident") {
                onIncident(message.data);
            }
        } catch (err) {
            console.error("Failed to parse WebSocket message:", err);
        }
    };

    ws.onerror = (event) => onError(event);
    ws.onclose = () => onClose();

    return () => ws.close();
};

export default {
    auth: authAPI,
    projects: projectsAPI,
    events: eventsAPI,
    incidents: incidentsAPI,
    demo: demoAPI,
    createWebSocketConnection,
    connectLiveUpdates,
};
