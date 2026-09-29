// 匯入 React 載入狀態 Hook。
import React, { useEffect, useState } from "react";
// 匯入 Recharts 長條圖元件。
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
// 匯入共用 API 呼叫工具。
import { apiRequest } from "../api.js";

// 顯示全站公開資料統計和熱門來源作品。
export default function StatisticsPage() {
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
  if (loading) return <section className="workspace-section stats-page"><p className="page-state">正在整理全站資料…</p></section>;
  // 顯示統計 API 錯誤。
  if (error) return <section className="workspace-section stats-page"><p className="page-alert" role="alert">{error}</p></section>;

  // 建立頁面統計卡片清單。
  const metrics = [
    { label: "角色總數", value: stats.characters, note: "公開角色名錄" },
    { label: "資料庫成員", value: stats.users, note: "已建立帳號" },
    { label: "角色收藏", value: stats.favorites, note: "社群收藏次數" },
    { label: "近 30 天新增", value: stats.new_characters_30_days, note: "最近投稿角色" },
  ];

  return (
    <section className="workspace-section stats-page">
      <header className="stats-heading">
        <div>
          <p className="eyebrow eyebrow-dark">GENSOKYO DATA REPORT</p>
          <h1>全站統計</h1>
          <p>角色名錄與社群收藏的資料概況。</p>
        </div>
        <span className="stats-heading-mark" aria-hidden="true">統計<br />報告</span>
      </header>
      <div className="stats-metric-grid">
        {metrics.map((metric, index) => (
          <article className="stats-metric" key={metric.label} style={{ "--metric-index": index }}>
            <p>{metric.label}</p>
            <strong>{Number(metric.value).toLocaleString("zh-TW")}</strong>
            <span>{metric.note}</span>
          </article>
        ))}
      </div>
      <section className="stats-chart-panel">
        <header>
          <div><p className="eyebrow eyebrow-dark">WORK DISTRIBUTION</p><h2>來源作品排行</h2></div>
          <span>TOP {stats.top_sources.length}</span>
        </header>
        {stats.top_sources.length ? (
          <div className="source-chart">
            <ResponsiveContainer width="100%" height={Math.max(280, stats.top_sources.length * 52)}>
              <BarChart data={stats.top_sources} layout="vertical" margin={{ top: 8, right: 28, left: 12, bottom: 8 }}>
                <CartesianGrid stroke="#eee8e2" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: "#8a8180", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: "#403a3d", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#f7eee9" }} formatter={(value) => [`${value} 位角色`, "角色數"]} />
                <Bar dataKey="count" name="角色數" fill="#c83239" radius={[0, 6, 6, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="stats-empty"><span>誌</span><p>還沒有來源作品資料，新增角色後就會出現在這裡。</p></div>
        )}
      </section>
      <p className="stats-footnote">統計資料即時取自目前資料庫；近 30 天以角色建立時間計算。</p>
    </section>
  );
}
