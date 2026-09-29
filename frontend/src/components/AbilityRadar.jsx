// 匯入 React 和 Recharts 雷達圖元件。
import React from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { useLanguage } from "../language.jsx";

// 設定雷達圖六個資料軸的中文顯示名稱。
const ABILITY_AXES = [
  { key: "power", label: "Strength" },
  { key: "defense", label: "Defense" },
  { key: "speed", label: "Speed" },
  { key: "magic", label: "Magic" },
  { key: "technique", label: "Technique" },
  { key: "luck", label: "Luck" },
];

// 顯示角色 0 至 10 分的能力值雷達圖；沒有設定時提供明確空狀態。
export default function AbilityRadar({ stats, compact = false }) {
  const { t } = useLanguage();
  // 舊角色尚未設定數值時不繪製虛構的能力分數。
  if (!stats) {
    return <div className={`radar-empty${compact ? " radar-empty-compact" : ""}`}>{t("No numeric abilities set yet")}</div>;
  }
  // 將 API 欄位轉為 Recharts 使用的 label/value 資料。
  const chartData = ABILITY_AXES.map(({ key, label }) => ({ label: t(label), value: stats[key] ?? 0 }));
  return (
    <div className={`ability-radar${compact ? " ability-radar-compact" : ""}`}>
      <ResponsiveContainer width="100%" height={compact ? 230 : 320}>
        <RadarChart data={chartData} outerRadius="70%">
          <PolarGrid stroke="#ddd4ce" />
          <PolarAngleAxis dataKey="label" tick={{ fill: "#534b50", fontSize: 12 }} />
          <PolarRadiusAxis angle={90} domain={[0, 10]} tickCount={6} tick={{ fill: "#91888a", fontSize: 9 }} axisLine={false} />
          <Radar name={t("Character ability scores")} dataKey="value" stroke="#c83139" strokeWidth={2} fill="#d94449" fillOpacity={0.27} dot={{ r: 3, fill: "#c83139" }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
