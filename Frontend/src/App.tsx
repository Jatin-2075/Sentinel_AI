import { Routes, Route, Outlet } from "react-router-dom";

import Sidebar from "./components/sidebar";

import Intro from "./pages/intro";
import Setup from "./pages/setup";

function AppLayout() {
    return (
        <div className="app">
            <Sidebar />

            <main className="content">
                <Outlet />
            </main>
        </div>
    );
}

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Intro />} />

            <Route element={<AppLayout />}>
                <Route path="/docs" element={<Setup/>}/>
            </Route>
        </Routes>
    );
}