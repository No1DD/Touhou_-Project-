// 匯入 React 與路由連結元件。
import React from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
// 匯入共用登入狀態。
import { useAuth } from "../auth.jsx";

// 提供所有頁面共用的導覽列、內容插槽和頁尾。
export default function SiteLayout() {
  // 讀取目前登入者與登出操作。
  const { user, loading, logout } = useAuth();
  // 顯示共用網站框架。
  return (
    <main className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="touhou_「Project」首頁">
          <img className="brand-mark" src="/touhou-character.png" alt="" />
          <span><strong>touhou_<span className="brand-accent">「Project」</span></strong><small>幻想鄉角色資料庫</small></span>
        </Link>
        <nav className="top-nav" aria-label="主要導覽">
          <NavLink to="/" end>角色名錄</NavLink>
          <NavLink to="/statistics">全站統計</NavLink>
          <NavLink to="/relationships">關係網</NavLink>
          {user && <NavLink to="/dashboard">個人主頁</NavLink>}
          {user && <NavLink to="/characters/new">新增角色</NavLink>}
        </nav>
        <div className="topbar-actions">
          {!loading && user ? (
            <>
              <Link className="user-label" to="/dashboard">{user.username}</Link>
              <button className="button button-quiet button-small" onClick={logout}>登出</button>
            </>
          ) : !loading ? (
            <>
              <Link className="button button-quiet button-small" to="/login">登入</Link>
              <Link className="button button-red button-small" to="/register">註冊</Link>
            </>
          ) : <span className="nav-loading" aria-label="正在確認登入狀態" />}
        </div>
      </header>
      <Outlet />
      <footer className="site-footer">
        <span><Link to="/">touhou_「Project」</Link><small>FAN-MADE CHARACTER DATABASE</small></span>
        <span>FASTAPI · REACT · SQLITE</span>
      </footer>
    </main>
  );
}
