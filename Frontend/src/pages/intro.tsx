import "../styles/intro.css"
import { NavLink } from "react-router-dom";

const steps = [
    {
        n: "01",
        title: "Watch",
        body: "Frontend, backend, and database each report their own health signals into one pipeline.",
    },
    {
        n: "02",
        title: "Diagnose",
        body: "An LLM classifies severity and explains the likely root cause, grounded in your own past incidents.",
    },
    {
        n: "03",
        title: "Resolve",
        body: "See exactly which layer failed and how it was fixed last time — before your users notice.",
    },
];

export default function Intro() {
    return (
        <div className="sn-page">

            <nav className="sn-nav">
                <div className="sn-logo sn-mono">
                    <span className="sn-logo-dot" />
                    SENTINEL
                </div>
                <div className="sn-nav-links">
                    <NavLink to="/docs">How it works</NavLink>
                    <NavLink to="/login">Log in</NavLink>
                </div>
            </nav>

            <section className="sn-hero">
                <div>
                    <div className="sn-eyebrow sn-mono">Full-stack incident copilot</div>
                    <h1 className="sn-h1">
                        Know what broke. <span className="sn-accent">Before</span> your users do.
                    </h1>
                    <p className="sn-sub">
                        Sentinel watches your frontend, backend, and database in real time,
                        pinpoints where a failure actually started, and explains why —
                        grounded in what fixed it last time.
                    </p>
                    <div className="sn-cta-row">
                        <button className="sn-btn sn-btn-primary">Start monitoring</button>
                        <button className="sn-btn sn-btn-ghost">See how it works</button>
                    </div>
                </div>

                <div className="sn-pulse-card" aria-hidden="false">
                    <div className="sn-pulse-card-head">
                        <span className="sn-pulse-label sn-mono">system.pulse</span>
                        <span className="sn-pulse-status">
                            <span className="sn-logo-dot" />
                            live
                        </span>
                    </div>
                    <svg className="sn-pulse-svg" viewBox="0 0 400 110" preserveAspectRatio="none">
                        <path
                            id="sn-wave-path"
                            className="sn-pulse-line"
                            d="M0,55 L60,55 L75,55 L85,20 L95,90 L105,55 L140,55
                 L200,55 L215,55 L222,10 L230,100 L238,40 L246,70 L254,55
                 L300,55 L400,55"
                        />
                        <path
                            className="sn-pulse-line sn-pulse-spike"
                            d="M200,55 L215,55 L222,10 L230,100 L238,40 L246,70 L254,55"
                        />
                        <circle r="4" className="sn-pulse-dot" style={{ offsetPath: "path('M0,55 L60,55 L75,55 L85,20 L95,90 L105,55 L140,55 L200,55 L215,55 L222,10 L230,100 L238,40 L246,70 L254,55 L300,55 L400,55')" }} />
                    </svg>
                    <div className="sn-legend">
                        <span><span className="sn-swatch" style={{ background: "#4FD1C5" }} />normal</span>
                        <span><span className="sn-swatch" style={{ background: "#F2765C" }} />incident detected</span>
                    </div>
                </div>
            </section>

            <section className="sn-steps-section" id="how">
                <div className="sn-steps-heading sn-mono">How Sentinel works</div>
                <div className="sn-steps-grid">
                    {steps.map((s) => (
                        <div className="sn-step" key={s.n}>
                            <div className="sn-step-n">{s.n}</div>
                            <h3 className="sn-step-title">{s.title}</h3>
                            <p className="sn-step-body">{s.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            <footer className="sn-footer">
                <span className="sn-mono">SENTINEL</span>
                <span>Root cause, explained.</span>
            </footer>
        </div>
    );
}