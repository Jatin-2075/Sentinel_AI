import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    FolderKanban,
    BookOpen,
    LogOut,
    Plus,
} from "lucide-react";
import AddProjectModal from "./add_project_modal";
import "../styles/topbar.css";

const routes = [
    { path: "/dashboard", name: "Dashboard", icon: LayoutDashboard },
    { path: "/projects", name: "Projects", icon: FolderKanban },
    { path: "/docs", name: "Docs", icon: BookOpen },
];

const currentUser = { name: "User", email: "Nome" };

export default function Topbar() {
    const navigate = useNavigate();
    const [addOpen, setAddOpen] = useState(false);

    function logout() {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/");
    }

    return (
        <>
            <div className="island-dock">
                <nav className="island">
                    <Link to="/" className="island-brand sn-mono" data-tooltip="Home">
                        <span className="island-dot" />
                        <span className="island-brand-text">SENTINEL</span>
                    </Link>

                    <span className="island-divider" />

                    {routes.map((route) => {
                        const Icon = route.icon;
                        return (
                            <NavLink
                                key={route.path}
                                to={route.path}
                                data-tooltip={route.name}
                                className={({ isActive }) =>
                                    `island-item ${isActive ? "active" : ""}`
                                }
                            >
                                <Icon className="island-icon" size={26} strokeWidth={2} />
                            </NavLink>
                        );
                    })}

                    <button
                        className="island-item"
                        data-tooltip="Add project"
                        onClick={() => setAddOpen(true)}
                    >
                        <Plus className="island-icon" size={26} strokeWidth={2} />
                    </button>

                    <span className="island-divider" />

                    <NavLink
                        to="/profile"
                        data-tooltip={currentUser.name}
                        className={({ isActive }) =>
                            `island-item island-avatar-btn ${isActive ? "active" : ""}`
                        }
                    >
                        <span className="island-avatar">
                            {currentUser.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                        </span>
                    </NavLink>

                    <button
                        className="island-item island-logout"
                        data-tooltip="Log out"
                        onClick={logout}
                    >
                        <LogOut className="island-icon" size={26} strokeWidth={2} />
                    </button>
                </nav>
            </div>

            {/* Rendered outside island-dock on purpose: island-dock has
                pointer-events: none, which would otherwise disable every
                button in this modal. */}
            <AddProjectModal
                isOpen={addOpen}
                onClose={() => setAddOpen(false)}
                onCreated={() => navigate("/projects")}
            />
        </>
    );
}