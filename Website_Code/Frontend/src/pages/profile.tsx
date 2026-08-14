import { useEffect, useState, type FormEvent } from "react";
import { API } from "../config/connecting_api";
import type {
    PersonalData,
    PersonalDataCreatePayload,
    PersonalDataUpdatePayload,
} from "../config/types";
import "../styles/pages/profile.css";

type Mode = "loading" | "create" | "view" | "edit";

const emptyForm: PersonalDataCreatePayload = {
    name: "",
    dob: "",
    phone: "",
    email: "",
    occupation: "",
};

function Profile() {
    const [mode, setMode] = useState<Mode>("loading");
    const [profile, setProfile] = useState<PersonalData | null>(null);
    const [form, setForm] = useState<PersonalDataCreatePayload>(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    useEffect(() => {
        async function fetchProfile() {
            try {
                const data = await API<PersonalData>("GET", "/auth/getprofile");
                setProfile(data);
                setMode("view");
            } catch (err) {
                const msg = err instanceof Error ? err.message : "";
                if (msg.toLowerCase().includes("not found")) {
                    setMode("create");
                } else {
                    setError(msg || "Failed to load profile");
                    setMode("create");
                }
            }
        }

        fetchProfile();
    }, []);

    function updateField<K extends keyof PersonalDataCreatePayload>(
        key: K,
        value: PersonalDataCreatePayload[K]
    ) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    function startEdit() {
        if (!profile) return;
        setForm({
            name: profile.name,
            dob: profile.dob,
            phone: profile.phone,
            email: profile.email,
            occupation: profile.occupation ?? "",
        });
        setError(null);
        setMode("edit");
    }

    async function handleCreate(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const payload: PersonalDataCreatePayload = {
                ...form,
                occupation: form.occupation ? form.occupation.trim() : undefined,
            };
            const created = await API<PersonalData>("POST", "/auth/createprofile", payload);
            setProfile(created);
            setMode("view");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create profile");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleUpdate(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const payload: PersonalDataUpdatePayload = {
                ...form,
                occupation: form.occupation ? form.occupation.trim() : undefined,
            };
            const updated = await API<PersonalData>("PUT", "/auth/updateprofile", payload);
            setProfile(updated);
            setMode("view");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update profile");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete() {
        setSubmitting(true);
        setError(null);
        try {
            await API<{ message: string }>("DELETE", "/auth/deleteprofile");
            setProfile(null);
            setForm(emptyForm);
            setConfirmingDelete(false);
            setMode("create");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete profile");
            setSubmitting(false);
        }
    }

    if (mode === "loading") {
        return (
            <div className="pf">
                <div className="pf-card pf-state-loading">Loading profile…</div>
            </div>
        );
    }

    if (mode === "create" || mode === "edit") {
        const isEdit = mode === "edit";
        return (
            <div className="pf">
                <form className="pf-card" onSubmit={isEdit ? handleUpdate : handleCreate}>
                    <p className="pf-eyebrow">{isEdit ? "Edit profile" : "Set up profile"}</p>
                    <h1>{isEdit ? "Update your details" : "Tell us about you"}</h1>

                    <label className="pf-field">
                        <span>Full name</span>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => updateField("name", e.target.value)}
                            placeholder="Ava Chen"
                            required
                        />
                    </label>

                    <label className="pf-field">
                        <span>Date of birth</span>
                        <input
                            type="date"
                            value={form.dob}
                            onChange={(e) => updateField("dob", e.target.value)}
                            required
                        />
                    </label>

                    <label className="pf-field">
                        <span>Phone</span>
                        <input
                            type="tel"
                            value={form.phone}
                            onChange={(e) => updateField("phone", e.target.value)}
                            placeholder="+1 555 010 2020"
                            required
                        />
                    </label>

                    <label className="pf-field">
                        <span>Email</span>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => updateField("email", e.target.value)}
                            placeholder="ava@sentinel.dev"
                            required
                        />
                    </label>

                    <label className="pf-field">
                        <span>Occupation</span>
                        <input
                            type="text"
                            value={form.occupation ?? ""}
                            onChange={(e) => updateField("occupation", e.target.value)}
                            placeholder="Site Reliability Engineer"
                        />
                    </label>

                    {error && <p className="pf-error">{error}</p>}

                    <div className="pf-form-actions">
                        {isEdit && (
                            <button
                                type="button"
                                className="pf-btn pf-btn-ghost"
                                onClick={() => {
                                    setError(null);
                                    setMode("view");
                                }}
                            >
                                Cancel
                            </button>
                        )}
                        <button type="submit" className="pf-btn pf-btn-accent" disabled={submitting}>
                            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create profile"}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="pf">
            <div className="pf-card">
                <div className="pf-view-head">
                    <div>
                        <p className="pf-eyebrow">Profile</p>
                        <h1>{profile.name}</h1>
                    </div>
                    <div className="pf-actions">
                        <button className="pf-icon-btn" onClick={startEdit} aria-label="Edit profile">
                            Edit
                        </button>
                        <button
                            className="pf-icon-btn pf-icon-btn-danger"
                            onClick={() => setConfirmingDelete(true)}
                            aria-label="Delete profile"
                        >
                            Delete
                        </button>
                    </div>
                </div>

                <dl className="pf-details">
                    <div className="pf-detail-row">
                        <dt>Date of birth</dt>
                        <dd>{profile.dob}</dd>
                    </div>
                    <div className="pf-detail-row">
                        <dt>Phone</dt>
                        <dd>{profile.phone}</dd>
                    </div>
                    <div className="pf-detail-row">
                        <dt>Email</dt>
                        <dd>{profile.email}</dd>
                    </div>
                    <div className="pf-detail-row">
                        <dt>Occupation</dt>
                        <dd>{profile.occupation ?? "—"}</dd>
                    </div>
                </dl>

                {error && <p className="pf-error">{error}</p>}
            </div>

            {confirmingDelete && (
                <div className="pf-modal-backdrop" onClick={() => setConfirmingDelete(false)}>
                    <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Delete profile?</h2>
                        <p>This can&apos;t be undone. Your profile details will be permanently removed.</p>
                        <div className="pf-form-actions">
                            <button
                                className="pf-btn pf-btn-ghost"
                                onClick={() => setConfirmingDelete(false)}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                className="pf-btn pf-btn-danger"
                                onClick={handleDelete}
                                disabled={submitting}
                            >
                                {submitting ? "Deleting…" : "Delete profile"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Profile;