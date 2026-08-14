import { Routes, Route } from "react-router-dom";

import ProtectedRoutes from "./context/protected_routes";
import { AuthProvider } from "./context/auth_context";

import Layout from "./components/layout";

import Setup from "./pages/setup";
import Auth from "./pages/auth";
import Intro from "./pages/intro";
import Dashboard from "./pages/dashboard";
import Profile from "./pages/profile";
import Projects from "./pages/projects";
import ProjectDashboard from "./pages/project";

export default function App() {
    return (
        <AuthProvider>
            <Routes>
                <Route path="/" element={<Intro />} />
                <Route path="/auth" element={<Auth />} />

                <Route element={<ProtectedRoutes />}>
                    <Route element={<Layout />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/docs" element={<Setup />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/projects" element={<Projects />} />
                        <Route path="/projects/:projectId" element={<ProjectDashboard />} />
                        <Route path="/createprofile" element={<Profile />} />
                    </Route>
                </Route>
            </Routes>
        </AuthProvider>
    );
}