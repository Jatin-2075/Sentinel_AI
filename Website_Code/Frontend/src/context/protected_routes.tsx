import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Authcontext } from "./auth_context";

export default function ProtectedRoutes() {
    const authContext = useContext(Authcontext);
    if (!authContext) throw new Error("AuthContext.Provider is required");

    const accesstoken = localStorage.getItem("access");
    if (!accesstoken) {
        return <Navigate to="/auth" replace state={{ mode: "login" }} />;
    }

    return <Outlet />;
}