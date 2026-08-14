import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { projectsAPI } from "../config/api";
import type { Project } from "../config/types";
import "../styles/pages/dashboard.css"

function Card() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        async function fetchProjects() {
            try {
                const data = await projectsAPI.listMyProjects();
                setProjects(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load projects");
            } finally {
                setLoading(false);
            }
        }

        fetchProjects();
    }, []);

    if (loading) {
        return <div className="project-state project-state-loading">Loading projects…</div>;
    }
    if (error) {
        return (
            <div className="project-state project-state-error">
                Couldn&apos;t load projects — {error}
            </div>
        );
    }
    if (projects.length === 0) {
        return (
            <div className="project-state project-state-empty">
                <p>No projects yet.</p>
                <span>Connect a service to start seeing it here.</span>
            </div>
        );
    }

    return (
        <div className="project-list">
            {projects.map((project) => (
                <div
                    key={project.id}
                    className="project-row"
                    onClick={() => navigate(`/projects/${project.id}`)}
                >
                    <span className="project-status-dot" aria-hidden="true" />
                    <div className="project-info">
                        <h3>{project.name}</h3>
                        <span className="created-at">
                            Added {new Date(project.created_at).toLocaleDateString()}
                        </span>
                    </div>
                    <button
                        className="project-arrow"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projects/${project.id}`);
                        }}
                        aria-label={`Open ${project.name}`}
                    >
                        &rarr;
                    </button>
                </div>
            ))}
        </div>
    );
}

export default Card;