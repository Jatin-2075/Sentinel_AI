import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Zap, Brain, Layers, Key, Radio, TrendingUp } from "lucide-react";
import "../styles/features_slideshow.css";

interface Feature {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    details: string[];
}

const FEATURES: Feature[] = [
    {
        id: "realtime",
        title: "Real-Time Incident Detection",
        description: "Monitor your entire stack in real-time across frontend, backend, and database layers",
        icon: <Radio className="fs-icon" />,
        color: "#38BDF8",
        details: [
            "Instant anomaly detection across all layers",
            "WebSocket-powered live incident feed",
            "Sub-second latency incident notifications",
            "Multi-source correlation"
        ]
    },
    {
        id: "ai",
        title: "AI-Powered Root Cause Analysis",
        description: "Get intelligent insights on why incidents occur with LLM-driven analysis",
        icon: <Brain className="fs-icon" />,
        color: "#A78BFA",
        details: [
            "Gemini/Claude API integration for analysis",
            "Pattern recognition from historical incidents",
            "Automated root cause suggestions",
            "Contextual error analysis"
        ]
    },
    {
        id: "layers",
        title: "Multi-Layer Architecture Monitoring",
        description: "Monitor frontend, backend, database, and infrastructure health simultaneously",
        icon: <Layers className="fs-icon" />,
        color: "#34D399",
        details: [
            "Independent health scoring per layer",
            "Cross-layer correlation analysis",
            "Architecture pulse visualization",
            "Health status timeline"
        ]
    },
    {
        id: "api",
        title: "Secure API Key Management",
        description: "Generate and manage API keys for seamless event ingestion and instrumentation",
        icon: <Key className="fs-icon" />,
        color: "#F59E0B",
        details: [
            "One-click API key generation",
            "Automatic key rotation support",
            "Rate limiting and quotas",
            "Event ingestion endpoints"
        ]
    },
    {
        id: "performance",
        title: "Performance Analytics",
        description: "Track response times, error rates, and throughput across your application",
        icon: <TrendingUp className="fs-icon" />,
        color: "#10B981",
        details: [
            "Latency percentile tracking (p50, p95, p99)",
            "Error rate aggregation",
            "Throughput analysis",
            "Performance trend detection"
        ]
    },
    {
        id: "automation",
        title: "Automated Incident Resolution",
        description: "Resolve incidents faster with AI suggestions and runbook automation",
        icon: <Zap className="fs-icon" />,
        color: "#EC4899",
        details: [
            "AI-generated resolution suggestions",
            "Custom runbook templates",
            "Incident history search",
            "Resolution tracking and metrics"
        ]
    }
];

export default function FeaturesSlideshow() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAutoPlay, setIsAutoPlay] = useState(true);

    useEffect(() => {
        if (!isAutoPlay) return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % FEATURES.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [isAutoPlay]);

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + FEATURES.length) % FEATURES.length);
        setIsAutoPlay(false);
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % FEATURES.length);
        setIsAutoPlay(false);
    };

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
        setIsAutoPlay(false);
    };

    const feature = FEATURES[currentIndex];

    return (
        <div className="fs-container">
            <div className="fs-wrapper">
                {/* Main Feature Display */}
                <div className="fs-main">
                    <div className="fs-icon-wrapper" style={{ borderColor: feature.color }}>
                        <div style={{ color: feature.color }}>
                            {feature.icon}
                        </div>
                    </div>
                    
                    <div className="fs-content">
                        <h2 className="fs-title">{feature.title}</h2>
                        <p className="fs-description">{feature.description}</p>
                        
                        <div className="fs-details">
                            {feature.details.map((detail, idx) => (
                                <div key={idx} className="fs-detail-item">
                                    <div className="fs-detail-bullet" style={{ backgroundColor: feature.color }} />
                                    <span>{detail}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <div className="fs-controls">
                    <button 
                        className="fs-nav-btn fs-nav-prev"
                        onClick={handlePrev}
                        aria-label="Previous feature"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    
                    <div className="fs-dots">
                        {FEATURES.map((_, idx) => (
                            <button
                                key={idx}
                                className={`fs-dot ${idx === currentIndex ? "fs-dot-active" : ""}`}
                                onClick={() => goToSlide(idx)}
                                aria-label={`Go to feature ${idx + 1}`}
                                style={{
                                    backgroundColor: idx === currentIndex ? FEATURES[idx].color : undefined
                                }}
                            />
                        ))}
                    </div>

                    <button 
                        className="fs-nav-btn fs-nav-next"
                        onClick={handleNext}
                        aria-label="Next feature"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Slide Counter */}
                <div className="fs-counter">
                    <span className="fs-counter-current">{String(currentIndex + 1).padStart(2, '0')}</span>
                    <span className="fs-counter-sep">/</span>
                    <span className="fs-counter-total">{String(FEATURES.length).padStart(2, '0')}</span>
                </div>

                {/* Auto-play Toggle */}
                <button
                    className={`fs-autoplay-btn ${isAutoPlay ? "fs-autoplay-on" : "fs-autoplay-off"}`}
                    onClick={() => setIsAutoPlay(!isAutoPlay)}
                    aria-label={isAutoPlay ? "Stop auto-play" : "Start auto-play"}
                >
                    <div className="fs-autoplay-dot" />
                    {isAutoPlay ? "Auto" : "Paused"}
                </button>
            </div>
        </div>
    );
}
