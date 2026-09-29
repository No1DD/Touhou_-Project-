// 匯入 React Context 與狀態 Hooks。
import React, { createContext, useContext, useEffect, useState } from "react";
// 匯入共用 API 呼叫函式。
import { apiRequest } from "./api.js";

// 建立全站共用的登入狀態。
const AuthContext = createContext(null);

// 提供 token、使用者資料、登入與登出操作。
export function AuthProvider({ children }) {
  // 保存目前登入者資料。
  const [user, setUser] = useState(null);
  // 首次驗證 token 時顯示載入狀態。
  const [loading, setLoading] = useState(true);

  // 初次載入或 token 改變時向後端驗證使用者。
  useEffect(() => {
    // 避免元件卸載後更新 React 狀態。
    let active = true;
    // 清除先前版本留下的 localStorage token，改由 HttpOnly Cookie 管理登入。
    localStorage.removeItem("character-db-token");
    // 由瀏覽器自動附上的 HttpOnly Cookie 還原登入者。
    apiRequest("/auth/me")
      .then((profile) => { if (active) setUser(profile); })
      .catch(() => {
        // Cookie 過期或尚未登入時顯示訪客狀態。
        if (active) setUser(null);
      })
      .finally(() => { if (active) setLoading(false); });
    // 元件卸載時取消後續狀態更新。
    return () => { active = false; };
  }, []);

  // 驗證帳密，由後端以 HttpOnly Cookie 保存登入 session。
  async function login(email, password) {
    // OAuth2 password flow 使用表單格式傳送登入資料。
    const form = new URLSearchParams({ username: email, password });
    await apiRequest("/auth/login", {
      method: "POST",
      body: form,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    // 使用剛設定的 HttpOnly Cookie 讀取使用者資料。
    const profile = await apiRequest("/auth/me");
    setUser(profile);
    return profile;
  }

  // 通知後端刪除 HttpOnly Cookie，並清除前端使用者狀態。
  async function logout() {
    await apiRequest("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  }

  // 將共用登入資料傳給所有頁面。
  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

// 讓頁面元件讀取登入 Context。
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth 必須在 AuthProvider 內使用");
  return context;
}
