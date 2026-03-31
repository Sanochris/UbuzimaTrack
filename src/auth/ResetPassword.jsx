import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageSwitcher from "../i18n/LanguageSwitcher";

function ResetPassword() {
  const { t } = useLanguage();
  const [newPassword, setNewPassword]   = useState("");
  const [confirm, setConfirm]           = useState("");
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [darkMode, setDarkMode]         = useState(true);
  const navigate = useNavigate();

  const username = localStorage.getItem("username");
  const token    = localStorage.getItem("token");

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    if (!username) { setError(t("sessionExpired")); return; }
    if (newPassword.length < 6) { setError(t("passwordMin")); return; }
    if (newPassword !== confirm) { setError(t("passwordMatch")); return; }

    setLoading(true);
    try {
      await axios.post(
        "http://localhost:8080/api/auth/reset-password",
        { username, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      localStorage.setItem("mustResetPassword", "false");
      const role = localStorage.getItem("role");
      navigate(role === "ADMIN" ? "/admin/dashboard" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  const T = darkMode ? {
    bg: "#020617", card: "rgba(15,23,42,0.8)",
    border: "rgba(255,255,255,0.08)", text: "#f1f5f9",
    sub: "#94a3b8", input: "rgba(15,23,42,0.8)",
    inputBorder: "rgba(148,163,184,0.15)", inputColor: "#e2e8f0",
  } : {
    bg: "#eef2ff", card: "rgba(255,255,255,0.95)",
    border: "rgba(0,0,0,0.08)", text: "#0f172a",
    sub: "#64748b", input: "rgba(241,245,249,1)",
    inputBorder: "rgba(0,0,0,0.12)", inputColor: "#0f172a",
  };

  return (
    <div style={{
      minHeight:"100vh", background: T.bg,
      display:"flex", alignItems:"center",
      justifyContent:"center", fontFamily:"'Segoe UI',sans-serif",
      position:"relative",
    }}>
      {/* Controls top-right */}
      <div style={{
        position:"fixed", top:"1.2rem", right:"1.5rem",
        zIndex:100, display:"flex", alignItems:"center", gap:"0.6rem",
      }}>
        <LanguageSwitcher darkMode={darkMode} />
        <button onClick={() => setDarkMode(!darkMode)} style={{
          padding:"7px 14px", borderRadius:50, border:"none",
          background: darkMode ? "rgba(30,41,59,0.9)" : "white",
          color: darkMode ? "#e2e8f0" : "#1e293b",
          cursor:"pointer", fontSize:"0.85rem", fontWeight:600,
          border: `1px solid ${darkMode
            ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
        }}>
          {darkMode ? "☀️" : "🌙"}
        </button>
      </div>

      <div style={{
        background: T.card, border:`1px solid ${T.border}`,
        borderRadius:20, padding:"2.5rem",
        width:"100%", maxWidth:440,
        boxShadow:"0 25px 60px rgba(0,0,0,0.4)",
        display:"flex", flexDirection:"column", gap:"1.2rem",
        margin:"1rem",
      }}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:"2.5rem", marginBottom:"0.5rem"}}>🔐</div>
          <h2 style={{
            fontSize:"1.5rem", fontWeight:700, color: T.text, margin:0,
          }}>{t("resetPassword")}</h2>
          <p style={{
            color: T.sub, fontSize:"0.88rem", marginTop:6,
          }}>{t("resetSubtitle")}</p>
        </div>

        {username && (
          <div style={{
            background:"rgba(124,58,237,0.08)",
            border:"1px solid rgba(124,58,237,0.2)",
            borderRadius:10, padding:"10px 14px",
            fontSize:"0.85rem", color: T.text,
          }}>
            {t("loggedInAs")}: <strong>{username}</strong>
          </div>
        )}

        {error && (
          <div style={{
            background:"rgba(220,38,38,0.12)", color:"#f87171",
            border:"1px solid rgba(220,38,38,0.25)",
            padding:"10px 14px", borderRadius:10, fontSize:"0.85rem",
          }}>⚠️ {error}</div>
        )}

        <input
          type="password"
          placeholder={t("newPassword")}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={{
            padding:"13px 14px", borderRadius:10,
            border:`1px solid ${T.inputBorder}`,
            background: T.input, color: T.inputColor,
            fontSize:"0.95rem", outline:"none",
          }}
          required
        />
        <input
          type="password"
          placeholder={t("confirmPassword")}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          style={{
            padding:"13px 14px", borderRadius:10,
            border:`1px solid ${T.inputBorder}`,
            background: T.input, color: T.inputColor,
            fontSize:"0.95rem", outline:"none",
          }}
          required
        />

        <button onClick={handleReset} disabled={loading} style={{
          padding:"13px", borderRadius:10, border:"none",
          background:"linear-gradient(135deg,#7c3aed,#4f46e5)",
          color:"white", fontSize:"1rem", fontWeight:600,
          cursor:"pointer",
          boxShadow:"0 6px 20px rgba(124,58,237,0.35)",
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? t("resetting") : t("resetBtn")}
        </button>
      </div>
    </div>
  );
}

export default ResetPassword;