import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    AlertTriangle,
    FolderKanban,
    BookOpen,
    User,
    LogOut,
    PanelLeftClose,
    PanelLeftOpen,
} from "lucide-react";
import "../styles/sidebar.css";

const routes = [
    { path: "/dashboard", name: "Dashboard", icon: LayoutDashboard },
    { path: "/incidents", name: "Incidents", icon: AlertTriangle },
    { path: "/projects", name: "Projects", icon: FolderKanban },
    { path: "/docs", name: "Docs", icon: BookOpen },
];

const currentUser = { name: "Ava Chen", email: "ava@sentinel.dev" };

export default function Sidebar() {
    const [open, setOpen] = useState(true);

    return (
        <aside className={`sidebar ${open ? "open" : "collapsed"}`}>
            <div className="sidebar-head">
                <div className="sidebar-brand sn-mono">
                    <span className="sidebar-logo-dot" />
                    {open && <span>SENTINEL</span>}
                </div>
                <button
                    className="sidebar-toggle"
                    onClick={() => setOpen((prev) => !prev)}
                    aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
                    title={open ? "Collapse sidebar" : "Expand sidebar"}
                >
                    {open ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                </button>
            </div>

            <nav className="sidebar-nav">
                {routes.map((route) => {
                    const Icon = route.icon;
                    return (
                        <NavLink
                            key={route.path}
                            to={route.path}
                            title={!open ? route.name : undefined}
                            className={({ isActive }) =>
                                `sidebar-item ${isActive ? "active" : ""}`
                            }
                        >
                            <Icon className="sidebar-icon" size={19} strokeWidth={2} />
                            {open && <span className="sidebar-label">{route.name}</span>}
                        </NavLink>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                <NavLink
                    to="/profile"
                    title={!open ? currentUser.name : undefined}
                    className={({ isActive }) =>
                        `sidebar-item sidebar-profile ${isActive ? "active" : ""}`
                    }
                >
                    <span className="sidebar-avatar">
                        {currentUser.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                    </span>
                    {open && (
                        <span className="sidebar-profile-text">
                            <span className="sidebar-profile-name">{currentUser.name}</span>
                            <span className="sidebar-profile-email">{currentUser.email}</span>
                        </span>
                    )}
                </NavLink>

                <button className="sidebar-item sidebar-logout" title={!open ? "Log out" : undefined}>
                    <LogOut className="sidebar-icon" size={19} strokeWidth={2} />
                    {open && <span className="sidebar-label">Log out</span>}
                </button>
            </div>
        </aside>
    );
}