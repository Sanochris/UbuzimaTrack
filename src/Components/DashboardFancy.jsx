import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageSwitcher from "../i18n/LanguageSwitcher";
import {
  FaHeart, FaThermometerHalf, FaTimes,
  FaExclamationTriangle, FaSignOutAlt, FaUserShield,
  FaSearch, FaSyncAlt
} from "react-icons/fa";

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import ECGChart from "./ECGChart";
import { useNavigate } from "react-router-dom";
import { logout, getToken, getRole, getUsername } from "../auth/AuthService";

const NAV_ITEMS = [
  { id: "monitor",  icon: "🏥", label: "Live Monitor"   },
  { id: "history",  icon: "📋", label: "Patient History" },
  { id: "stats",    icon: "📊", label: "Statistics"      },
  { id: "settings", icon: "⚙️", label: "Settings"       },
];

const getRisk = (p) => {
  if (p.heartRate > 120 || p.temperature > 39) return "HIGH";
  if (p.heartRate > 100 || p.temperature > 37.5) return "MEDIUM";
  return "LOW";
};

const RISK_DARK = {
  HIGH:   { color:"#fca5a5", bg:"rgba(239,68,68,0.12)",  border:"rgba(239,68,68,0.25)"  },
  MEDIUM: { color:"#fcd34d", bg:"rgba(251,191,36,0.12)", border:"rgba(251,191,36,0.25)" },
  LOW:    { color:"#86efac", bg:"rgba(34,197,94,0.12)",  border:"rgba(34,197,94,0.25)"  },
};

const RISK_LIGHT = {
  HIGH:   { color:"#b91c1c", bg:"rgba(220,38,38,0.1)",  border:"rgba(220,38,38,0.3)"  },
  MEDIUM: { color:"#b45309", bg:"rgba(217,119,6,0.1)",  border:"rgba(217,119,6,0.3)"  },
  LOW:    { color:"#15803d", bg:"rgba(22,163,74,0.1)",  border:"rgba(22,163,74,0.3)"  },
};

function DashboardFancy() {
  const navigate    = useNavigate();
  const username    = getUsername();
  const role        = getRole();

  const [darkMode,         setDarkMode]         = useState(true);
  const [activeTab,        setActiveTab]         = useState("monitor");
  const [collapsed,        setCollapsed]         = useState(false);
  const [currentTime,      setCurrentTime]       = useState(new Date().toLocaleTimeString());
  const [data,             setData]              = useState([]);
  const [history,          setHistory]           = useState({});
  const [search,           setSearch]            = useState("");
  const [riskFilter,       setRiskFilter]        = useState("ALL");
  const [selectedPatient,  setSelectedPatient]   = useState(null);
  const [patientHistory,   setPatientHistory]    = useState([]);
  const [loadingHistory,   setLoadingHistory]    = useState(false);
  const [lastUpdated,      setLastUpdated]       = useState(null);
  const [fetchError,       setFetchError]        = useState("");

  const getHeaders = () => ({
    Authorization: `Bearer ${getToken()}`
  });

  // Clock
  useEffect(() => {
    const t = setInterval(() =>
      setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch health data every 3 seconds
  const fetchData = useCallback(async () => {
    try {
      setFetchError("");
      const res = await axios.get(
        "http://localhost:8080/api/health/data",
        { headers: getHeaders() }
      );
      const newData = res.data || [];
      setData(newData);
      setLastUpdated(new Date().toLocaleTimeString());

      setHistory(prev => {
        const updated = { ...prev };
        newData.forEach(p => {
          const prev2 = updated[p.patientId]
            ? [...updated[p.patientId]] : [];
          updated[p.patientId] = [
            ...prev2,
            {
              time: new Date().toLocaleTimeString(),
              heartRate: p.heartRate,
              temperature: p.temperature,
            }
          ].slice(-15);
        });
        return updated;
      });
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate("/");
      }
      setFetchError("Failed to fetch patient data.");
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleLogout = async () => { await logout(); navigate("/"); };

  const openPatientModal = async (patient) => {
    setSelectedPatient(patient);
    setLoadingHistory(true);
    try {
      const res = await axios.get(
        `http://localhost:8080/api/health/data/patient/${patient.patientId}`,
        { headers: getHeaders() }
      );
      setPatientHistory(
        res.data.map(e => ({
          time: new Date(e.timestamp).toLocaleTimeString(),
          heartRate: e.heartRate,
          temperature: e.temperature,
        })).reverse()
      );
    } catch {
      setPatientHistory(history[patient.patientId] || []);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getPrediction = (patientId) => {
    const h = history[patientId];
    if (!h || h.length < 3) return false;
    const last = h[h.length - 1];
    const prev = h[h.length - 2];
    return last.heartRate > prev.heartRate &&
           last.temperature > prev.temperature;
  };

  const filtered = data.filter(p => {
    const matchSearch = p.patientId?.toString().includes(search);
    const matchRisk   = riskFilter === "ALL" || getRisk(p) === riskFilter;
    return matchSearch && matchRisk;
  });

  const total    = data.length;
  const critical = data.filter(p => getRisk(p) === "HIGH").length;
  const medium   = data.filter(p => getRisk(p) === "MEDIUM").length;
  const normal   = data.filter(p => getRisk(p) === "LOW").length;

  // ── THEME TOKENS ──
  const T = darkMode ? {
    bg:            "#020617",
    sidebar:       "rgba(15,23,42,0.97)",
    sidebarBorder: "rgba(255,255,255,0.07)",
    card:          "rgba(15,23,42,0.75)",
    cardBorder:    "rgba(255,255,255,0.07)",
    topbar:        "rgba(2,6,23,0.92)",
    text:          "#f1f5f9",
    textSecond:    "#cbd5e1",
    subtext:       "#64748b",
    input:         "rgba(15,23,42,0.9)",
    inputBorder:   "rgba(148,163,184,0.2)",
    inputColor:    "#e2e8f0",
    rowDiv:        "rgba(255,255,255,0.05)",
    modalBg:       "#0f172a",
    timeChip:      "rgba(30,41,59,0.9)",
    timeChipBorder:"rgba(255,255,255,0.08)",
    timeColor:     "#94a3b8",
    toggleBg:      "rgba(30,41,59,0.9)",
    toggleBorder:  "rgba(255,255,255,0.1)",
    toggleColor:   "#e2e8f0",
    statChange:    "#4ade80",
    patientCard:   "rgba(20,30,55,0.8)",
    patientBorder: "rgba(255,255,255,0.07)",
    RS: RISK_DARK,
  } : {
    bg:            "#eef2ff",
    sidebar:       "rgba(255,255,255,0.98)",
    sidebarBorder: "rgba(0,0,0,0.09)",
    card:          "rgba(255,255,255,0.95)",
    cardBorder:    "rgba(0,0,0,0.09)",
    topbar:        "rgba(255,255,255,0.97)",
    text:          "#0f172a",
    textSecond:    "#1e293b",
    subtext:       "#475569",
    input:         "rgba(241,245,249,1)",
    inputBorder:   "rgba(0,0,0,0.15)",
    inputColor:    "#0f172a",
    rowDiv:        "rgba(0,0,0,0.05)",
    modalBg:       "#ffffff",
    timeChip:      "rgba(241,245,249,1)",
    timeChipBorder:"rgba(0,0,0,0.12)",
    timeColor:     "#334155",
    toggleBg:      "rgba(241,245,249,1)",
    toggleBorder:  "rgba(0,0,0,0.12)",
    toggleColor:   "#1e293b",
    statChange:    "#15803d",
    patientCard:   "rgba(255,255,255,0.95)",
    patientBorder: "rgba(0,0,0,0.09)",
    RS: RISK_LIGHT,
  };

  // ── SHARED HELPERS ──
  const card = (children, extra = {}) => (
    <div style={{
      background: T.card, border:`1px solid ${T.cardBorder}`,
      borderRadius:16, padding:"1.8rem",
      backdropFilter:"blur(12px)",
      transition:"background 0.4s, border 0.4s",
      ...extra,
    }}>{children}</div>
  );

  const sectionHead = (title, sub, right) => (
    <div style={{
      display:"flex", alignItems:"flex-start",
      justifyContent:"space-between",
      marginBottom:"1.5rem", gap:"1rem", flexWrap:"wrap",
    }}>
      <div>
        <div style={{fontSize:"1.1rem", fontWeight:700, color:T.text}}>
          {title}
        </div>
        {sub && (
          <div style={{fontSize:"0.8rem", color:T.subtext, marginTop:3}}>
            {sub}
          </div>
        )}
      </div>
      {right}
    </div>
  );

  const statCard = (icon, value, label, change, accent, valueColor) => (
    <div style={{
      background: T.card, border:`1px solid ${T.cardBorder}`,
      borderRadius:16, padding:"1.5rem",
      display:"flex", alignItems:"center", gap:"1rem",
      backdropFilter:"blur(10px)",
      position:"relative", overflow:"hidden",
      transition:"all 0.2s ease",
    }}>
      <div style={{
        position:"absolute", top:0, left:0, right:0,
        height:3, background:accent,
        borderRadius:"16px 16px 0 0",
      }}/>
      <div style={{
        fontSize:"1.8rem", width:52, height:52,
        background: darkMode
          ? "rgba(124,58,237,0.15)"
          : "rgba(124,58,237,0.1)",
        borderRadius:12,
        display:"flex", alignItems:"center",
        justifyContent:"center", flexShrink:0,
      }}>{icon}</div>
      <div>
        <div style={{
          fontSize:"1.9rem", fontWeight:800, lineHeight:1,
          color: valueColor || "transparent",
          background: valueColor ? "none"
            : "linear-gradient(90deg,#7c3aed,#06b6d4)",
          WebkitBackgroundClip: valueColor ? "none" : "text",
          WebkitTextFillColor: valueColor ? valueColor : "transparent",
        }}>{value}</div>
        <div style={{
          fontSize:"0.82rem", color:T.text,
          fontWeight:600, marginTop:4,
        }}>{label}</div>
        <div style={{
          fontSize:"0.74rem", color:T.statChange, marginTop:2,
        }}>{change}</div>
      </div>
    </div>
  );

  const riskBadge = (risk) => {
    const rs = T.RS[risk];
    return (
      <span style={{
        background:rs.bg, border:`1px solid ${rs.border}`,
        color:rs.color, padding:"3px 11px",
        borderRadius:20, fontSize:"0.72rem", fontWeight:700,
      }}>{risk}</span>
    );
  };

  const alertBox = (msg, type) => (
    <div style={{
      background: type === "error"
        ? darkMode ? "rgba(220,38,38,0.12)" : "rgba(220,38,38,0.08)"
        : darkMode ? "rgba(34,197,94,0.12)" : "rgba(22,163,74,0.08)",
      color: type === "error"
        ? darkMode ? "#fca5a5" : "#b91c1c"
        : darkMode ? "#86efac" : "#15803d",
      border: type === "error"
        ? darkMode ? "1px solid rgba(220,38,38,0.25)"
                   : "1px solid rgba(220,38,38,0.3)"
        : darkMode ? "1px solid rgba(34,197,94,0.25)"
                   : "1px solid rgba(22,163,74,0.3)",
      padding:"10px 14px", borderRadius:10,
      fontSize:"0.85rem", marginBottom:"1rem", fontWeight:500,
    }}>
      {type === "error" ? "⚠️" : "✅"} {msg}
    </div>
  );

  const PAGE_TITLES = {
    monitor:  { title:"Live Monitor",    sub:"Real-time patient vitals — auto-refreshes every 3 seconds" },
    history:  { title:"Patient History", sub:"Full recorded history per patient from health_data table"  },
    stats:    { title:"Statistics",      sub:"Summary of all patient readings"                           },
    settings: { title:"Settings",        sub:"Dashboard configuration"                                   },
  };

  return (
    <div style={{
      display:"flex", minHeight:"100vh",
      background: T.bg, color: T.text,
      fontFamily:"'Segoe UI',Tahoma,Geneva,Verdana,sans-serif",
      position:"relative", overflow:"hidden",
      transition:"background 0.4s ease",
    }}>

      {/* Blobs */}
      {[
        {w:500,h:500,c:"#7c3aed",t:-150,r:-100},
        {w:400,h:400,c:"#06b6d4",b:-100,l:200},
      ].map((b,i) => (
        <div key={i} style={{
          position:"fixed",
          width:b.w, height:b.h,
          background:b.c, borderRadius:"50%",
          filter:"blur(90px)",
          opacity: darkMode ? 0.07 : 0.06,
          top:b.t, right:b.r,
          bottom:b.b, left:b.l,
          pointerEvents:"none",
        }}/>
      ))}

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: collapsed ? 70 : 260, minHeight:"100vh",
        background: T.sidebar,
        borderRight:`1px solid ${T.sidebarBorder}`,
        display:"flex", flexDirection:"column",
        position:"fixed", top:0, left:0, zIndex:100,
        transition:"width 0.3s ease",
        backdropFilter:"blur(24px)",
        boxShadow: darkMode
          ? "2px 0 20px rgba(0,0,0,0.3)"
          : "2px 0 20px rgba(0,0,0,0.08)",
      }}>

        {/* Brand */}
        <div style={{
          display:"flex", alignItems:"center", gap:"0.8rem",
          padding:"1.4rem 1.2rem",
          borderBottom:`1px solid ${T.sidebarBorder}`,
          overflow:"hidden",
        }}>
          <span style={{
            fontSize:"1.5rem",
            background:"linear-gradient(135deg,#7c3aed,#06b6d4)",
            borderRadius:10, padding:"0.4rem 0.5rem",
            boxShadow:"0 4px 14px rgba(124,58,237,0.4)",
            flexShrink:0,
          }}>🏥</span>
          {!collapsed && (
            <span style={{
              fontSize:"1rem", fontWeight:700,
              background:"linear-gradient(90deg,#a78bfa,#38bdf8)",
              WebkitBackgroundClip:"text",
              WebkitTextFillColor:"transparent",
              whiteSpace:"nowrap",
            }}>UbuzimaTrack</span>
          )}
        </div>

        {/* Collapse */}
        <button onClick={() => setCollapsed(!collapsed)} style={{
          position:"absolute", top:"1.3rem", right:"-14px",
          width:28, height:28,
          background:"linear-gradient(135deg,#7c3aed,#4f46e5)",
          border:"none", borderRadius:"50%",
          color:"white", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:"0.8rem", fontWeight:700,
          boxShadow:"0 4px 12px rgba(124,58,237,0.45)",
          zIndex:101,
        }}>
          {collapsed ? "›" : "‹"}
        </button>

        {/* User info */}
        <div style={{
          display:"flex", alignItems:"center", gap:"0.8rem",
          padding:"1rem 1.2rem",
          borderBottom:`1px solid ${T.sidebarBorder}`,
          overflow:"hidden",
        }}>
          <div style={{
            width:38, height:38,
            background:"linear-gradient(135deg,#06b6d4,#7c3aed)",
            borderRadius:"50%",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"1rem", fontWeight:700, color:"white", flexShrink:0,
            boxShadow:"0 4px 10px rgba(6,182,212,0.35)",
          }}>
            {username?.[0]?.toUpperCase() || "U"}
          </div>
          {!collapsed && (
            <div>
              <div style={{
                fontSize:"0.88rem", fontWeight:700, color:T.text,
              }}>{username}</div>
              <div style={{
                fontSize:"0.72rem", color:"#38bdf8", fontWeight:500,
              }}>
                <FaUserShield style={{marginRight:4, fontSize:"0.65rem"}} />
                {role}
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{
          flex:1, padding:"0.8rem 0.6rem",
          display:"flex", flexDirection:"column", gap:"0.25rem",
          overflowY:"auto",
        }}>
          {NAV_ITEMS.map(item => {
            const active = activeTab === item.id;
            return (
              <button key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={collapsed ? item.label : ""}
                style={{
                  display:"flex", alignItems:"center", gap:"0.9rem",
                  padding:"0.75rem 0.9rem", borderRadius:10,
                  cursor:"pointer",
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
                  fontSize:"0.9rem", fontWeight: active ? 600 : 500,
                  width:"100%", textAlign:"left",
                  whiteSpace:"nowrap", overflow:"hidden",
                  transition:"all 0.2s ease",
                }}>
                <span style={{
                  fontSize:"1.1rem", flexShrink:0,
                  width:22, textAlign:"center",
                }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{
          padding:"0.8rem 0.6rem",
          borderTop:`1px solid ${T.sidebarBorder}`,
        }}>
          <button onClick={handleLogout} style={{
            display:"flex", alignItems:"center", gap:"0.9rem",
            padding:"0.75rem 0.9rem", borderRadius:10,
            cursor:"pointer",
            border: darkMode
              ? "1px solid rgba(239,68,68,0.2)"
              : "1px solid rgba(220,38,38,0.2)",
            background: darkMode
              ? "rgba(239,68,68,0.1)"
              : "rgba(220,38,38,0.06)",
            color: darkMode ? "#fca5a5" : "#b91c1c",
            fontSize:"0.9rem", fontWeight:600,
            width:"100%", textAlign:"left",
            whiteSpace:"nowrap", overflow:"hidden",
            transition:"all 0.2s ease",
          }}>
            <FaSignOutAlt style={{
              fontSize:"1rem", flexShrink:0, width:22,
            }}/>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{
        flex:1,
        marginLeft: collapsed ? 70 : 260,
        transition:"margin-left 0.3s ease",
        display:"flex", flexDirection:"column",
        minHeight:"100vh",
      }}>

        {/* Topbar */}
        <div style={{
          display:"flex", alignItems:"center",
          justifyContent:"space-between",
          padding:"1rem 2rem",
          background: T.topbar,
          borderBottom:`1px solid ${T.sidebarBorder}`,
          backdropFilter:"blur(20px)",
          position:"sticky", top:0, zIndex:50,
          transition:"background 0.4s",
          boxShadow: darkMode
            ? "0 2px 20px rgba(0,0,0,0.3)"
            : "0 2px 20px rgba(0,0,0,0.07)",
        }}>
          <div>
            <div style={{
              fontSize:"1.25rem", fontWeight:700, color:T.text,
            }}>
              {PAGE_TITLES[activeTab].title}
            </div>
            <div style={{
              fontSize:"0.78rem", color:T.subtext, marginTop:2,
            }}>
              {PAGE_TITLES[activeTab].sub}
            </div>
          </div>

          {/* Right: toggle → clock → role badge */}
          <div style={{display:"flex", alignItems:"center", gap:"0.75rem"}}>

            {/* Dark/Light toggle */}
            <button onClick={() => setDarkMode(!darkMode)} style={{
              display:"flex", alignItems:"center", gap:6,
              padding:"7px 14px", borderRadius:50,
              cursor:"pointer",
              border:`1px solid ${T.toggleBorder}`,
              background: T.toggleBg,
              color: T.toggleColor,
              fontSize:"0.82rem", fontWeight:600,
              transition:"all 0.3s ease",
              boxShadow: darkMode
                ? "0 2px 8px rgba(0,0,0,0.3)"
                : "0 2px 8px rgba(0,0,0,0.1)",
              whiteSpace:"nowrap",
            }}>
              <span>{darkMode ? "☀️" : "🌙"}</span>
              <span>{darkMode ? "Light" : "Dark"}</span>
            </button>

            {/* Clock */}
            <span style={{
              fontSize:"0.85rem", color:T.timeColor,
              background: T.timeChip,
              padding:"7px 14px", borderRadius:8,
              border:`1px solid ${T.timeChipBorder}`,
              fontWeight:500, whiteSpace:"nowrap",
            }}>🕐 {currentTime}</span>

            {/* Role badge */}
            <span style={{
              background:"linear-gradient(135deg,#06b6d4,#7c3aed)",
              color:"white", padding:"6px 16px",
              borderRadius:20, fontSize:"0.75rem",
              fontWeight:700, letterSpacing:"0.5px",
              boxShadow:"0 4px 12px rgba(6,182,212,0.35)",
              display:"flex", alignItems:"center", gap:6,
            }}>
              <FaUserShield style={{fontSize:"0.75rem"}}/> {role}
            </span>
          </div>
        </div>

        {/* Page content */}
        <div style={{
          flex:1, padding:"2rem",
          display:"flex", flexDirection:"column", gap:"2rem",
        }}>

          {fetchError && alertBox(fetchError, "error")}

          {/* Critical alert banner */}
          {critical > 0 && activeTab === "monitor" && (
            <div style={{
              background:"linear-gradient(90deg,#ef4444,#f97316)",
              padding:"12px 20px", borderRadius:12,
              display:"flex", alignItems:"center", gap:10,
              color:"white", fontWeight:700, fontSize:"0.95rem",
              boxShadow:"0 4px 20px rgba(239,68,68,0.4)",
              animation:"pulse 1.5s ease-in-out infinite",
            }}>
              <FaExclamationTriangle />
              {critical} Critical Patient{critical > 1 ? "s" : ""} Detected — Immediate Attention Required!
            </div>
          )}

          {/* ── LIVE MONITOR ── */}
          {activeTab === "monitor" && (<>

            {/* Stat cards */}
            <div style={{
              display:"grid",
              gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
              gap:"1.2rem",
            }}>
              {statCard("🧑‍⚕️", total,    "Total Patients", "All loaded records",          "linear-gradient(90deg,#7c3aed,#06b6d4)")}
              {statCard("✅",    normal,   "Normal",         "Low risk patients",            "linear-gradient(90deg,#22c55e,#06b6d4)", darkMode ? "#86efac" : "#15803d")}
              {statCard("⚠️",    medium,   "Medium Risk",    "Needs monitoring",             "linear-gradient(90deg,#f59e0b,#fbbf24)", darkMode ? "#fcd34d" : "#b45309")}
              {statCard("🚨",    critical, "Critical",       "Immediate attention needed",   "linear-gradient(90deg,#ef4444,#f97316)", darkMode ? "#fca5a5" : "#b91c1c")}
            </div>

            {card(<>
              {sectionHead(
                "Patient Cards",
                lastUpdated ? `Last updated: ${lastUpdated}` : "Loading...",
                <div style={{display:"flex", gap:"0.75rem",
                  alignItems:"center", flexWrap:"wrap"}}>
                  {/* Search */}
                  <div style={{position:"relative"}}>
                    <FaSearch style={{
                      position:"absolute", left:10, top:"50%",
                      transform:"translateY(-50%)",
                      color:T.subtext, fontSize:"0.8rem",
                    }}/>
                    <input
                      placeholder="Patient ID..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{
                        padding:"8px 12px 8px 30px",
                        borderRadius:8,
                        border:`1px solid ${T.inputBorder}`,
                        background: T.input, color: T.inputColor,
                        fontSize:"0.85rem", outline:"none", width:140,
                      }}
                    />
                  </div>
                  {/* Risk filter */}
                  {["ALL","HIGH","MEDIUM","LOW"].map(r => (
                    <button key={r} onClick={() => setRiskFilter(r)} style={{
                      padding:"6px 12px", borderRadius:8,
                      cursor:"pointer", fontSize:"0.76rem", fontWeight:600,
                      border:`1px solid ${riskFilter === r
                        ? "#7c3aed" : T.inputBorder}`,
                      background: riskFilter === r
                        ? darkMode
                          ? "rgba(124,58,237,0.22)"
                          : "rgba(109,40,217,0.12)"
                        : T.input,
                      color: riskFilter === r
                        ? darkMode ? "#c4b5fd" : "#6d28d9"
                        : T.subtext,
                    }}>{r}</button>
                  ))}
                  {/* Manual refresh */}
                  <button onClick={fetchData} style={{
                    padding:"7px 14px",
                    background:"linear-gradient(135deg,#7c3aed,#4f46e5)",
                    color:"white", border:"none", borderRadius:8,
                    cursor:"pointer", fontSize:"0.82rem",
                    fontWeight:600, display:"flex",
                    alignItems:"center", gap:6,
                  }}>
                    <FaSyncAlt style={{fontSize:"0.75rem"}}/> Refresh
                  </button>
                </div>
              )}

              {/* Patient cards grid */}
              {filtered.length === 0 ? (
                <div style={{
                  textAlign:"center", color:T.subtext,
                  padding:"3rem", fontSize:"0.95rem",
                }}>
                  {data.length === 0
                    ? "No patient data found."
                    : "No patients match your filter."}
                </div>
              ) : (
                <div style={{
                  display:"grid",
                  gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",
                  gap:"1.2rem",
                }}>
                  {filtered.map(p => {
                    const risk      = getRisk(p);
                    const rs        = T.RS[risk];
                    const predicted = getPrediction(p.patientId);

                    const borderColor = {
                      HIGH:   darkMode ? "#fca5a5" : "#b91c1c",
                      MEDIUM: darkMode ? "#fcd34d" : "#b45309",
                      LOW:    darkMode ? "#86efac" : "#15803d",
                    }[risk];

                    return (
                      <div key={p.id || p.patientId}
                        onClick={() => openPatientModal(p)}
                        style={{
                          background: T.patientCard,
                          border:`1px solid ${T.patientBorder}`,
                          borderLeft:`4px solid ${borderColor}`,
                          borderRadius:14, padding:"1.2rem",
                          cursor:"pointer",
                          backdropFilter:"blur(12px)",
                          transition:"transform 0.2s, box-shadow 0.2s",
                          boxShadow: predicted
                            ? `0 0 20px rgba(251,191,36,${darkMode ? 0.4 : 0.3})`
                            : darkMode
                              ? "0 4px 20px rgba(0,0,0,0.3)"
                              : "0 4px 20px rgba(0,0,0,0.08)",
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = "translateY(-4px)";
                          e.currentTarget.style.boxShadow =
                            `0 12px 30px rgba(0,0,0,${darkMode ? 0.5 : 0.15})`;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = predicted
                            ? `0 0 20px rgba(251,191,36,${darkMode ? 0.4 : 0.3})`
                            : darkMode
                              ? "0 4px 20px rgba(0,0,0,0.3)"
                              : "0 4px 20px rgba(0,0,0,0.08)";
                        }}
                      >
                        {/* Patient header */}
                        <div style={{
                          display:"flex", justifyContent:"space-between",
                          alignItems:"center", marginBottom:"0.8rem",
                        }}>
                          <div style={{
                            fontWeight:700, fontSize:"1rem", color:T.text,
                          }}>
                            Patient {p.patientId}
                          </div>
                          {riskBadge(risk)}
                        </div>

                        {/* Vitals */}
                        <div style={{
                          display:"grid", gridTemplateColumns:"1fr 1fr",
                          gap:"0.5rem", marginBottom:"0.8rem",
                        }}>
                          <div style={{
                            background: darkMode
                              ? "rgba(239,68,68,0.1)"
                              : "rgba(220,38,38,0.07)",
                            borderRadius:8, padding:"0.6rem",
                            display:"flex", alignItems:"center", gap:6,
                          }}>
                            <FaHeart style={{
                              color: darkMode ? "#fca5a5" : "#b91c1c",
                              fontSize:"0.9rem",
                            }}/>
                            <div>
                              <div style={{
                                fontSize:"1rem", fontWeight:700,
                                color: p.heartRate > 100
                                  ? darkMode ? "#fca5a5" : "#b91c1c"
                                  : T.text,
                              }}>{p.heartRate}</div>
                              <div style={{
                                fontSize:"0.68rem", color:T.subtext,
                              }}>bpm</div>
                            </div>
                          </div>
                          <div style={{
                            background: darkMode
                              ? "rgba(251,191,36,0.1)"
                              : "rgba(217,119,6,0.07)",
                            borderRadius:8, padding:"0.6rem",
                            display:"flex", alignItems:"center", gap:6,
                          }}>
                            <FaThermometerHalf style={{
                              color: darkMode ? "#fcd34d" : "#b45309",
                              fontSize:"0.9rem",
                            }}/>
                            <div>
                              <div style={{
                                fontSize:"1rem", fontWeight:700,
                                color: p.temperature > 37.5
                                  ? darkMode ? "#fcd34d" : "#b45309"
                                  : T.text,
                              }}>{p.temperature}</div>
                              <div style={{
                                fontSize:"0.68rem", color:T.subtext,
                              }}>°C</div>
                            </div>
                          </div>
                        </div>

                        {/* Timestamp */}
                        {p.timestamp && (
                          <div style={{
                            fontSize:"0.74rem", color:T.subtext,
                            marginBottom:"0.6rem",
                          }}>
                            🕐 {new Date(p.timestamp).toLocaleTimeString()}
                          </div>
                        )}

                        {/* Mini chart */}
                        <div style={{
                          background: darkMode
                            ? "rgba(0,0,0,0.2)"
                            : "rgba(0,0,0,0.03)",
                          borderRadius:8, padding:"4px",
                          marginBottom:"0.6rem",
                        }}>
                          <ResponsiveContainer width="100%" height={55}>
                            <LineChart data={history[p.patientId] || []}>
                              <Line
                                type="monotone"
                                dataKey="heartRate"
                                stroke={darkMode ? "#a78bfa" : "#7c3aed"}
                                dot={false} strokeWidth={2}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Prediction */}
                        {predicted && (
                          <div style={{
                            background: darkMode
                              ? "rgba(251,191,36,0.12)"
                              : "rgba(217,119,6,0.1)",
                            border:`1px solid rgba(251,191,36,${darkMode ? 0.25 : 0.3})`,
                            color: darkMode ? "#fcd34d" : "#92400e",
                            padding:"5px 10px", borderRadius:8,
                            fontSize:"0.76rem", fontWeight:600,
                            marginBottom:"0.6rem",
                          }}>
                            ⚠️ Risk Rising — Vitals Trending Up
                          </div>
                        )}

                        {/* ECG */}
                        <div style={{
                          background: darkMode
                            ? "rgba(0,255,204,0.04)"
                            : "rgba(124,58,237,0.04)",
                          borderRadius:8, padding:6,
                        }}>
                          <ECGChart isAlert={risk === "HIGH"} />
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </>)}
          </>)}

          {/* ── PATIENT HISTORY ── */}
          {activeTab === "history" && card(<>
            {sectionHead(
              "Patient History",
              "Select a patient from Live Monitor to view full history"
            )}
            <div style={{
              textAlign:"center", color:T.subtext,
              padding:"3rem", fontSize:"0.95rem",
            }}>
              📋 Click any patient card in <strong
                style={{color: darkMode ? "#c4b5fd" : "#6d28d9",
                  cursor:"pointer"}}
                onClick={() => setActiveTab("monitor")}>
                Live Monitor
              </strong> to open their full history.
            </div>
          </>)}

          {/* ── STATISTICS ── */}
          {activeTab === "stats" && (<>
            <div style={{
              display:"grid",
              gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
              gap:"1.2rem",
            }}>
              {statCard("🧑‍⚕️", total,    "Total Patients",  "All records in health_data", "linear-gradient(90deg,#7c3aed,#06b6d4)")}
              {statCard("✅",    normal,   "Normal Patients", "Low risk",                   "linear-gradient(90deg,#22c55e,#06b6d4)", darkMode ? "#86efac" : "#15803d")}
              {statCard("⚠️",    medium,   "Medium Risk",     "heartRate>100 or temp>37.5", "linear-gradient(90deg,#f59e0b,#fbbf24)", darkMode ? "#fcd34d" : "#b45309")}
              {statCard("🚨",    critical, "Critical",        "heartRate>120 or temp>39",   "linear-gradient(90deg,#ef4444,#f97316)", darkMode ? "#fca5a5" : "#b91c1c")}
            </div>

            {card(<>
              {sectionHead("Risk Breakdown", "Based on current readings")}
              {data.length === 0 ? (
                <div style={{textAlign:"center",color:T.subtext,padding:"2rem"}}>
                  No data available.
                </div>
              ) : (
                <div style={{display:"flex", flexDirection:"column", gap:"1rem"}}>
                  {[
                    { label:"High Risk",   count:critical, color:"#ef4444", rgb:"239,68,68"   },
                    { label:"Medium Risk", count:medium,   color:"#f59e0b", rgb:"245,158,11"  },
                    { label:"Low Risk",    count:normal,   color:"#22c55e", rgb:"34,197,94"   },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{
                        display:"flex", justifyContent:"space-between",
                        marginBottom:6,
                      }}>
                        <span style={{
                          fontSize:"0.88rem", fontWeight:600, color:T.text,
                        }}>{item.label}</span>
                        <span style={{
                          fontSize:"0.88rem", color:T.subtext,
                        }}>
                          {item.count} / {total} (
                            {total > 0
                              ? Math.round((item.count/total)*100)
                              : 0}%)
                        </span>
                      </div>
                      <div style={{
                        height:10, borderRadius:10,
                        background: darkMode
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.06)",
                        overflow:"hidden",
                      }}>
                        <div style={{
                          height:"100%",
                          width: total > 0
                            ? `${(item.count/total)*100}%`
                            : "0%",
                          background: item.color,
                          borderRadius:10,
                          transition:"width 0.6s ease",
                        }}/>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>)}
          </>)}

          {/* ── SETTINGS ── */}
          {activeTab === "settings" && card(<>
            {sectionHead("Settings", "Dashboard configuration")}
            <div style={{
              display:"flex", flexDirection:"column",
              gap:"1rem", maxWidth:500,
            }}>
              {[
                {rgb:"124,58,237", label:"Logged in as", value: username  },
                {rgb:"6,182,212",  label:"Role",         value: role       },
                {rgb:"22,163,74",  label:"Refresh Rate", value:"Every 3 seconds (Live Monitor)"},
                {rgb:"245,158,11", label:"Backend API",  value:"http://localhost:8080"},
                {rgb:"239,68,68",  label:"Database",     value:"PostgreSQL — healthdb"},
              ].map(item => (
                <div key={item.label} style={{
                  background:`rgba(${item.rgb},${darkMode ? 0.1 : 0.07})`,
                  border:`1px solid rgba(${item.rgb},${darkMode ? 0.22 : 0.2})`,
                  borderRadius:12, padding:"1.2rem",
                }}>
                  <div style={{fontWeight:700, marginBottom:4, color:T.text}}>
                    {item.label}
                  </div>
                  <div style={{color:T.subtext, fontSize:"0.9rem"}}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </>)}

        </div>
      </main>

      {/* ── PATIENT DETAIL MODAL ── */}
      {selectedPatient && (
        <div style={{
          position:"fixed", inset:0,
          background:"rgba(0,0,0,0.65)",
          backdropFilter:"blur(6px)", zIndex:200,
          display:"flex", alignItems:"center",
          justifyContent:"center", padding:"1rem",
        }} onClick={() => setSelectedPatient(null)}>
          <div style={{
            background: T.modalBg,
            border:`1px solid ${T.cardBorder}`,
            borderRadius:20, padding:"2rem",
            width:"100%", maxWidth:580,
            maxHeight:"85vh", overflowY:"auto",
            boxShadow:"0 30px 70px rgba(0,0,0,0.5)",
          }} onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={{
              display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:"1.5rem",
            }}>
              <div>
                <div style={{
                  fontSize:"1.2rem", fontWeight:700, color:T.text,
                }}>
                  Patient {selectedPatient.patientId}
                </div>
                <div style={{
                  fontSize:"0.78rem", color:T.subtext, marginTop:3,
                }}>
                  Full vitals and history
                </div>
              </div>
              <button onClick={() => setSelectedPatient(null)} style={{
                background:"none", border:"none",
                color: darkMode ? "#94a3b8" : "#64748b",
                cursor:"pointer", fontSize:"1.3rem",
                padding:4,
              }}>
                <FaTimes />
              </button>
            </div>

            {/* Current vitals */}
            <div style={{
              display:"grid", gridTemplateColumns:"1fr 1fr",
              gap:"0.75rem", marginBottom:"1.5rem",
            }}>
              {[
                {
                  icon:<FaHeart/>,
                  label:"Heart Rate",
                  value:`${selectedPatient.heartRate} bpm`,
                  alert: selectedPatient.heartRate > 100,
                  alertColor: darkMode ? "#fca5a5" : "#b91c1c",
                  bg: darkMode ? "rgba(239,68,68,0.1)" : "rgba(220,38,38,0.07)",
                },
                {
                  icon:<FaThermometerHalf/>,
                  label:"Temperature",
                  value:`${selectedPatient.temperature} °C`,
                  alert: selectedPatient.temperature > 37.5,
                  alertColor: darkMode ? "#fcd34d" : "#b45309",
                  bg: darkMode ? "rgba(251,191,36,0.1)" : "rgba(217,119,6,0.07)",
                },
              ].map(v => (
                <div key={v.label} style={{
                  background: v.bg, borderRadius:10,
                  padding:"0.9rem",
                }}>
                  <div style={{
                    display:"flex", alignItems:"center", gap:6,
                    color: v.alert ? v.alertColor : T.subtext,
                    fontSize:"0.82rem", marginBottom:4,
                  }}>
                    {v.icon} {v.label}
                  </div>
                  <div style={{
                    fontSize:"1.4rem", fontWeight:700,
                    color: v.alert ? v.alertColor : T.text,
                  }}>{v.value}</div>
                </div>
              ))}
              <div style={{
                gridColumn:"1/-1",
                background: darkMode
                  ? "rgba(124,58,237,0.1)"
                  : "rgba(109,40,217,0.07)",
                borderRadius:10, padding:"0.9rem",
                display:"flex", justifyContent:"space-between",
                alignItems:"center",
              }}>
                <div>
                  <div style={{
                    fontSize:"0.82rem", color:T.subtext, marginBottom:4,
                  }}>Risk Level</div>
                  {riskBadge(getRisk(selectedPatient))}
                </div>
                {selectedPatient.timestamp && (
                  <div style={{
                    fontSize:"0.8rem", color:T.subtext, textAlign:"right",
                  }}>
                    🕐 {new Date(selectedPatient.timestamp).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* History chart */}
            <div style={{
              fontWeight:700, fontSize:"0.95rem",
              color:T.text, marginBottom:"0.75rem",
            }}>📈 Full History</div>
            {loadingHistory ? (
              <div style={{
                textAlign:"center", color:T.subtext, padding:"2rem",
              }}>Loading history...</div>
            ) : (
              <div style={{
                background: darkMode
                  ? "rgba(0,0,0,0.2)"
                  : "rgba(0,0,0,0.03)",
                borderRadius:10, padding:"0.75rem",
                marginBottom:"1.5rem",
              }}>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={patientHistory}>
                    <XAxis dataKey="time"
                      tick={{fontSize:9, fill:T.subtext}}/>
                    <YAxis tick={{fontSize:9, fill:T.subtext}}/>
                    <Tooltip
                      contentStyle={{
                        background: T.modalBg,
                        border:`1px solid ${T.cardBorder}`,
                        borderRadius:8,
                        color:T.text,
                      }}
                    />
                    <Line dataKey="heartRate" stroke="#ef4444"
                      name="Heart Rate" dot={false} strokeWidth={2}/>
                    <Line dataKey="temperature" stroke="#3b82f6"
                      name="Temperature" dot={false} strokeWidth={2}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ECG */}
            <div style={{
              fontWeight:700, fontSize:"0.95rem",
              color:T.text, marginBottom:"0.75rem",
            }}>💓 ECG Monitor</div>
            <div style={{
              background: darkMode
                ? "rgba(0,255,204,0.04)"
                : "rgba(124,58,237,0.04)",
              borderRadius:10, padding:8,
              marginBottom:"1.5rem",
            }}>
              <ECGChart
                isAlert={getRisk(selectedPatient) === "HIGH"}
                fullWidth
              />
            </div>

            {/* Close */}
            <button onClick={() => setSelectedPatient(null)} style={{
              width:"100%", padding:"12px",
              background:"linear-gradient(135deg,#7c3aed,#4f46e5)",
              color:"white", border:"none", borderRadius:10,
              fontSize:"0.95rem", fontWeight:600,
              cursor:"pointer",
              boxShadow:"0 6px 20px rgba(124,58,237,0.35)",
            }}>Close</button>

          </div>
        </div>
      )}

      {/* Pulse animation for critical banner */}
      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1; }
          50%      { opacity:0.85; }
        }
      `}</style>

    </div>
  );
}

export default DashboardFancy;