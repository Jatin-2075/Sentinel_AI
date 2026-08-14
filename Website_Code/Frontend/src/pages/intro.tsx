import React, {
    useEffect,
    useRef,
    useState,
    useCallback,
    type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import "../styles/pages/intro.css"


function useInView<T extends HTMLElement>(threshold = 0.2) {
    const ref = useRef<T | null>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    observer.unobserve(el);
                }
            },
            { threshold }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold]);

    return { ref, inView };
}

function useParallax(factor: number = 0.5) {
    const ref = useRef<HTMLDivElement | null>(null);
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const onScroll = () => {
            const rect = el.getBoundingClientRect();
            const elementTop = rect.top;
            const elementHeight = rect.height;
            const windowHeight = window.innerHeight;
            const distanceFromCenter = (windowHeight / 2) - (elementTop + elementHeight / 2);
            setOffset(distanceFromCenter * factor);
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [factor]);

    return { ref, offset };
}

function Reveal({
    children,
    delay = 0,
    className = "",
    as = "div",
    ...rest
}: {
    children: ReactNode;
    delay?: number;
    className?: string;
    as?: React.ElementType;
} & Record<string, unknown>) {
    const { ref, inView } = useInView<HTMLDivElement>();
    const Tag = as as React.ElementType;
    return (
        <Tag
            ref={ref}
            className={`reveal ${inView ? "is-visible" : ""} ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
            {...rest}
        >
            {children}
        </Tag>
    );
}


type CursorMode = "default" | "link" | "card";

function AmbientCursor() {
    const dotRef = useRef<HTMLDivElement | null>(null);
    const [mode, setMode] = useState<CursorMode>("default");

    useEffect(() => {
        const dot = dotRef.current;
        if (!dot) return;

        const onMove = (e: MouseEvent) => {
            dot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
            const target = e.target as HTMLElement;
            const zone = target.closest<HTMLElement>("[data-cursor]");
            setMode((zone?.dataset.cursor as CursorMode) || "default");
        };

        window.addEventListener("mousemove", onMove);
        return () => window.removeEventListener("mousemove", onMove);
    }, []);

    return <div ref={dotRef} className={`ambient-cursor cursor-${mode}`} aria-hidden="true" />;
}


function AnimatedBackground() {
    return (
        <div className="intro-bg" aria-hidden="true">
            {/* Animated orbs */}
            <span className="bg-orb bg-orb-blue" />
            <span className="bg-orb bg-orb-green" />
            <span className="bg-orb bg-orb-violet" />
            
            {/* Animated grid */}
            <span className="bg-grid" />
            
            {/* Floating particles */}
            <div className="particles-container">
                {[...Array(15)].map((_, i) => (
                    <span
                        key={`particle-${i}`}
                        className="particle"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${i * 0.3}s`,
                            animationDuration: `${8 + Math.random() * 4}s`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}


const FEATURES = [
    {
        tag: "01 · cross-layer",
        title: "Three layers, one verdict",
        body: "Frontend, backend, and database each report what they saw for the same request. When their stories disagree, that disagreement is the root cause — not a guess.",
    },
    {
        tag: "02 · pipeline",
        title: "Event to explanation in seconds",
        body: "event → queue → worker → RAG lookup → LLM → WebSocket → dashboard. Every step is logged, so the demo is never a black box.",
    },
    {
        tag: "03 · grounded",
        title: "Explanations, not guesses",
        body: "Before the model writes a summary, it retrieves similar incidents from this project's own history — so the fix it suggests has already worked once.",
    },
    {
        tag: "04 · multi-tenant",
        title: "One API key, one project",
        body: "project_id is always resolved server-side from an authenticated key or session — never from a client-supplied field. That's the whole security boundary.",
    },
    {
        tag: "05 · realtime",
        title: "Live, not batched",
        body: "The moment an incident is classified, it's pushed straight to your project's dashboard channel over a WebSocket — no refresh, no polling.",
    },
    {
        tag: "06 · onboarding",
        title: "Live in under a minute",
        body: "Create a project, copy the API key, drop it into an env var. That's the entire setup — for frontend, backend, and DB alike.",
    },
] as const;

const PIPELINE = ["frontend", "backend", "database", "worker", "llm", "dashboard"] as const;

const MARKET_STATS = [
    { value: "3", label: "layers watched as one system — frontend, backend, DB" },
    { value: "6", label: "hops from a broken request to a plain-language cause" },
    { value: "1", label: "API key to wire an entire project in" },
    { value: "0", label: "log files you have to open by hand to find the cause" },
] as const;

const HOW_IT_WORKS = [
    {
        step: "01",
        title: "Connect",
        body: "Drop a frontend interceptor, a backend middleware, and a DB poller into your app. Point each at your API key — no rewrite required.",
    },
    {
        step: "02",
        title: "Detect",
        body: "Every event is checked against thresholds and against what the other layers reported for the same request. Disagreement is the signal.",
    },
    {
        step: "03",
        title: "Explain",
        body: "The worker retrieves similar past incidents, then an LLM writes the severity, root cause, and fix — live on your dashboard.",
    },
] as const;

const WHY_US = [
    {
        theirs: "Metrics per service, viewed one dashboard at a time",
        ours: "One verdict, built from all three layers at once",
    },
    {
        theirs: "You read the stack trace and guess the cause",
        ours: "The explanation is written for you, in plain language",
    },
    {
        theirs: "Past incidents live in someone's memory or a wiki page",
        ours: "Past incidents are retrieved automatically and cited in the fix",
    },
    {
        theirs: "A new service means new dashboards to build",
        ours: "A new project means one API key",
    },
] as const;


function Nav({
    onLogin,
    onSignup,
}: {
    onLogin: () => void;
    onSignup: () => void;
}) {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header className={`intro-nav ${scrolled ? "intro-nav-scrolled" : ""}`}>
            <div className="intro-nav-inner">
                <a href="#top" className="intro-brand" data-cursor="link">
                    <span className="intro-brand-glyph mono">{"{ }"}</span>
                    Sentinel
                </a>

                <nav className="intro-nav-links">
                    <a href="#market" data-cursor="link">
                        Why it matters
                    </a>
                    <a href="#how-it-works" data-cursor="link">
                        How it works
                    </a>
                    <a href="#features" data-cursor="link">
                        Features
                    </a>
                    <a href="#why-us" data-cursor="link">
                        Why us
                    </a>
                </nav>

                <div className="intro-nav-actions">
                    <button className="btn btn-ghost" onClick={onLogin} data-cursor="link">
                        Log in
                    </button>
                    <button className="btn btn-primary" onClick={onSignup} data-cursor="link">
                        Sign up →
                    </button>
                </div>
            </div>
        </header>
    );
}


function Hero({ onSignup }: { onSignup: () => void }) {
    const { ref: copyRef, offset: copyOffset } = useParallax(0.3);
    const { ref: consoleRef, offset: consoleOffset } = useParallax(-0.2);
    
    return (
        <section id="top" className="hero">
            <div ref={copyRef} style={{ transform: `translateY(${copyOffset * 0.5}px)` }}>
                <Reveal className="hero-copy">
                    <span className="eyebrow mono">incident intelligence · full-stack</span>
                    <h1>
                        Your stack fails in three places at once.
                        <br />
                        <span className="hero-accent">Sentinel</span> tells you which one started it.
                    </h1>
                    <p className="hero-sub">
                        Frontend, backend, and database each watch themselves. Sentinel compares
                        notes, grounds the explanation in your own incident history, and shows the
                        real root cause — not three separate dashboards.
                    </p>
                    <div className="hero-actions">
                        <button className="btn btn-primary btn-lg" onClick={onSignup} data-cursor="link">
                            Get started →
                        </button>
                        <a href="#pipeline" className="btn btn-ghost btn-lg" data-cursor="link">
                            See the pipeline
                        </a>
                    </div>
                </Reveal>
            </div>

            <div ref={consoleRef} style={{ transform: `translateY(${consoleOffset * 0.5}px) perspective(1000px) rotateX(${consoleOffset * 0.02}deg)` }}>
                <Reveal delay={120} className="hero-console" data-cursor="card">
                    <div className="console-bar">
                        <span className="console-dot dot-crit" />
                        <span className="console-dot dot-warn" />
                        <span className="console-dot dot-ok" />
                        <span className="mono console-title">sentinel · live</span>
                    </div>
                    <pre className="console-body mono">
                        {`> POST /events
  { source: "database", pool_usage_pct: 100 }

> worker: threshold crossed
> rag: 1 similar incident found
> llm: root cause identified

$ severity: critical
$ cause: connection pool exhausted
$ fix: seen 3 weeks ago — statement_timeout`}
                    </pre>
                </Reveal>
            </div>
        </section>
    );
}


function FeatureStack() {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [visibleIndex, setVisibleIndex] = useState(-1);

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const index = Array.from(containerRef.current?.querySelectorAll(".feature-stack-item") || []).indexOf(entry.target);
                        setVisibleIndex(Math.max(visibleIndex, index));
                    }
                });
            },
            { threshold: 0.3 }
        );

        containerRef.current.querySelectorAll(".feature-stack-item").forEach((el) => {
            observer.observe(el);
        });

        return () => observer.disconnect();
    }, [visibleIndex]);

    return (
        <section id="features" className="feature-section">
            <Reveal className="section-head">
                <span className="eyebrow mono">why it works</span>
                <h2>Built to explain itself</h2>
            </Reveal>

            <div className="feature-stack" ref={containerRef}>
                {FEATURES.map((f, i) => (
                    <div
                        key={f.title}
                        className={`feature-stack-item ${i <= visibleIndex ? "is-visible" : ""}`}
                        style={{ top: `${96 + i * 22}px` }}
                    >
                        <article className="feature-card" data-cursor="card">
                            <div className="feature-card-bg" />
                            <span className="feature-tag mono">{f.tag}</span>
                            <h3>{f.title}</h3>
                            <p>{f.body}</p>
                            <div className="feature-corner feature-corner-tl" />
                            <div className="feature-corner feature-corner-br" />
                        </article>
                    </div>
                ))}
            </div>
        </section>
    );
}


function Pipeline() {
    const { ref, inView } = useInView<HTMLDivElement>(0.4);
    return (
        <section id="pipeline" className="pipeline-section" ref={ref}>
            <Reveal className="section-head">
                <span className="eyebrow mono">data flow</span>
                <h2>One failure, six hops, one answer</h2>
            </Reveal>

            <div className={`pipeline-track ${inView ? "is-visible" : ""}`}>
                {PIPELINE.map((step, i) => (
                    <React.Fragment key={step}>
                        <div className="pipeline-node" style={{ transitionDelay: `${i * 90}ms` }}>
                            <span className="pipeline-dot" />
                            <span className="mono pipeline-label">{step}</span>
                        </div>
                        {i < PIPELINE.length - 1 && (
                            <span
                                className="pipeline-line"
                                style={{ transitionDelay: `${i * 90 + 45}ms` }}
                            />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </section>
    );
}


function Market() {
    return (
        <section id="market" className="market-section">
            <Reveal className="section-head">
                <span className="eyebrow mono">the problem</span>
                <h2>Most of an incident is spent finding it, not fixing it</h2>
                <p className="market-lede">
                    When a full-stack app breaks, the frontend, backend, and database each
                    surface a different symptom. Engineers lose the most time stitching
                    those symptoms together by hand — before they've even started on a fix.
                </p>
            </Reveal>

            <div className="market-stats">
                {MARKET_STATS.map((s, i) => (
                    <Reveal key={s.label} delay={i * 80} className="market-stat">
                        <span className="market-stat-value mono">{s.value}</span>
                        <span className="market-stat-label">{s.label}</span>
                    </Reveal>
                ))}
            </div>
        </section>
    );
}

function HowItWorks() {
    return (
        <section id="how-it-works" className="how-section">
            <Reveal className="section-head">
                <span className="eyebrow mono">how it works</span>
                <h2>Three steps, no new habits</h2>
            </Reveal>

            <div className="how-grid">
                {HOW_IT_WORKS.map((s, i) => (
                    <Reveal key={s.step} delay={i * 100} className="how-card" data-cursor="card">
                        <span className="how-step mono">{s.step}</span>
                        <h3>{s.title}</h3>
                        <p>{s.body}</p>
                    </Reveal>
                ))}
            </div>
        </section>
    );
}

function WhyUs() {
    return (
        <section id="why-us" className="why-section">
            <Reveal className="section-head">
                <span className="eyebrow mono">why sentinel</span>
                <h2>Not another dashboard to babysit</h2>
            </Reveal>

            <div className="why-table">
                <div className="why-row why-row-head mono">
                    <span className="why-col">traditional monitoring</span>
                    <span className="why-col why-col-accent">sentinel</span>
                </div>
                {WHY_US.map((row, i) => (
                    <Reveal key={row.ours} delay={i * 70} className="why-row">
                        <span className="why-cell why-cell-dim">
                            <span className="why-mark why-mark-no">✕</span>
                            {row.theirs}
                        </span>
                        <span className="why-cell why-cell-accent">
                            <span className="why-mark why-mark-yes">✓</span>
                            {row.ours}
                        </span>
                    </Reveal>
                ))}
            </div>
        </section>
    );
}

function CTA({ onSignup }: { onSignup: () => void }) {
    return (
        <section className="cta-section">
            <Reveal>
                <h2>Break it on purpose. Watch it explain itself.</h2>
                <p>One button, one root cause, one similar incident pulled from history.</p>
                <button className="btn btn-primary btn-lg" onClick={onSignup} data-cursor="link">
                    Create your project →
                </button>
            </Reveal>
        </section>
    );
}

function Footer() {
    return (
        <footer className="intro-footer">
            <div className="intro-footer-inner">
                <span className="mono">sentinel — incident copilot for full-stack apps</span>
                <span className="mono intro-footer-faint">built for the hackathon demo</span>
            </div>
        </footer>
    );
}


export interface IntroProps {
    onLogin?: () => void;
    onSignup?: () => void;
}

export default function Intro({ onLogin, onSignup }: IntroProps) {
    const navigate = useNavigate();

    const handleLogin = useCallback(() => {
        if (onLogin) return onLogin();
        navigate("/auth", { state: { mode: "login" } });
    }, [onLogin, navigate]);

    const handleSignup = useCallback(() => {
        if (onSignup) return onSignup();
        navigate("/auth", { state: { mode: "signup" } });
    }, [onSignup, navigate]);

    return (
        <div className="sentinel-intro">
            <AnimatedBackground />
            <AmbientCursor />
            <Nav onLogin={handleLogin} onSignup={handleSignup} />
            <Hero onSignup={handleSignup} />
            <Market />
            <HowItWorks />
            <FeatureStack />
            <WhyUs />
            <Pipeline />
            <CTA onSignup={handleSignup} />
            <Footer />
        </div>
    );
}