// 匯入 React DOM 的瀏覽器掛載函式。
import React from "react";
// 匯入 createRoot，以 React 18 API 啟動前端應用程式。
import { createRoot } from "react-dom/client";
// 匯入多頁路由應用程式。
import App from "./AppRoutes.jsx";
// 匯入全站共用樣式。
import "./style.css";

// 找到 index.html 的 root 節點並建立 React 根節點。
createRoot(document.getElementById("root")).render(
  // 在 StrictMode 下執行元件，協助開發期間發現副作用問題。
  <React.StrictMode>
    {/* 顯示角色資料庫應用程式。 */}
    <App />
  </React.StrictMode>,
);
