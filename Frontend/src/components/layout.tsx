import { Outlet } from "react-router-dom";
import Topbar from "./topbar";

export default function Layout() {
    return (
        <div className="appMainLayoutContainer">
            <main className="page-content-wrapper">
                <Outlet />
            </main>

            <Topbar />
        </div>
    );
}