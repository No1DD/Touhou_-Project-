// 匯入 React 延遲載入與 fallback 容器。
import React, { lazy, Suspense } from "react";
import { useLanguage } from "../language.jsx";

// 把 Recharts 雷達圖獨立成按需載入的 chunk，減少非詳情頁初始下載。
const AbilityRadarChart = lazy(() => import("./AbilityRadar.jsx"));

// 提供雷達圖共用的 lazy-loading 狀態。
export default function LazyAbilityRadar(props) {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<div className="chart-loading" aria-label={t("Loading ability chart")} />}>
      <AbilityRadarChart {...props} />
    </Suspense>
  );
}
