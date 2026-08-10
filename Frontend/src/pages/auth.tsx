import { useState, type FormEvent, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Authcontext } from "../context/auth_context";
import "../styles/pages/auth.css";

type Mode = "login" | "signup";

function AuthBackground() {
    return (
        <div className="au-bg" aria-hidden="true">
            <span className="au-orb au-orb-blue" />
            <span className="au-orb au-orb-green" />
            <span className="au-grid" />
        </div>
    );
}

export default function Auth() {
    const navigate = useNavigate();
    const authContext = useContext(Authcontext);

    const [mode, setMode] = useState<Mode>("login");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [loginUsername, setLoginUsername] = useState("");
    const [loginPassword, setLoginPassword] = useState("");

    const [signupUsername, setSignupUsername] = useState("");
    const [signupPassword, setSignupPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    function switchMode(next: Mode) {
        if (next === mode || loading) return;
        setError(null);
        setMode(next);
    }

    async function handleLogin(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            if (!authContext) {
                throw new Error("Auth context not available");
            }
            await authContext.login(loginUsername, loginPassword);
            navigate("/dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
        } finally {
            setLoading(false);
        }
    }

    async function handleSignup(e: FormEvent) {
        e.preventDefault();
        setError(null);

        if (signupPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            if (!authContext) {
                throw new Error("Auth context not available");
            }
            await authContext.signup(signupUsername, signupPassword);
            navigate("/createprofile");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Signup failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="au-page">
            <AuthBackground />

            <div className="au-card">
                <div className="au-logo">
                    <span className="au-logo-dot" />
                    <span className="au-mono">sentinel</span>
                </div>

                <div className="au-tabs" role="tablist" aria-label="Auth mode">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={mode === "login"}
                        className={`au-tab ${mode === "login" ? "au-tab-active" : ""}`}
                        onClick={() => switchMode("login")}
                    >
                        Log in
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={mode === "signup"}
                        className={`au-tab ${mode === "signup" ? "au-tab-active" : ""}`}
                        onClick={() => switchMode("signup")}
                    >
                        Sign up
                    </button>
                    <span className={`au-tab-thumb ${mode === "signup" ? "au-tab-thumb-right" : ""}`} />
                </div>

                <div className="au-viewport">
                    <div className={`au-track ${mode === "signup" ? "au-track-signup" : ""}`}>
                        <form className="au-panel" onSubmit={handleLogin} aria-hidden={mode !== "login"}>
                            <label className="au-field">
                                <span className="au-label">Username</span>
                                <input
                                    className="au-input"
                                    type="text"
                                    autoComplete="username"
                                    value={loginUsername}
                                    onChange={(e) => setLoginUsername(e.target.value)}
                                    disabled={mode !== "login"}
                                    required={mode === "login"}
                                />
                            </label>

                            <label className="au-field">
                                <span className="au-label">Password</span>
                                <input
                                    className="au-input"
                                    type="password"
                                    autoComplete="current-password"
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                    disabled={mode !== "login"}
                                    required={mode === "login"}
                                />
                            </label>

                            {mode === "login" && error && <p className="au-error">{error}</p>}

                            <button className="au-submit" type="submit" disabled={loading || mode !== "login"}>
                                {loading && mode === "login" ? "Logging in…" : "Log in"}
                            </button>
                        </form>

                        <form className="au-panel" onSubmit={handleSignup} aria-hidden={mode !== "signup"}>
                            <label className="au-field">
                                <span className="au-label">Username</span>
                                <input
                                    className="au-input"
                                    type="text"
                                    autoComplete="username"
                                    value={signupUsername}
                                    onChange={(e) => setSignupUsername(e.target.value)}
                                    disabled={mode !== "signup"}
                                    required={mode === "signup"}
                                />
                            </label>

                            <label className="au-field">
                                <span className="au-label">Password</span>
                                <input
                                    className="au-input"
                                    type="password"
                                    autoComplete="new-password"
                                    value={signupPassword}
                                    onChange={(e) => setSignupPassword(e.target.value)}
                                    disabled={mode !== "signup"}
                                    required={mode === "signup"}
                                    minLength={8}
                                />
                            </label>

                            <label className="au-field">
                                <span className="au-label">Confirm password</span>
                                <input
                                    className="au-input"
                                    type="password"
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={mode !== "signup"}
                                    required={mode === "signup"}
                                    minLength={8}
                                />
                            </label>

                            {mode === "signup" && error && <p className="au-error">{error}</p>}

                            <button className="au-submit" type="submit" disabled={loading || mode !== "signup"}>
                                {loading && mode === "signup" ? "Creating account…" : "Create account"}
                            </button>
                        </form>
                    </div>
                </div>

                <p className="au-switch-line">
                    {mode === "login" ? (
                        <>
                            New here?{" "}
                            <button type="button" className="au-link" onClick={() => switchMode("signup")}>
                                Create an account
                            </button>
                        </>
                    ) : (
                        <>
                            Already have an account?{" "}
                            <button type="button" className="au-link" onClick={() => switchMode("login")}>
                                Log in
                            </button>
                        </>
                    )}
                </p>
            </div>
        </div>
    );
}