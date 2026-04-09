import React from "react";
import { Navigate } from "react-router-dom";
import { getToken, getRole } from "./AuthService";

const PrivateRoute = ({ children, requiredRole }) => {
  const token = getToken();
  const role = getRole();

  // ❌ Not logged in
  if (!token) {
    return <Navigate to="/" />;
  }

  // ❌ Wrong role
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" />;
  }

  return children;
};

export default PrivateRoute;