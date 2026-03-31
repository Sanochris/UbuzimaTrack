import React from "react";
import { useLanguage } from "./LanguageContext";

const LANGUAGES = [
  { code: "en", label: "EN", full: "English",     flag: "🇬🇧" },
  { code: "fr", label: "FR", full: "Français",    flag: "🇫🇷" },
  { code: "rw", label: "RW", full: "Kinyarwanda", flag: "🇷🇼" },
];

function LanguageSwitcher({ darkMode, compact = false }) {
  const { lang, switchLang } = useLanguage();

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "4px",
      background: darkMode
        ? "rgba(30,41,59,0.9)"
        : "rgba(241,245,249,1)",
      border: `1px solid ${darkMode
        ? "rgba(255,255,255,0.1)"
        : "rgba(0,0,0,0.12)"}`,
      borderRadius: 50,
      padding: "3px 6px",
    }}>
      {LANGUAGES.map(l => (
        <button
          key={l.code}
          onClick={() => switchLang(l.code)}
          title={l.full}
          style={{
            padding: compact ? "4px 8px" : "5px 10px",
            borderRadius: 50,
            border: "none",
            cursor: "pointer",
            fontSize: "0.78rem",
            fontWeight: 700,
            transition: "all 0.2s ease",
            background: lang === l.code
              ? "linear-gradient(135deg,#7c3aed,#4f46e5)"
              : "transparent",
            color: lang === l.code
              ? "white"
              : darkMode ? "#64748b" : "#475569",
            boxShadow: lang === l.code
              ? "0 2px 8px rgba(124,58,237,0.35)"
              : "none",
          }}>
          {l.flag} {l.label}
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitcher;