// 匯入 React 狀態 Hook 與路由導覽。
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
// 匯入共用 API 呼叫函式。
import { apiRequest } from "../api.js";
import { useLanguage } from "../language.jsx";

// 顯示獨立註冊頁，建立帳號後導向登入頁。
export default function RegisterPage() {
  // 保存註冊欄位、伺服器錯誤與載入狀態。
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  // 將新帳號資料送到 FastAPI。
  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiRequest("/auth/register", { method: "POST", body: JSON.stringify(form) });
      navigate("/login", { replace: true, state: { notice: "Account created successfully. Please log in." } });
    } catch (registerError) {
      setError(registerError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="workspace-section auth-page">
      <div className="auth-layout">
        <div className="auth-panel">
          <p className="eyebrow eyebrow-dark">CREATE AN ACCOUNT</p>
          <h1>{t("Join the character archive")}</h1>
          <p className="auth-intro">{t("Create an account to contribute and manage your character entries.")}</p>
          {error && <p className="page-alert" role="alert">{error}</p>}
          <form onSubmit={handleSubmit}>
            <label className="field-label">{t("Username")}
              <input required minLength="1" maxLength="100" autoComplete="name" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
            </label>
            <label className="field-label">{t("Email address")}
              <input required type="email" maxLength="100" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
            <label className="field-label">{t("Password")} <small>{t("At least 8 characters")}</small>
              <input required type="password" minLength="8" maxLength="128" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            </label>
            <button className="button button-red auth-submit" type="submit" disabled={busy}>{busy ? t("Creating account…") : t("Create account")}</button>
          </form>
          <p className="auth-switch-line">{t("Already have an account?")} <Link to="/login">{t("Back to login ↗")}</Link></p>
        </div>
        <aside className="auth-aside register-aside">
          <span className="aside-symbol" aria-hidden="true">✳</span>
          <p className="eyebrow">{t("CONTRIBUTE TO THE ARCHIVE")}</p>
          <h2>{t("Start with a name,")}<br />{t("and give a legend a record.")}</h2>
          <p>{t("Create an account to add characters, upload portraits, and maintain your contributions.")}</p>
          <span className="aside-caption">{t("TOUHOU PROJECT · COMMUNITY ARCHIVE")}</span>
        </aside>
      </div>
    </section>
  );
}
