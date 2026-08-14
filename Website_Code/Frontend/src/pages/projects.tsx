import Card from "../components/card";
import "../styles/pages/dashboard.css";

export default function Projects() {
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
                <Card />
            </main>
        </div>
    );
}
