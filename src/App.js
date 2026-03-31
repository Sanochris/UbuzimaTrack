import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./auth/Login";
import PrivateRoute from "./auth/PrivateRoute";
import DashboardFancy from "./Components/DashboardFancy";
import AdminDashboard from "./Components/AdminDashboard";
import ResetPassword from "./auth/ResetPassword";
import { useLanguage } from "./i18n/LanguageContext";

const NotFound = () => {
  const { lang } = useLanguage();

  const msg = {
    en: "404 - Page Not Found",
    fr: "404 - Page Introuvable",
    rw: "404 - Paji Ntiboneka",
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px", color: "white" }}>
      <h2>{msg[lang] || msg.en}</h2>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Navigate to="/" />} />

        {/* RESET PASSWORD — any logged-in user */}
        <Route
          path="/reset-password"
          element={
            <PrivateRoute>
              <ResetPassword />
            </PrivateRoute>
          }
        />

        {/* USER PROTECTED ROUTE */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute requiredRole="USER">
              <DashboardFancy />
            </PrivateRoute>
          }
        />

        {/* ADMIN PROTECTED ROUTE */}
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute requiredRole="ADMIN">
              <AdminDashboard />
            </PrivateRoute>
          }
        />

        {/* FALLBACK */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;