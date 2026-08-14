import { useState } from "react";
import { X, Copy, Check, Loader2, ChevronDown } from "lucide-react";
import { projectsAPI } from "../config/api";
import { API_BASE } from "../config/connecting_api";
import "../styles/add_project_modal.css";

type DatabaseType = "" | "postgres" | "mysql" | "mongodb";

type CreatedProject = {
    id: string;
    name: string;
    api_key: string;
    [key: string]: unknown;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onCreated?: (project: CreatedProject) => void;
};

export default function AddProjectModal({ isOpen, onClose, onCreated }: Props) {
    const [step, setStep] = useState<"form" | "success">("form");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState<CreatedProject | null>(null);
    const [copied, setCopied] = useState(false);
    const [envCopied, setEnvCopied] = useState(false);
    const [showDb, setShowDb] = useState(false);

    const [form, setForm] = useState({
        name: "",
        frontend_url: "",
        backend_url: "",
        database_type: "" as DatabaseType,
        database_host: "",
        database_port: "",
        database_name: "",
    });

    function update<K extends keyof typeof form>(field: K, value: string) {
        setForm((f) => ({ ...f, [field]: value }));
    }

    function reset() {
        setStep("form");
        setError(null);
        setCopied(false);
        setEnvCopied(false);
        setShowDb(false);
        setForm({
            name: "",
            frontend_url: "",
            backend_url: "",
            database_type: "",
            database_host: "",
            database_port: "",
            database_name: "",
        });
    }

    function handleClose() {
        onClose();
        setTimeout(reset, 200);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!form.name.trim() || !form.frontend_url.trim() || !form.backend_url.trim()) {
            setError("Name, frontend URL, and backend URL are required.");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                name: form.name.trim(),
                frontend_url: form.frontend_url.trim(),
                backend_url: form.backend_url.trim(),
                database_type: form.database_type || undefined,
                database_host: form.database_host || undefined,
                database_port: form.database_port ? Number(form.database_port) : undefined,
                database_name: form.database_name || undefined,
            };

            const project = await projectsAPI.create(payload);
            setCreated(project as CreatedProject);
            setStep("success");
            onCreated?.(project as CreatedProject);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't create project. Try again.");
        } finally {
            setSubmitting(false);
        }
    }

    function copyKey() {
        if (!created?.api_key) return;
        navigator.clipboard.writeText(created.api_key);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    }

    function copyEnvBlock() {
        if (!created) return;
        const block = `SENTINEL_URL=${API_BASE}\nSENTINEL_API_KEY=${created.api_key}`;
        navigator.clipboard.writeText(block);
        setEnvCopied(true);
        setTimeout(() => setEnvCopied(false), 1800);
    }

    if (!isOpen) return null;

    return (
        <div
            className="apm-backdrop"
            onClick={(e) => e.target === e.currentTarget && step === "form" && handleClose()}
        >
            <div className="apm-panel">
                {step === "form" ? (
                    <>
                        <div className="apm-header">
                            <div>
                                <div className="apm-eyebrow apm-eyebrow-new">
                                    <span className="apm-dot apm-dot-orange" />
                                    New project
                                </div>
                                <h2 className="apm-title">Register a monitored service</h2>
                            </div>
                            <button className="apm-close" onClick={handleClose}>
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="apm-form">
                            <label className="apm-field">
                                <span className="apm-label">Project name</span>
                                <input
                                    autoFocus
                                    value={form.name}
                                    onChange={(e) => update("name", e.target.value)}
                                    placeholder="checkout-service"
                                    className="apm-input"
                                />
                            </label>

                            <div className="apm-row">
                                <label className="apm-field">
                                    <span className="apm-label">Frontend URL</span>
                                    <input
                                        value={form.frontend_url}
                                        onChange={(e) => update("frontend_url", e.target.value)}
                                        placeholder="https://app.example.com"
                                        className="apm-input"
                                    />
                                </label>
                                <label className="apm-field">
                                    <span className="apm-label">Backend URL</span>
                                    <input
                                        value={form.backend_url}
                                        onChange={(e) => update("backend_url", e.target.value)}
                                        placeholder="https://api.example.com"
                                        className="apm-input"
                                    />
                                </label>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowDb((s) => !s)}
                                className="apm-db-toggle"
                            >
                                <span className="apm-label">
                                    Database <span className="apm-optional">(optional)</span>
                                </span>
                                <ChevronDown
                                    size={15}
                                    className={`apm-chevron ${showDb ? "apm-chevron-open" : ""}`}
                                />
                            </button>

                            {showDb && (
                                <div className="apm-db-fields">
                                    <label className="apm-field">
                                        <span className="apm-label">Type</span>
                                        <select
                                            value={form.database_type}
                                            onChange={(e) =>
                                                update("database_type", e.target.value)
                                            }
                                            className="apm-input"
                                        >
                                            <option value="">Select type</option>
                                            <option value="postgres">PostgreSQL</option>
                                            <option value="mysql">MySQL</option>
                                            <option value="mongodb">MongoDB</option>
                                        </select>
                                    </label>
                                    <div className="apm-row apm-row-3">
                                        <label className="apm-field">
                                            <span className="apm-label">Host</span>
                                            <input
                                                value={form.database_host}
                                                onChange={(e) =>
                                                    update("database_host", e.target.value)
                                                }
                                                placeholder="db.host.com"
                                                className="apm-input"
                                            />
                                        </label>
                                        <label className="apm-field">
                                            <span className="apm-label">Port</span>
                                            <input
                                                value={form.database_port}
                                                onChange={(e) =>
                                                    update("database_port", e.target.value)
                                                }
                                                placeholder="5432"
                                                inputMode="numeric"
                                                className="apm-input"
                                            />
                                        </label>
                                        <label className="apm-field">
                                            <span className="apm-label">DB name</span>
                                            <input
                                                value={form.database_name}
                                                onChange={(e) =>
                                                    update("database_name", e.target.value)
                                                }
                                                placeholder="prod"
                                                className="apm-input"
                                            />
                                        </label>
                                    </div>
                                </div>
                            )}

                            {error && <div className="apm-error">{error}</div>}

                            <div className="apm-actions">
                                <button type="button" onClick={handleClose} className="apm-btn-ghost">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting} className="apm-btn-primary">
                                    {submitting && <Loader2 size={14} className="apm-spin" />}
                                    {submitting ? "Creating…" : "Create project"}
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="apm-success">
                        <div className="apm-eyebrow apm-eyebrow-success">
                            <span className="apm-dot apm-dot-green" />
                            Project created
                        </div>
                        <h2 className="apm-title">{created?.name}</h2>

                        <div className="apm-label apm-label-block">
                            API key <span className="apm-optional">— shown once, store it now</span>
                        </div>
                        <div className="apm-key-row">
                            <code className="apm-key">{created?.api_key}</code>
                            <button onClick={copyKey} className="apm-copy-btn">
                                {copied ? <Check size={13} /> : <Copy size={13} />}
                                {copied ? "Copied" : "Copy"}
                            </button>
                        </div>

                        <div className="apm-label apm-label-block">
                            Add to each layer&apos;s environment
                        </div>
                        <div className="apm-env-block">
                            <div>
                                <span className="apm-env-key">SENTINEL_URL=</span>
                                <span className="apm-env-val">{API_BASE}</span>
                            </div>
                            <div>
                                <span className="apm-env-key">SENTINEL_API_KEY=</span>
                                <span className="apm-env-val">{created?.api_key}</span>
                            </div>
                        </div>

                        <div className="apm-actions">
                            <button onClick={copyEnvBlock} className="apm-btn-ghost">
                                {envCopied ? <Check size={14} /> : <Copy size={14} />}
                                {envCopied ? "Copied" : "Copy .env block"}
                            </button>
                            <button onClick={handleClose} className="apm-btn-primary">
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}