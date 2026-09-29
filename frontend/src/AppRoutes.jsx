// 匯入 React 延遲載入功能和 React Router 頁面路由工具。
import React, { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
// 匯入全站登入狀態與共用版面。
import { AuthProvider, useAuth } from "./auth.jsx";
import { useLanguage, LanguageProvider } from "./language.jsx";
import SiteLayout from "./components/SiteLayout.jsx";
// 匯入每一個獨立功能頁。
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import CharacterDetailPage from "./pages/CharacterDetailPage.jsx";
import CharacterFormPage from "./pages/CharacterFormPage.jsx";

// 統計頁和圖表只在使用者進入時載入，縮小首頁初始 bundle。
const StatisticsPage = lazy(() => import("./pages/StatisticsPage.jsx"));
// 關係網包含 Canvas 力導向圖，只在使用者開啟該頁時載入。
const RelationshipGraphPage = lazy(() => import("./pages/RelationshipGraphPage.jsx"));

// 保護需要登入的頁面，並記住登入後應返回的路徑。
function RequireAuth({ children }) {
  // 取得使用者登入狀態和目前網址。
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  // 等待保存的 token 驗證完成，避免閃回登入頁。
  if (loading) return <section className="workspace-section"><p className="page-state">{t("Checking your session…")}</p></section>;
  // 未登入時導到登入頁，登入完成可回到原頁。
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  // 已登入者可瀏覽受保護頁面。
  return children;
}

// 集中註冊前端各功能的獨立網址。
function AppRoutes() {
  const { t } = useLanguage();
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="statistics" element={<Suspense fallback={<section className="workspace-section"><p className="page-state">{t("Loading statistics…")}</p></section>}><StatisticsPage /></Suspense>} />
        <Route path="relationships" element={<Suspense fallback={<section className="workspace-section"><p className="page-state">{t("Loading relationship map…")}</p></section>}><RelationshipGraphPage /></Suspense>} />
        <Route path="dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="characters/new" element={<RequireAuth><CharacterFormPage /></RequireAuth>} />
        <Route path="characters/:id/edit" element={<RequireAuth><CharacterFormPage /></RequireAuth>} />
        <Route path="characters/:id" element={<CharacterDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

// 顯示找不到頁面時的返回入口。
function NotFoundPage() {
  const { t } = useLanguage();
  return <section className="workspace-section"><div className="empty-state"><span>404</span><h1>{t("Page not found")}</h1><p>{t("This URL may have changed or the page does not exist.")}</p><a className="button button-red" href="/">{t("Return home")}</a></div></section>;
}

// 初始化登入狀態提供者與 HTML5 History 路由。
export default function AppRoutesRoot() {
  return <LanguageProvider><BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter></LanguageProvider>;
}
