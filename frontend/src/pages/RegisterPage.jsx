// 匯入 React 狀態 Hook 與路由導覽。
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
// 匯入共用 API 呼叫函式。
import { apiRequest } from "../api.js";

// 顯示獨立註冊頁，建立帳號後導向登入頁。
export default function RegisterPage() {
  // 保存註冊欄位、伺服器錯誤與載入狀態。
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  // 將新帳號資料送到 FastAPI。
  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiRequest("/auth/register", { method: "POST", body: JSON.stringify(form) });
      navigate("/login", { replace: true, state: { notice: "帳號建立成功，請登入。" } });
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
          <h1>加入角色資料庫</h1>
          <p className="auth-intro">建立帳號後即可投稿並管理自己的角色資料。</p>
          {error && <p className="page-alert" role="alert">{error}</p>}
          <form onSubmit={handleSubmit}>
            <label className="field-label">使用者名稱
              <input required minLength="1" maxLength="100" autoComplete="name" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
            </label>
            <label className="field-label">電子郵件
              <input required type="email" maxLength="100" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
            <label className="field-label">密碼 <small>至少 8 個字元</small>
              <input required type="password" minLength="8" maxLength="128" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            </label>
            <button className="button button-red auth-submit" type="submit" disabled={busy}>{busy ? "建立中…" : "建立帳號"}</button>
          </form>
          <p className="auth-switch-line">已有帳號？ <Link to="/login">返回登入 ↗</Link></p>
        </div>
        <aside className="auth-aside register-aside">
          <span className="aside-symbol" aria-hidden="true">✳</span>
          <p className="eyebrow">CONTRIBUTE TO THE ARCHIVE</p>
          <h2>從名字開始，<br />讓傳說留下紀錄。</h2>
          <p>建立個人帳號後，便能新增角色、補上頭像，並持續維護自己的投稿。</p>
          <span className="aside-caption">TOUHOU PROJECT · COMMUNITY ARCHIVE</span>
        </aside>
      </div>
    </section>
  );
}
