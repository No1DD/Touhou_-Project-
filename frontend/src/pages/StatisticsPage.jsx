// 匯入 React 載入狀態 Hook。
import React, { useEffect, useState } from "react";
// 匯入 Recharts 長條圖元件。
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
// 匯入共用 API 呼叫工具。
import { apiRequest } from "../api.js";
import { useLanguage } from "../language.jsx";

// 顯示全站公開資料統計和熱門來源作品。
export default function StatisticsPage() {
  const { language, t } = useLanguage();
  // 保存後端統計、載入狀態與錯誤訊息。
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 讀取全站聚合統計。
  useEffect(() => {
    let active = true;
    apiRequest("/stats/site")
      .then((result) => { if (active) setStats(result); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  // 顯示讀取中的頁面狀態。
  if (loading) return <section className="workspace-section stats-page"><p className="page-state">{t("Preparing site statistics…")}</p></section>;
  // 顯示統計 API 錯誤。
  if (error) return <section className="workspace-section stats-page"><p className="page-alert" role="alert">{error}</p></section>;

  // 建立頁面統計卡片清單。
  const metrics = [
      { label: t("Total Characters"), value: stats.characters, note: t("Public character archive") },
      { label: t("Community members"), value: stats.users, note: t("Registered accounts") },
      { label: t("Character favorites"), value: stats.favorites, note: t("Community saves") },
      { label: t("Added in the Last 30 Days"), value: stats.new_characters_30_days, note: t("Recently contributed characters") },
  ];

  return (
    <section className="workspace-section stats-page">
      <header className="stats-heading">
        <div>
          <p className="eyebrow eyebrow-dark">{t("GENSOKYO DATA REPORT")}</p>
            <h1>{t("Site statistics overview")}</h1>
            <p>{t("An overview of the character archive and community favorites.")}</p>
        </div>
        <span className="stats-heading-mark" aria-hidden="true">{language === "en" ? <>DATA<br />REPORT</> : <>統計<br />報告</>}</span>
      </header>
      <div className="stats-metric-grid">
        {metrics.map((metric, index) => (
          <article className="stats-metric" key={metric.label} style={{ "--metric-index": index }}>
            <p>{metric.label}</p>
            <strong>{Number(metric.value).toLocaleString(language === "en" ? "en-US" : "zh-TW")}</strong>
            <span>{metric.note}</span>
          </article>
        ))}
      </div>
      <section className="stats-chart-panel">
        <header>
          <div><p className="eyebrow eyebrow-dark">{t("WORK DISTRIBUTION")}</p><h2>{t("Popular Source Works")}</h2></div>
          <span>{t("TOP {count}", { count: stats.top_sources.length })}</span>
        </header>
        {stats.top_sources.length ? (
          <div className="source-chart">
            <ResponsiveContainer width="100%" height={Math.max(280, stats.top_sources.length * 52)}>
              <BarChart data={stats.top_sources} layout="vertical" margin={{ top: 8, right: 28, left: 12, bottom: 8 }}>
                <CartesianGrid stroke="#eee8e2" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: "#8a8180", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: "#403a3d", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "#f7eee9" }} formatter={(value) => [t("{count} characters", { count: value }), t("Character count")]} />
                <Bar dataKey="count" name={t("Character count")} fill="#c83239" radius={[0, 6, 6, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="stats-empty"><span>{language === "en" ? "DATA" : "誌"}</span><p>{t("No source works yet. Add a character to see it here.")}</p></div>
        )}
      </section>
        <p className="stats-footnote">{t("Statistics are live from the database. The 30-day count uses character creation dates.")}</p>
    </section>
  );
}
