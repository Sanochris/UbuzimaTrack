import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../auth/AuthService";
import axios from "axios";
import "./AdminDashboard.css";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageSwitcher from "../i18n/LanguageSwitcher";

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`
});

const getRisk = (p) => {
  if (p.heartRate > 120 || p.temperature > 39) return "HIGH";
  if (p.heartRate > 100 || p.temperature > 37.5) return "MEDIUM";
  return "LOW";
};

const RISK_STYLES = {
  HIGH:   { color: "#ef4444", bg: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.35)"  },
  MEDIUM: { color: "#d97706", bg: "rgba(217,119,6,0.15)",  border: "rgba(217,119,6,0.35)"  },
  LOW:    { color: "#16a34a", bg: "rgba(22,163,74,0.15)",  border: "rgba(22,163,74,0.35)"  },
};

const RISK_STYLES_DARK = {
  HIGH:   { color: "#fca5a5", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.25)"  },
  MEDIUM: { color: "#fcd34d", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.25)" },
  LOW:    { color: "#86efac", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.25)"  },
};

function AdminDashboard() {
  const navigate      = useNavigate();
  const { t }         = useLanguage();
  const adminUsername = localStorage.getItem("username");

  const [darkMode,      setDarkMode]      = useState(true);
  const [activeTab,     setActiveTab]     = useState("overview");
  const [collapsed,     setCollapsed]     = useState(false);
  const [currentTime,   setCurrentTime]   = useState(new Date().toLocaleTimeString());

  const [users,         setUsers]         = useState([]);
  const [totalUsers,    setTotalUsers]    = useState(0);
  const [pendingResets, setPendingResets] = useState(0);
  const [loadingUsers,  setLoadingUsers]  = useState(true);
  const [fetchError,    setFetchError]    = useState("");
  const [deleteError,   setDeleteError]   = useState("");

  const [healthData,       setHealthData]       = useState([]);
  const [loadingHealth,    setLoadingHealth]    = useState(false);
  const [healthError,      setHealthError]      = useState("");
  const [selectedPatient,  setSelectedPatient]  = useState(null);
  const [patientHistory,   setPatientHistory]   = useState([]);
  const [loadingHistory,   setLoadingHistory]   = useState(false);
  const [healthSearch,     setHealthSearch]     = useState("");
  const [riskFilter,       setRiskFilter]       = useState("ALL");
  const [deletingHealthId, setDeletingHealthId] = useState(null);

  const [form,        setForm]        = useState({ username: "", email: "", role: "USER" });
  const [formError,   setFormError]   = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // NAV_ITEMS now uses t() — defined inside component
  const NAV_ITEMS = [
    { id: "overview", icon: "📊", label: t("nav_overview")  },
    { id: "users",    icon: "👥", label: t("nav_users")     },
    { id: "create",   icon: "➕", label: t("nav_create")    },
    { id: "health",   icon: "🏥", label: t("nav_health")    },
    { id: "settings", icon: "⚙️", label: t("nav_settings")  },
  ];

  const PAGE_TITLES = {
    overview: { title: t("page_overview_title"), sub: t("page_overview_sub") },
    users:    { title: t("page_users_title"),    sub: t("page_users_sub")    },
    create:   { title: t("page_create_title"),   sub: t("page_create_sub")   },
    health:   { title: t("page_health_title"),   sub: t("page_health_sub")   },
    settings: { title: t("page_settings_title"), sub: t("page_settings_sub") },
  };

  useEffect(() => {
    const timer = setInterval(() =>
      setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true); setFetchError("");
    try {
      const [usersRes, countRes] = await Promise.all([
        axios.get("http://localhost:8080/api/admin/users",       { headers: getHeaders() }),
        axios.get("http://localhost:8080/api/admin/users/count", { headers: getHeaders() }),
      ]);
      setUsers(usersRes.data);
      setTotalUsers(countRes.data.count);
      setPendingResets(usersRes.data.filter(u => u.mustResetPassword).length);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) navigate("/");
      else setFetchError("Failed to load users. Is the backend running?");
    } finally { setLoadingUsers(false); }
  }, [navigate]);

  const fetchHealthData = useCallback(async () => {
    setLoadingHealth(true); setHealthError("");
    try {
      const res = await axios.get(
        "http://localhost:8080/api/health/data", { headers: getHeaders() }
      );
      setHealthData(res.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) navigate("/");
      else setHealthError("Failed to load health data. Is the backend running?");
    } finally { setLoadingHealth(false); }
  }, [navigate]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => {
    if (activeTab === "health") fetchHealthData();
  }, [activeTab, fetchHealthData]);

  const handleLogout = async () => { await logout(); navigate("/"); };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError(""); setFormSuccess("");
    if (!form.username || !form.email) {
      setFormError(t("err_username_email_required")); return;
    }
    setFormLoading(true);
    try {
      const res = await axios.post(
        "http://localhost:8080/api/admin/create-user", form,
        { headers: getHeaders() }
      );
      setFormSuccess(res.data.message || "User created successfully!");
      setForm({ username: "", email: "", role: "USER" });
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.error || "Failed to create user");
    } finally { setFormLoading(false); }
  };

  const handleDeleteUser = async (id, username) => {
    if (!window.confirm(`${t("confirm_delete_user")} "${username}"?`)) return;
    setDeleteError("");
    try {
      await axios.delete(
        `http://localhost:8080/api/admin/users/${id}`, { headers: getHeaders() }
      );
      fetchUsers();
    } catch (err) {
      setDeleteError(err.response?.data?.error || "Failed to delete user");
    }
  };

  const handleDeleteHealth = async (id) => {
    if (!window.confirm(t("confirm_delete_health"))) return;
    setDeletingHealthId(id);
    try {
      await axios.delete(
        `http://localhost:8080/api/health/data/${id}`, { headers: getHeaders() }
      );
      fetchHealthData();
    } catch (err) {
      setHealthError(err.response?.data?.error || "Failed to delete record");
    } finally { setDeletingHealthId(null); }
  };

  const openPatientHistory = async (patientId) => {
    setSelectedPatient(patientId);
    setLoadingHistory(true);
    setPatientHistory([]);
    try {
      const res = await axios.get(
        `http://localhost:8080/api/health/data/patient/${patientId}`,
        { headers: getHeaders() }
      );
      setPatientHistory(res.data);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally { setLoadingHistory(false); }
  };

  const filteredHealth = healthData.filter(p => {
    const matchSearch = p.patientId?.toString().includes(healthSearch);
    const matchRisk   = riskFilter === "ALL" || getRisk(p) === riskFilter;
    return matchSearch && matchRisk;
  });

  const highCount   = healthData.filter(p => getRisk(p) === "HIGH").length;
  const mediumCount = healthData.filter(p => getRisk(p) === "MEDIUM").length;
  const lowCount    = healthData.filter(p => getRisk(p) === "LOW").length;

  // ── THEME TOKENS ──
  const T = darkMode ? {
    bg: "#020617", sidebar: "rgba(15,23,42,0.97)",
    sidebarBorder: "rgba(255,255,255,0.07)", card: "rgba(15,23,42,0.75)",
    cardBorder: "rgba(255,255,255,0.07)", topbar: "rgba(2,6,23,0.92)",
    text: "#f1f5f9", textSecond: "#cbd5e1", subtext: "#64748b",
    input: "rgba(15,23,42,0.9)", inputBorder: "rgba(148,163,184,0.2)",
    inputColor: "#e2e8f0", inputPh: "#475569", rowDiv: "rgba(255,255,255,0.05)",
    modalBg: "#0f172a", timeChip: "rgba(30,41,59,0.9)",
    timeChipBorder: "rgba(255,255,255,0.08)", timeColor: "#94a3b8",
    toggleBg: "rgba(30,41,59,0.9)", toggleBorder: "rgba(255,255,255,0.1)",
    toggleColor: "#e2e8f0", statChange: "#4ade80", RS: RISK_STYLES_DARK,
  } : {
    bg: "#eef2ff", sidebar: "rgba(255,255,255,0.98)",
    sidebarBorder: "rgba(0,0,0,0.09)", card: "rgba(255,255,255,0.95)",
    cardBorder: "rgba(0,0,0,0.09)", topbar: "rgba(255,255,255,0.97)",
    text: "#0f172a", textSecond: "#1e293b", subtext: "#475569",
    input: "rgba(241,245,249,1)", inputBorder: "rgba(0,0,0,0.15)",
    inputColor: "#0f172a", inputPh: "#94a3b8", rowDiv: "rgba(0,0,0,0.05)",
    modalBg: "#ffffff", timeChip: "rgba(241,245,249,1)",
    timeChipBorder: "rgba(0,0,0,0.12)", timeColor: "#334155",
    toggleBg: "rgba(241,245,249,1)", toggleBorder: "rgba(0,0,0,0.12)",
    toggleColor: "#1e293b", statChange: "#15803d", RS: RISK_STYLES,
  };

  // ── REUSABLE HELPERS ──
  const card = (children, extra = {}) => (
    <div style={{
      background: T.card, border: `1px solid ${T.cardBorder}`,
      borderRadius: 16, padding: "1.8rem",
      backdropFilter: "blur(12px)",
      transition: "background 0.4s, border 0.4s", ...extra,
    }}>{children}</div>
  );

  const sectionHead = (title, sub, right) => (
    <div style={{
      display: "flex", alignItems: "flex-start",
      justifyContent: "space-between", marginBottom: "1.5rem",
      gap: "1rem", flexWrap: "wrap",
    }}>
      <div>
        <div style={{ fontSize: "1.1rem", fontWeight: 700, color: T.text }}>{title}</div>
        {sub && <div style={{ fontSize: "0.8rem", color: T.subtext, marginTop: 3 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );

  const statCard = (icon, value, label, change, accent) => (
    <div style={{
      background: T.card, border: `1px solid ${T.cardBorder}`,
      borderRadius: 16, padding: "1.5rem",
      display: "flex", alignItems: "center", gap: "1rem",
      backdropFilter: "blur(10px)", position: "relative",
      overflow: "hidden", transition: "all 0.2s ease",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 3, background: accent, borderRadius: "16px 16px 0 0",
      }} />
      <div style={{
        fontSize: "1.8rem", width: 52, height: 52,
        background: darkMode ? "rgba(124,58,237,0.15)" : "rgba(124,58,237,0.1)",
        borderRadius: 12, display: "flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{
          fontSize: "1.9rem", fontWeight: 800, lineHeight: 1,
          background: "linear-gradient(90deg,#7c3aed,#06b6d4)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>{value}</div>
        <div style={{ fontSize: "0.82rem", color: T.text, fontWeight: 600, marginTop: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: "0.74rem", color: T.statChange, marginTop: 2 }}>
          {change}
        </div>
      </div>
    </div>
  );

  const tableHead = (cols) => (
    <thead>
      <tr style={{ background: darkMode ? "rgba(15,23,42,0.5)" : "rgba(241,245,249,0.8)" }}>
        {cols.map(c => (
          <th key={c} style={{
            textAlign: "left", padding: "12px 16px",
            fontSize: "0.72rem", fontWeight: 700, color: T.subtext,
            textTransform: "uppercase", letterSpacing: "0.6px",
            borderBottom: `2px solid ${T.cardBorder}`, whiteSpace: "nowrap",
          }}>{c}</th>
        ))}
      </tr>
    </thead>
  );

  const tdStyle = {
    padding: "13px 16px", fontSize: "0.88rem",
    color: T.textSecond, borderBottom: `1px solid ${T.rowDiv}`,
  };

  const roleBadge = (role) => (
    <span style={{
      padding: "3px 11px", borderRadius: 20,
      fontSize: "0.72rem", fontWeight: 700,
      background: role === "ADMIN"
        ? darkMode ? "rgba(124,58,237,0.18)" : "rgba(109,40,217,0.12)"
        : darkMode ? "rgba(6,182,212,0.15)"  : "rgba(8,145,178,0.12)",
      color: role === "ADMIN"
        ? darkMode ? "#c4b5fd" : "#6d28d9"
        : darkMode ? "#67e8f9" : "#0e7490",
      border: role === "ADMIN"
        ? darkMode ? "1px solid rgba(124,58,237,0.3)" : "1px solid rgba(109,40,217,0.25)"
        : darkMode ? "1px solid rgba(6,182,212,0.25)" : "1px solid rgba(8,145,178,0.2)",
    }}>{role}</span>
  );

  const statusBadge = (mustReset) => (
    <span style={{
      padding: "3px 11px", borderRadius: 20,
      fontSize: "0.72rem", fontWeight: 600,
      background: mustReset
        ? darkMode ? "rgba(239,68,68,0.15)"  : "rgba(220,38,38,0.1)"
        : darkMode ? "rgba(34,197,94,0.15)"  : "rgba(22,163,74,0.1)",
      color: mustReset
        ? darkMode ? "#fca5a5" : "#b91c1c"
        : darkMode ? "#86efac" : "#15803d",
      border: mustReset
        ? darkMode ? "1px solid rgba(239,68,68,0.3)"  : "1px solid rgba(220,38,38,0.25)"
        : darkMode ? "1px solid rgba(34,197,94,0.3)"  : "1px solid rgba(22,163,74,0.25)",
    }}>
      {mustReset ? t("pending_reset") : t("active")}
    </span>
  );

  const riskBadge = (risk) => {
    const rs = T.RS[risk];
    return (
      <span style={{
        background: rs.bg, border: `1px solid ${rs.border}`,
        color: rs.color, padding: "3px 11px",
        borderRadius: 20, fontSize: "0.72rem", fontWeight: 700,
      }}>{risk}</span>
    );
  };

  const deleteBtn = (onClick, loading) => (
    <button onClick={onClick} disabled={loading} style={{
      padding: "5px 14px",
      background: darkMode ? "rgba(239,68,68,0.12)" : "rgba(220,38,38,0.08)",
      color: darkMode ? "#fca5a5" : "#b91c1c",
      border: darkMode ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(220,38,38,0.3)",
      borderRadius: 8, cursor: "pointer",
      fontSize: "0.8rem", fontWeight: 600, transition: "all 0.2s",
    }}>
      {loading ? t("deleting") : t("delete")}
    </button>
  );

  const alertBox = (msg, type) => (
    <div style={{
      background: type === "error"
        ? darkMode ? "rgba(220,38,38,0.12)" : "rgba(220,38,38,0.08)"
        : darkMode ? "rgba(34,197,94,0.12)"  : "rgba(22,163,74,0.08)",
      color: type === "error"
        ? darkMode ? "#fca5a5" : "#b91c1c"
        : darkMode ? "#86efac" : "#15803d",
      border: type === "error"
        ? darkMode ? "1px solid rgba(220,38,38,0.25)" : "1px solid rgba(220,38,38,0.3)"
        : darkMode ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(22,163,74,0.3)",
      padding: "10px 14px", borderRadius: 10,
      fontSize: "0.85rem", marginBottom: "1rem", fontWeight: 500,
    }}>
      {type === "error" ? "⚠️" : "✅"} {msg}
    </div>
  );

  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      background: T.bg, color: T.text,
      fontFamily: "'Segoe UI',Tahoma,Geneva,Verdana,sans-serif",
      position: "relative", overflow: "hidden",
      transition: "background 0.4s ease",
    }}>

      {/* Blobs */}
      {[
        { w: 500, h: 500, c: "#7c3aed", t: -150, r: -100, l: "auto", delay: "0s" },
        { w: 400, h: 400, c: "#06b6d4", b: -100, l: 200, t: "auto", r: "auto", delay: "4s" },
      ].map((b, i) => (
        <div key={i} style={{
          position: "fixed", width: b.w, height: b.h,
          background: b.c, borderRadius: "50%", filter: "blur(90px)",
          opacity: darkMode ? 0.07 : 0.06,
          top: b.t, right: b.r, bottom: b.b, left: b.l, pointerEvents: "none",
        }} />
      ))}

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: collapsed ? 70 : 260, minHeight: "100vh",
        background: T.sidebar, borderRight: `1px solid ${T.sidebarBorder}`,
        display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: 0, zIndex: 100,
        transition: "width 0.3s ease", backdropFilter: "blur(24px)",
        boxShadow: darkMode ? "2px 0 20px rgba(0,0,0,0.3)" : "2px 0 20px rgba(0,0,0,0.08)",
      }}>

        {/* Brand */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.8rem",
          padding: "1.4rem 1.2rem", borderBottom: `1px solid ${T.sidebarBorder}`,
          overflow: "hidden",
        }}>
          <span style={{
            fontSize: "1.5rem",
            background: "linear-gradient(135deg,#7c3aed,#06b6d4)",
            borderRadius: 10, padding: "0.4rem 0.5rem",
            boxShadow: "0 4px 14px rgba(124,58,237,0.4)", flexShrink: 0,
          }}>🏥</span>
          {!collapsed && (
            <span style={{
              fontSize: "1rem", fontWeight: 700,
              background: "linear-gradient(90deg,#a78bfa,#38bdf8)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              whiteSpace: "nowrap",
            }}>UbuzimaTrack</span>
          )}
        </div>

        {/* Collapse button */}
        <button onClick={() => setCollapsed(!collapsed)} style={{
          position: "absolute", top: "1.3rem", right: "-14px",
          width: 28, height: 28,
          background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
          border: "none", borderRadius: "50%",
          color: "white", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.8rem", boxShadow: "0 4px 12px rgba(124,58,237,0.45)",
          zIndex: 101, fontWeight: 700,
        }}>
          {collapsed ? "›" : "‹"}
        </button>

        {/* Admin info */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.8rem",
          padding: "1rem 1.2rem", borderBottom: `1px solid ${T.sidebarBorder}`,
          overflow: "hidden",
        }}>
          <div style={{
            width: 38, height: 38,
            background: "linear-gradient(135deg,#7c3aed,#06b6d4)",
            borderRadius: "50%", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "1rem", fontWeight: 700,
            color: "white", flexShrink: 0,
            boxShadow: "0 4px 10px rgba(124,58,237,0.35)",
          }}>
            {adminUsername?.[0]?.toUpperCase() || "A"}
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: T.text }}>
                {adminUsername}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#a78bfa", fontWeight: 500 }}>
                {t("administrator")}
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{
          flex: 1, padding: "0.8rem 0.6rem",
          display: "flex", flexDirection: "column", gap: "0.25rem",
          overflowY: "auto",
        }}>
          {NAV_ITEMS.map(item => {
            const active = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                title={collapsed ? item.label : ""}
                style={{
                  display: "flex", alignItems: "center", gap: "0.9rem",
                  padding: "0.75rem 0.9rem", borderRadius: 10, cursor: "pointer",
                  border: active
                    ? `1px solid rgba(124,58,237,${darkMode ? 0.25 : 0.2})`
                    : "1px solid transparent",
                  background: active
                    ? darkMode
                      ? "linear-gradient(135deg,rgba(124,58,237,0.22),rgba(6,182,212,0.1))"
                      : "linear-gradient(135deg,rgba(124,58,237,0.12),rgba(6,182,212,0.06))"
                    : "transparent",
                  color: active
                    ? darkMode ? "#c4b5fd" : "#6d28d9"
                    : T.subtext,
                  fontSize: "0.9rem", fontWeight: active ? 600 : 500,
                  width: "100%", textAlign: "left",
                  whiteSpace: "nowrap", overflow: "hidden",
                  transition: "all 0.2s ease",
                }}>
                <span style={{ fontSize: "1.1rem", flexShrink: 0, width: 22, textAlign: "center" }}>
                  {item.icon}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: "0.8rem 0.6rem", borderTop: `1px solid ${T.sidebarBorder}` }}>
          <button onClick={handleLogout} style={{
            display: "flex", alignItems: "center", gap: "0.9rem",
            padding: "0.75rem 0.9rem", borderRadius: 10, cursor: "pointer",
            border: darkMode ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(220,38,38,0.2)",
            background: darkMode ? "rgba(239,68,68,0.1)" : "rgba(220,38,38,0.06)",
            color: darkMode ? "#fca5a5" : "#b91c1c",
            fontSize: "0.9rem", fontWeight: 600,
            width: "100%", textAlign: "left",
            whiteSpace: "nowrap", overflow: "hidden",
            transition: "all 0.2s ease",
          }}>
            <span style={{ fontSize: "1.1rem", flexShrink: 0, width: 22, textAlign: "center" }}>
              🚪
            </span>
            {!collapsed && <span>{t("nav_logout")}</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{
        flex: 1, marginLeft: collapsed ? 70 : 260,
        transition: "margin-left 0.3s ease",
        display: "flex", flexDirection: "column", minHeight: "100vh",
      }}>

        {/* Topbar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1rem 2rem", background: T.topbar,
          borderBottom: `1px solid ${T.sidebarBorder}`,
          backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 50,
          transition: "background 0.4s",
          boxShadow: darkMode ? "0 2px 20px rgba(0,0,0,0.3)" : "0 2px 20px rgba(0,0,0,0.07)",
        }}>
          <div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: T.text }}>
              {PAGE_TITLES[activeTab].title}
            </div>
            <div style={{ fontSize: "0.78rem", color: T.subtext, marginTop: 2 }}>
              {PAGE_TITLES[activeTab].sub}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Language switcher */}
            <LanguageSwitcher darkMode={darkMode} />

            {/* Dark/Light toggle */}
            <button onClick={() => setDarkMode(!darkMode)} style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "7px 14px", borderRadius: 50, cursor: "pointer",
              border: `1px solid ${T.toggleBorder}`, background: T.toggleBg,
              color: T.toggleColor, fontSize: "0.82rem", fontWeight: 600,
              transition: "all 0.3s ease",
              boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.1)",
              whiteSpace: "nowrap",
            }}>
              <span>{darkMode ? "☀️" : "🌙"}</span>
              <span>{darkMode ? t("lightMode") : t("darkMode")}</span>
            </button>

            {/* Clock */}
            <span style={{
              fontSize: "0.85rem", color: T.timeColor, background: T.timeChip,
              padding: "7px 14px", borderRadius: 8,
              border: `1px solid ${T.timeChipBorder}`,
              fontWeight: 500, whiteSpace: "nowrap",
            }}>🕐 {currentTime}</span>

            {/* Badge */}
            <span style={{
              background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
              color: "white", padding: "6px 16px", borderRadius: 20,
              fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.5px",
              boxShadow: "0 4px 12px rgba(124,58,237,0.35)",
            }}>ADMIN</span>
          </div>
        </div>

        {/* Page content */}
        <div style={{
          flex: 1, padding: "2rem",
          display: "flex", flexDirection: "column", gap: "2rem",
        }}>
          {fetchError && alertBox(fetchError, "error")}

          {/* ── OVERVIEW ── */}
          {activeTab === "overview" && (<>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
              gap: "1.2rem",
            }}>
              {statCard("👥", loadingUsers ? "..." : totalUsers,
                t("stat_total_users"), t("stat_total_users_change"),
                "linear-gradient(90deg,#7c3aed,#06b6d4)")}
              {statCard("⚠️", loadingUsers ? "..." : pendingResets,
                t("stat_pending_resets"), t("stat_pending_resets_change"),
                "linear-gradient(90deg,#f59e0b,#ef4444)")}
              {statCard("✅", t("stat_system_online"),
                t("stat_system_status"), t("stat_system_change"),
                "linear-gradient(90deg,#22c55e,#06b6d4)")}
              {statCard("🔐", loadingUsers ? "..." : totalUsers - pendingResets,
                t("stat_active_users"), t("stat_active_users_change"),
                "linear-gradient(90deg,#a78bfa,#f472b6)")}
            </div>

            {card(<>
              {sectionHead(
                t("recent_users"), t("recent_users_sub"),
                <button onClick={() => setActiveTab("users")} style={{
                  background: darkMode ? "rgba(124,58,237,0.15)" : "rgba(109,40,217,0.1)",
                  border: darkMode ? "1px solid rgba(124,58,237,0.25)" : "1px solid rgba(109,40,217,0.2)",
                  color: darkMode ? "#c4b5fd" : "#6d28d9",
                  padding: "5px 14px", borderRadius: 20,
                  fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                }}>{t("view_all")}</button>
              )}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  {tableHead([t("col_username"), t("col_email"), t("col_role"), t("col_status")])}
                  <tbody>
                    {users.slice(0, 5).map(u => (
                      <tr key={u.id}>
                        <td style={{ ...tdStyle, fontWeight: 600, color: T.text }}>{u.username}</td>
                        <td style={tdStyle}>{u.email}</td>
                        <td style={tdStyle}>{roleBadge(u.role)}</td>
                        <td style={tdStyle}>{statusBadge(u.mustResetPassword)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!loadingUsers && users.length === 0 && (
                  <div style={{ textAlign: "center", color: T.subtext, padding: "3rem" }}>
                    {t("no_users")}
                  </div>
                )}
                {loadingUsers && (
                  <div style={{ textAlign: "center", color: T.subtext, padding: "3rem" }}>
                    {t("loading_users")}
                  </div>
                )}
              </div>
            </>)}
          </>)}

          {/* ── USERS ── */}
          {activeTab === "users" && card(<>
            {sectionHead(
              t("all_users"), t("all_users_sub"),
              <span style={{
                background: darkMode ? "rgba(124,58,237,0.15)" : "rgba(109,40,217,0.1)",
                border: darkMode ? "1px solid rgba(124,58,237,0.25)" : "1px solid rgba(109,40,217,0.2)",
                color: darkMode ? "#c4b5fd" : "#6d28d9",
                padding: "4px 12px", borderRadius: 20,
                fontSize: "0.75rem", fontWeight: 600,
              }}>{totalUsers} {t("total")}</span>
            )}
            {deleteError && alertBox(deleteError, "error")}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                {tableHead([
                  t("col_id"), t("col_username"), t("col_email"),
                  t("col_role"), t("col_status"), t("col_action")
                ])}
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{ ...tdStyle, color: T.subtext }}>#{u.id}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: T.text }}>{u.username}</td>
                      <td style={tdStyle}>{u.email}</td>
                      <td style={tdStyle}>{roleBadge(u.role)}</td>
                      <td style={tdStyle}>{statusBadge(u.mustResetPassword)}</td>
                      <td style={tdStyle}>
                        {deleteBtn(() => handleDeleteUser(u.id, u.username), false)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loadingUsers && users.length === 0 && (
                <div style={{ textAlign: "center", color: T.subtext, padding: "3rem" }}>
                  {t("no_users")}
                </div>
              )}
              {loadingUsers && (
                <div style={{ textAlign: "center", color: T.subtext, padding: "3rem" }}>
                  {t("loading_users")}
                </div>
              )}
            </div>
          </>)}

          {/* ── CREATE USER ── */}
          {activeTab === "create" && card(<>
            {sectionHead(t("create_new_user"), t("create_new_user_sub"))}
            {formError   && alertBox(formError,   "error")}
            {formSuccess && alertBox(formSuccess, "success")}
            <form onSubmit={handleCreateUser} style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              gap: "1rem", maxWidth: 700,
            }}>
              {[
                { label: t("field_username"), type: "text",  key: "username", ph: t("ph_username") },
                { label: t("field_email"),    type: "email", key: "email",    ph: t("ph_email")    },
              ].map(f => (
                <div key={f.key}>
                  <label style={{
                    fontSize: "0.8rem", color: T.text,
                    fontWeight: 600, display: "block", marginBottom: 5,
                  }}>{f.label}</label>
                  <input type={f.type} placeholder={f.ph}
                    value={form[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    required
                    style={{
                      width: "100%", padding: "11px 14px", borderRadius: 10,
                      border: `1px solid ${T.inputBorder}`,
                      background: T.input, color: T.inputColor,
                      fontSize: "0.9rem", outline: "none",
                    }}
                  />
                </div>
              ))}
              <div>
                <label style={{
                  fontSize: "0.8rem", color: T.text,
                  fontWeight: 600, display: "block", marginBottom: 5,
                }}>{t("field_role")}</label>
                <select value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: 10,
                    border: `1px solid ${T.inputBorder}`,
                    background: T.input, color: T.inputColor,
                    fontSize: "0.9rem", outline: "none",
                  }}>
                  <option value="USER">{t("role_user")}</option>
                  <option value="ADMIN">{t("role_admin")}</option>
                </select>
              </div>
              <div style={{ gridColumn: "1/-1", marginTop: "0.5rem" }}>
                <button type="submit" disabled={formLoading} style={{
                  padding: "12px 28px",
                  background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                  color: "white", border: "none", borderRadius: 10,
                  fontSize: "0.95rem", fontWeight: 600, cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(124,58,237,0.35)",
                  opacity: formLoading ? 0.7 : 1,
                }}>
                  {formLoading ? t("btn_creating") : t("btn_create")}
                </button>
              </div>
            </form>
          </>)}

          {/* ── HEALTH DATA ── */}
          {activeTab === "health" && (<>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
              gap: "1.2rem",
            }}>
              {statCard("🧑‍⚕️", loadingHealth ? "..." : healthData.length,
                t("stat_total_records"), t("stat_total_records_change"),
                "linear-gradient(90deg,#7c3aed,#06b6d4)")}
              {statCard("🚨", loadingHealth ? "..." : highCount,
                t("stat_high_risk"), t("stat_high_risk_change"),
                "linear-gradient(90deg,#ef4444,#f97316)")}
              {statCard("⚠️", loadingHealth ? "..." : mediumCount,
                t("stat_medium_risk"), t("stat_medium_risk_change"),
                "linear-gradient(90deg,#f59e0b,#fbbf24)")}
              {statCard("✅", loadingHealth ? "..." : lowCount,
                t("stat_low_risk"), t("stat_low_risk_change"),
                "linear-gradient(90deg,#22c55e,#06b6d4)")}
            </div>

            {card(<>
              {sectionHead(
                t("patient_records"), t("patient_records_sub"),
                <button onClick={fetchHealthData} style={{
                  padding: "8px 16px",
                  background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                  color: "white", border: "none", borderRadius: 10,
                  fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(124,58,237,0.3)",
                }}>{t("btn_refresh")}</button>
              )}
              {healthError && alertBox(healthError, "error")}

              <div style={{
                display: "flex", gap: "1rem", marginBottom: "1.2rem",
                flexWrap: "wrap", alignItems: "center",
              }}>
                <input
                  placeholder={t("search_patient")}
                  value={healthSearch}
                  onChange={e => setHealthSearch(e.target.value)}
                  style={{
                    padding: "10px 14px", borderRadius: 10,
                    border: `1px solid ${T.inputBorder}`,
                    background: T.input, color: T.inputColor,
                    fontSize: "0.88rem", outline: "none",
                    maxWidth: 240, width: "100%",
                  }}
                />
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {["ALL", "HIGH", "MEDIUM", "LOW"].map(r => (
                    <button key={r} onClick={() => setRiskFilter(r)} style={{
                      padding: "8px 14px", borderRadius: 8,
                      cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
                      border: `1px solid ${riskFilter === r ? "#7c3aed" : T.inputBorder}`,
                      background: riskFilter === r
                        ? darkMode ? "rgba(124,58,237,0.22)" : "rgba(109,40,217,0.12)"
                        : T.input,
                      color: riskFilter === r
                        ? darkMode ? "#c4b5fd" : "#6d28d9"
                        : T.subtext,
                      transition: "all 0.2s",
                    }}>{r}</button>
                  ))}
                </div>
              </div>

              {loadingHealth ? (
                <div style={{ textAlign: "center", color: T.subtext, padding: "3rem" }}>
                  {t("loading_health")}
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    {tableHead([
                      t("col_record_id"), t("col_patient_id"), t("col_heart_rate"),
                      t("col_temperature"), t("col_risk_level"), t("col_timestamp"), t("col_action")
                    ])}
                    <tbody>
                      {filteredHealth.map(p => {
                        const risk = getRisk(p);
                        return (
                          <tr key={p.id}>
                            <td style={{ ...tdStyle, color: T.subtext }}>#{p.id}</td>
                            <td style={tdStyle}>
                              <button onClick={() => openPatientHistory(p.patientId)} style={{
                                background: darkMode ? "rgba(124,58,237,0.12)" : "rgba(109,40,217,0.08)",
                                border: darkMode ? "1px solid rgba(124,58,237,0.25)" : "1px solid rgba(109,40,217,0.2)",
                                color: darkMode ? "#c4b5fd" : "#6d28d9",
                                padding: "4px 12px", borderRadius: 8,
                                cursor: "pointer", fontWeight: 600, fontSize: "0.85rem",
                              }}>
                                {t("patient_label")} {p.patientId}
                              </button>
                            </td>
                            <td style={tdStyle}>
                              <span style={{
                                color: p.heartRate > 100
                                  ? darkMode ? "#fca5a5" : "#b91c1c" : T.text,
                                fontWeight: 600,
                              }}>❤️ {p.heartRate} bpm</span>
                            </td>
                            <td style={tdStyle}>
                              <span style={{
                                color: p.temperature > 37.5
                                  ? darkMode ? "#fcd34d" : "#b45309" : T.text,
                                fontWeight: 600,
                              }}>🌡️ {p.temperature} °C</span>
                            </td>
                            <td style={tdStyle}>{riskBadge(risk)}</td>
                            <td style={{ ...tdStyle, color: T.subtext, fontSize: "0.82rem" }}>
                              {p.timestamp ? new Date(p.timestamp).toLocaleString() : "—"}
                            </td>
                            <td style={tdStyle}>
                              {deleteBtn(() => handleDeleteHealth(p.id), deletingHealthId === p.id)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredHealth.length === 0 && (
                    <div style={{ textAlign: "center", color: T.subtext, padding: "3rem" }}>
                      {healthData.length === 0 ? t("no_health_records") : t("no_filter_match")}
                    </div>
                  )}
                </div>
              )}
            </>)}

            {/* Patient history modal */}
            {selectedPatient && (
              <div style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
                backdropFilter: "blur(6px)", zIndex: 200,
                display: "flex", alignItems: "center",
                justifyContent: "center", padding: "1rem",
              }} onClick={() => setSelectedPatient(null)}>
                <div style={{
                  background: T.modalBg, border: `1px solid ${T.cardBorder}`,
                  borderRadius: 20, padding: "2rem",
                  width: "100%", maxWidth: 720, maxHeight: "80vh", overflowY: "auto",
                  boxShadow: "0 30px 70px rgba(0,0,0,0.5)",
                }} onClick={e => e.stopPropagation()}>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: "1.5rem", gap: "1rem",
                  }}>
                    <div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: T.text }}>
                        {t("patient_label")} {selectedPatient} — {t("history_title")}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: T.subtext, marginTop: 4 }}>
                        {t("history_source")} {selectedPatient}
                      </div>
                    </div>
                    <button onClick={() => setSelectedPatient(null)} style={{
                      background: darkMode ? "rgba(239,68,68,0.12)" : "rgba(220,38,38,0.08)",
                      border: darkMode ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(220,38,38,0.25)",
                      color: darkMode ? "#fca5a5" : "#b91c1c",
                      padding: "6px 16px", borderRadius: 8,
                      cursor: "pointer", fontWeight: 600, flexShrink: 0,
                    }}>{t("close")}</button>
                  </div>

                  {loadingHistory ? (
                    <div style={{ textAlign: "center", color: T.subtext, padding: "3rem" }}>
                      {t("loading_history")}
                    </div>
                  ) : patientHistory.length === 0 ? (
                    <div style={{ textAlign: "center", color: T.subtext, padding: "3rem" }}>
                      {t("no_history")}
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        {tableHead(["#", t("col_heart_rate"), t("col_temperature"), t("col_risk_level"), t("col_timestamp")])}
                        <tbody>
                          {patientHistory.map((h, i) => (
                            <tr key={h.id}>
                              <td style={{ ...tdStyle, color: T.subtext }}>{i + 1}</td>
                              <td style={tdStyle}>
                                <span style={{
                                  color: h.heartRate > 100
                                    ? darkMode ? "#fca5a5" : "#b91c1c" : T.text,
                                  fontWeight: 600,
                                }}>❤️ {h.heartRate} bpm</span>
                              </td>
                              <td style={tdStyle}>
                                <span style={{
                                  color: h.temperature > 37.5
                                    ? darkMode ? "#fcd34d" : "#b45309" : T.text,
                                  fontWeight: 600,
                                }}>🌡️ {h.temperature} °C</span>
                              </td>
                              <td style={tdStyle}>{riskBadge(getRisk(h))}</td>
                              <td style={{ ...tdStyle, color: T.subtext, fontSize: "0.82rem" }}>
                                {h.timestamp ? new Date(h.timestamp).toLocaleString() : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>)}

          {/* ── SETTINGS ── */}
          {activeTab === "settings" && card(<>
            {sectionHead(t("page_settings_title"), t("page_settings_sub"))}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 500 }}>
              {[
                { rgb: "124,58,237", label: t("settings_logged_as"),  value: adminUsername              },
                { rgb: "34,197,94",  label: t("settings_version"),    value: "UbuzimaTrack v1.0.0"      },
                { rgb: "6,182,212",  label: t("settings_backend"),    value: "http://localhost:8080"    },
                { rgb: "245,158,11", label: t("settings_database"),   value: "PostgreSQL — healthdb"    },
              ].map(item => (
                <div key={item.label} style={{
                  background: `rgba(${item.rgb},${darkMode ? 0.1 : 0.07})`,
                  border: `1px solid rgba(${item.rgb},${darkMode ? 0.22 : 0.2})`,
                  borderRadius: 12, padding: "1.2rem",
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, color: T.text }}>{item.label}</div>
                  <div style={{ color: T.subtext, fontSize: "0.9rem" }}>{item.value}</div>
                </div>
              ))}
            </div>
          </>)}

        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;  