// 匯入 React 與路由連結元件。
import React from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
// 匯入共用登入狀態。
import { useAuth } from "../auth.jsx";
import { useLanguage } from "../language.jsx";

// 提供所有頁面共用的導覽列、內容插槽和頁尾。
export default function SiteLayout() {
  // 讀取目前登入者與登出操作。
  const { user, loading, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  // 顯示共用網站框架。
  return (
    <main className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label={t("Home")}>
          <img className="brand-mark" src="/touhou-character.png" alt="" />
          <span><strong>touhou_<span className="brand-accent">「Project」</span></strong><small>{t("TOUHOU CHARACTER ARCHIVE")}</small></span>
        </Link>
        <nav className="top-nav" aria-label={t("Main navigation")}>
          <NavLink to="/" end>{t("Character archive")}</NavLink>
          <NavLink to="/statistics">{t("Site statistics")}</NavLink>
          <NavLink to="/relationships">{t("Relationship map")}</NavLink>
          {user && <NavLink to="/dashboard">{t("Dashboard")}</NavLink>}
          {user && <NavLink to="/characters/new">{t("Add character")}</NavLink>}
        </nav>
        <div className="topbar-actions">
          <div className="language-toggle" role="group" aria-label={t("Language")}>
            <button type="button" className={language === "zh" ? "selected" : ""} aria-pressed={language === "zh"} onClick={() => setLanguage("zh")}>繁中</button>
            <button type="button" className={language === "en" ? "selected" : ""} aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
          </div>
          {!loading && user ? (
            <>
              <Link className="user-label" to="/dashboard">{user.username}</Link>
              <button className="button button-quiet button-small" onClick={logout}>{t("Log out")}</button>
            </>
          ) : !loading ? (
            <>
              <Link className="button button-quiet button-small" to="/login">{t("Log in")}</Link>
              <Link className="button button-red button-small" to="/register">{t("Sign up")}</Link>
            </>
          ) : <span className="nav-loading" aria-label={t("Checking your session…")} />}
        </div>
      </header>
      <Outlet />
      <footer className="site-footer">
        <span><Link to="/">touhou_「Project」</Link><small>{t("FAN-MADE CHARACTER DATABASE")}</small></span>
        <span>FASTAPI · REACT · SQLITE</span>
      </footer>
    </main>
  );
}
