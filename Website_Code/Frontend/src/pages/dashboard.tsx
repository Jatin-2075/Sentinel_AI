import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/card";
import FeaturesSlideshow from "../components/features_slideshow";
import { projectsAPI } from "../config/api";
import type { Project } from "../config/types";
import { Authcontext } from "../context/auth_context";
import "../styles/pages/dashboard.css";

function Dashboard() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const authContext = useContext(Authcontext);

    useEffect(() => {
        const loadProjects = async () => {
            try {
                setLoading(true);
                const data = await projectsAPI.listMyProjects();
                setProjects(data);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load projects");
                console.error("Error loading projects:", err);
            } finally {
                setLoading(false);
            }
        };

        if (authContext?.isAuthenticated) {
            loadProjects();
        }
    }, [authContext?.isAuthenticated]);

    const handleCreateProject = () => {
        navigate("/projects");
    };

    return (
        <div className="dash">
            <header className="dash-header">
                <div className="dash-brand">
                    <span className="dash-pulse" aria-hidden="true" />
                    <span className="dash-brand-name">Sentinel</span>
                </div>
                <div className="dash-header-text">
                    <p className="dash-eyebrow">Projects</p>
                    <h1>Your monitored services</h1>
                </div>
            </header>

            <main className="dash-body">
                {loading ? (
                    <div style={{ padding: "2rem", textAlign: "center" }}>
                        <p>Loading projects...</p>
                    </div>
                ) : error ? (
                    <div style={{ padding: "2rem", color: "red" }}>
                        <p>Error: {error}</p>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="dash-empty-state">
                        <div className="dash-empty-header">
                            <h2>Get Started with Sentinel</h2>
                            <p>Monitor your applications in real-time</p>
                        </div>
                        
                        <FeaturesSlideshow />
                        
                        <div className="dash-empty-cta">
                            <button onClick={handleCreateProject} className="dash-cta-btn">
                                Create Your First Project
                            </button>
                            <p className="dash-cta-text">
                                Start monitoring your services to detect anomalies instantly and resolve incidents faster
                            </p>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem", marginBottom: "3rem" }}>
                            {projects.map((project) => (
                                <Card key={project.id} project={project} />
                            ))}
                        </div>
                        
                        <div className="dash-section-divider">
                            <h3>Features & Tips</h3>
                        </div>
                        
                        <FeaturesSlideshow />
                    </div>
                )}
            </main>
        </div>
    );
}

export default Dashboard;