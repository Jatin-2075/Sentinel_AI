type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

/**
 * API Base URL - loaded from environment or defaults to localhost development server
 * Set VITE_API_BASE in .env to override (e.g., VITE_API_BASE=https://api.example.com)
 */
export const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

/**
 * Routes that don't require authentication
 */
const AUTH_EXEMPT_PATHS = ["/auth/login", "/auth/signup"];

let isRefreshing = false;
let refreshQueue: Array<(success: boolean) => void> = [];

function flushQueue(success: boolean) {
    refreshQueue.forEach((resolve) => resolve(success));
    refreshQueue = [];
}

async function refreshToken(): Promise<boolean> {
    const refresh_token = localStorage.getItem("refresh");
    if (!refresh_token) return false;

    try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token }),
        });
        if (!res.ok) return false;

        const body = await res.json();
        localStorage.setItem("access", body.access_token);
        if (body.refresh_token) localStorage.setItem("refresh", body.refresh_token);
        return true;
    } catch {
        return false;
    }
}

function forceLogout() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    if (!window.location.pathname.includes("/auth")) {
        window.location.href = "/auth";
    }
}

async function waitForRefresh(): Promise<boolean> {
    return new Promise((resolve) => refreshQueue.push(resolve));
}

/**
 * Unified API request handler with automatic token refresh and error handling
 * Handles JWT token lifecycle: detects 401, refreshes token, retries request
 * 
 * @param method HTTP method
 * @param url API path (e.g., "/auth/login", "/incidents")
 * @param data Request body (optional)
 * @returns Parsed JSON response
 * @throws Error if request fails
 */
export async function API<T = any>(method: HttpMethod, url: string, data?: unknown): Promise<T> {
    const isFormData = data instanceof FormData;
    const isAuthExempt = AUTH_EXEMPT_PATHS.some((path) => url.startsWith(path));

    const request = () => {
        const access = localStorage.getItem("access");
        return fetch(`${API_BASE}${url}`, {
            method,
            headers: {
                ...(isFormData ? {} : { "Content-Type": "application/json" }),
                ...(access ? { Authorization: `Bearer ${access}` } : {}),
            },
            ...(method !== "GET" && data
                ? { body: isFormData ? (data as FormData) : JSON.stringify(data) }
                : {}),
        });
    };

    let res = await request();

    // Handle token expiration and retry
    if (res.status === 401 && !isAuthExempt) {
        if (!isRefreshing) {
            isRefreshing = true;
            const success = await refreshToken();
            isRefreshing = false;
            flushQueue(success);
            if (!success) {
                forceLogout();
                throw new Error("Session expired");
            }
        } else {
            const success = await waitForRefresh();
            if (!success) {
                forceLogout();
                throw new Error("Session expired");
            }
        }
        res = await request();
    }

    if (!res.ok) {
        if (res.status === 429) {
            throw new Error("Rate limit exceeded. Please wait a moment before sending another message.");
        }
        const errorBody = await res.json().catch(() => null);
        throw new Error(errorBody?.detail || `API Error ${res.status}`);
    }

    return res.json();
}