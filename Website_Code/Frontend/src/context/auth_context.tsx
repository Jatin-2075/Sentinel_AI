import { createContext, useState, useEffect, type ReactNode, type Dispatch, type SetStateAction } from "react";
import { authAPI } from "../config/api";
import type { User, TokenResponse } from "../config/types";

export const Authcontext = createContext<{
    user: User | null;
    setuser: Dispatch<SetStateAction<User | null>>;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<void>;
    signup: (username: string, password: string) => Promise<void>;
    logout: () => void;
} | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setuser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize auth state from localStorage on mount
    useEffect(() => {
        const accessToken = localStorage.getItem("access");
        if (accessToken) {
            try {
                // Decode JWT to get user info (payload is second part)
                const payload = JSON.parse(atob(accessToken.split(".")[1]));
                // Note: JWT payload contains "sub" which is the user_id
                // For now, set a minimal user object
                // In a real app, you'd call /auth/me endpoint to get full user info
                setuser({
                    id: payload.sub,
                    username: "User", // This should come from /auth/me
                    is_active: true,
                });
            } catch (err) {
                console.error("Failed to parse auth token:", err);
                localStorage.removeItem("access");
                localStorage.removeItem("refresh");
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (username: string, password: string) => {
        setIsLoading(true);
        try {
            const response = await authAPI.login({ username, password });
            localStorage.setItem("access", response.access_token);
            localStorage.setItem("refresh", response.refresh_token);
            
            // Decode JWT to get user info
            const payload = JSON.parse(atob(response.access_token.split(".")[1]));
            setuser({
                id: payload.sub,
                username: username,
                is_active: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const signup = async (username: string, password: string) => {
        setIsLoading(true);
        try {
            const response = await authAPI.signup({ username, password });
            localStorage.setItem("access", response.access_token);
            localStorage.setItem("refresh", response.refresh_token);
            
            // Decode JWT to get user info
            const payload = JSON.parse(atob(response.access_token.split(".")[1]));
            setuser({
                id: payload.sub,
                username: username,
                is_active: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        setuser(null);
    };

    return (
        <Authcontext.Provider
            value={{
                user,
                setuser,
                isLoading,
                isAuthenticated: !!user,
                login,
                signup,
                logout,
            }}
        >
            {children}
        </Authcontext.Provider>
    );
};