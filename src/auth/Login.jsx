import React, { useState, useEffect } from "react";
import { login, getRole } from "./AuthService";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageSwitcher from "../i18n/LanguageSwitcher";
import "./Auth.css";

function Login() {
  const { lang, t } = useLanguage();
  const [user, setUser] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  // Clock
  const [time, setTime] = useState(new Date());

  // Typewriter states
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();

  const TYPED_LINES = [
    t("typed1"),
    t("typed2"),
    t("typed3"),
    t("typed4"),
    t("typed5"),
  ];

  // Clock effect
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Reset typewriter on language change
  useEffect(() => {
    setLineIndex(0);
    setCharIndex(0);
    setDisplayed("");
    setDeleting(false);
  }, [lang]);

  // Typewriter effect
  useEffect(() => {
    const current = TYPED_LINES[lineIndex];
    let timeout;

    if (!deleting && charIndex < current.length) {
      timeout = setTimeout(() => {
        setDisplayed(current.slice(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      }, 45);
    } else if (!deleting && charIndex === current.length) {
      timeout = setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && charIndex > 0) {
      timeout = setTimeout(() => {
        setDisplayed(current.slice(0, charIndex - 1));
        setCharIndex(charIndex - 1);
      }, 25);
    } else if (deleting && charIndex === 0) {
      setDeleting(false);
      setLineIndex((lineIndex + 1) % TYPED_LINES.length);
    }

    return () => clearTimeout(timeout);
  }, [charIndex, deleting, lineIndex, lang]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(user);
      const role = getRole();
      const mustReset = localStorage.getItem("mustResetPassword");

      if (mustReset === "true") {
        navigate("/reset-password");
        return;
      }

      role === "ADMIN"
        ? navigate("/admin/dashboard")
        : navigate("/dashboard");

    } catch (err) {
      setError(t("invalidCredentials"));
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`auth-container ${darkMode ? "dark" : "light"}`}>

      {/* Background blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      {/* 🔥 TOP RIGHT CONTROLS */}
      <div
        style={{
          position: "fixed",
          top: "1.2rem",
          right: "1.5rem",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        {/* Language */}
        <LanguageSwitcher darkMode={darkMode} />

        {/* Dark/Light Toggle */}
        <button
          className="theme-toggle"
          onClick={() => setDarkMode(!darkMode)}
        >
          <span>{darkMode ? "☀️" : "🌙"}</span>
          <span>
            {darkMode ? t("lightMode") : t("darkMode")}
          </span>
        </button>

        {/* Clock */}
        <div className="topbar-time">
          {time.toLocaleTimeString()}
        </div>

        {/* Badge */}
        <div className="topbar-badge">
          UBZ
        </div>
      </div>

      {/* LEFT SIDE */}
      <div className="auth-left">
        <div className="auth-brand">
          <span className="auth-brand-icon">💙</span>
          <span className="auth-brand-name">UbuzimaTrack</span>
        </div>

        <h1 className="auth-headline">
          <span className="auth-headline-accent">Ubuzima</span><br />
          Track
        </h1>

        {/* Typewriter */}
        <div className="auth-typewriter">
          <span className="typewriter-text">{displayed}</span>
          <span className="typewriter-cursor">|</span>
        </div>

        {/* Stats */}
        <div className="auth-stats">
          <div className="auth-stat">
            <span className="auth-stat-number">99.9%</span>
            <span className="auth-stat-label">{t("uptime")}</span>
          </div>

          <div className="auth-stat-divider" />

          <div className="auth-stat">
            <span className="auth-stat-number">Real-time</span>
            <span className="auth-stat-label">{t("monitoring")}</span>
          </div>

          <div className="auth-stat-divider" />

          <div className="auth-stat">
            <span className="auth-stat-number">256-bit</span>
            <span className="auth-stat-label">{t("encryption")}</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="auth-right">
        <div className={`auth-card ${shake ? "shake" : ""}`}>

          <div className="auth-header">
            <h2>{t("welcomeBack")}</h2>
            <p>{t("signInTo")}</p>
          </div>

          {error && (
            <div className="auth-error">
              ⚠️ {error}
            </div>
          )}

          {/* Username */}
          <div className="input-group">
            <span className="input-icon">👤</span>
            <input
              type="text"
              placeholder={t("username")}
              value={user.username}
              onChange={(e) =>
                setUser({ ...user, username: e.target.value })
              }
              required
            />
          </div>

          {/* Password */}
          <div className="input-group">
            <span className="input-icon">🔒</span>
            <input
              type={showPassword ? "text" : "password"}
              placeholder={t("password")}
              value={user.password}
              onChange={(e) =>
                setUser({ ...user, password: e.target.value })
              }
              required
            />
            <span
              className="input-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>

          {/* Button */}
          <button
            className="auth-btn"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <span className="auth-spinner" />
            ) : (
              <>
                {t("signIn")} <span className="btn-arrow">→</span>
              </>
            )}
          </button>

          <div className="auth-footer">
            {t("accessRestricted")}
          </div>

        </div>
      </div>
    </div>
  );
}

export default Login;