// STEP 1: Navbar component (top menu)
import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAuth, useTheme, useNotifications } from "../contexts.jsx";

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, actions } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { items } = useNotifications();

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <div className="nav">
      <Link className="brand" to="/">
        {t("appName")}
      </Link>

      <div className="nav-links">
        {user && (
          <>
            <Link to="/">{t("dashboard")}</Link>
            <Link to="/profile">{t("profile")}</Link>
            <Link to="/chat">{t("chat")}</Link>
            <Link to="/notifications">
              {t("notifications")} {unreadCount ? `(${unreadCount})` : ""}
            </Link>
          </>
        )}
      </div>

      <div className="nav-actions">
        {/* language toggle */}
        <select
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          className="select"
        >
          <option value="en">EN</option>
          <option value="hi">HI</option>
        </select>

        {/* theme toggle */}
        <button className="btn" onClick={toggleTheme}>
          {theme === "light" ? t("dark") : t("light")}
        </button>

        {/* auth buttons */}
        {!user ? (
          <>
            <Link className="btn-link" to="/login">
              {t("login")}
            </Link>
            <Link className="btn-link" to="/register">
              {t("register")}
            </Link>
          </>
        ) : (
          <button className="btn danger" onClick={actions.logout}>
            {t("logout")}
          </button>
        )}
      </div>
    </div>
  );
}

