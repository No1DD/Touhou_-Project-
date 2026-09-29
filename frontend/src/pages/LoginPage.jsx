// 匯入 React 狀態 Hook 與路由導覽。
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
// 匯入登入 API 和全站登入狀態。
import { useAuth } from "../auth.jsx";
import { useLanguage } from "../language.jsx";

// 顯示獨立登入頁，登入後進入個人主頁或原先受保護頁面。
export default function LoginPage() {
  // 保存登入表單資料、錯誤和載入狀態。
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // 取得登入動作和登入後導向位置。
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const notice = location.state?.notice;

  // 驗證登入資料並導向使用者主頁。
  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="workspace-section auth-page">
      <div className="auth-layout">
        <div className="auth-panel">
          <p className="eyebrow eyebrow-dark">{t("MEMBER ACCESS")}</p>
          <h1>{t("Log in to the archive")}</h1>
          <p className="auth-intro">{t("Manage your contributions and view your dashboard.")}</p>
          {notice && <p className="page-success" role="status">{t(notice)}</p>}
          {error && <p className="page-alert" role="alert">{error}</p>}
          <form onSubmit={handleSubmit}>
            <label className="field-label">{t("Email address")}
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="field-label">{t("Password")}
              <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <button className="button button-red auth-submit" type="submit" disabled={busy}>{busy ? t("Logging in…") : t("Log in to the archive")}</button>
          </form>
          <p className="auth-switch-line">{t("No account yet?")} <Link to="/register">{t("Create an account ↗")}</Link></p>
        </div>
        <aside className="auth-aside">
          <span className="aside-symbol" aria-hidden="true">☯</span>
          <p className="eyebrow">{t("YOUR GENSOKYO ACCOUNT")}</p>
          <h2>{t("Return to Gensokyo,")}<br />{t("and keep the archive growing.")}</h2>
          <p>{t("Manage your character contributions, add abilities and stories, and help complete the archive.")}</p>
          <span className="aside-caption">{t("TOUHOU PROJECT · COMMUNITY ARCHIVE")}</span>
        </aside>
      </div>
    </section>
  );
}
