import { Navigate } from "react-router-dom";
import { isAuthenticated, getRole } from "./AuthService";

const PrivateRoute = ({ children, requiredRole }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/" />;
  }

  // If a specific role is required, check it
  if (requiredRole && getRole() !== requiredRole) {
    // Wrong role — redirect to their correct dashboard
    return <Navigate to={getRole() === "ADMIN" ? "/admin/dashboard" : "/dashboard"} />;
  }

  return children;
};

export default PrivateRoute;