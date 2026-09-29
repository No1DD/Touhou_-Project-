// 匯入 React 狀態 Hooks 與關係網圖元件。
import React, { useEffect, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
// 匯入路由導覽與登入狀態。
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth.jsx";
// 匯入 API 呼叫工具。
import { apiRequest } from "../api.js";

// 顯示 AI 抽取的角色關係網，節點可點擊查看角色詳情。
export default function RelationshipGraphPage() {
  // 讀取 URL 中可選的中心角色。
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCharacterId = searchParams.get("character_id") || "";
  // 保存角色選項、圖資料和頁面狀態。
  const [characters, setCharacters] = useState([]);
  const [graph, setGraph] = useState({ nodes: [], links: [], focus_id: null });
  const [selectedCharacterId, setSelectedCharacterId] = useState(initialCharacterId);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  // 追蹤圖表容器寬度，以適應不同螢幕。
  const containerRef = useRef(null);
  const [graphWidth, setGraphWidth] = useState(800);
  // 讀取目前登入者；AI API 使用 HttpOnly Cookie 驗證。
  const { user } = useAuth();
  const selectedCharacter = characters.find((character) => String(character.id) === selectedCharacterId);
  const navigate = useNavigate();

  // 載入角色選項，供使用者選擇關係網中心。
  useEffect(() => {
    let active = true;
    apiRequest("/characters/page?limit=50&offset=0")
      .then((result) => { if (active) setCharacters(result.items); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, []);

  // 依中心角色重新取得其相鄰關係，空值則顯示全站已抽取關係。
  useEffect(() => {
    let active = true;
    const query = selectedCharacterId ? `?character_id=${encodeURIComponent(selectedCharacterId)}` : "";
    setLoading(true);
    setError("");
    apiRequest(`/relationships/graph${query}`)
      .then((result) => { if (active) setGraph(result); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedCharacterId]);

  // 監聽圖表容器寬度變化，支援側欄和手機版排版。
  useEffect(() => {
    if (!containerRef.current) return undefined;
    const observer = new ResizeObserver(([entry]) => setGraphWidth(Math.max(300, Math.floor(entry.contentRect.width))));
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 從選定角色重新抽取關係並更新圖表資料。
  async function handleAnalyze() {
    if (!selectedCharacterId) return;
    setAnalyzing(true);
    setError("");
    try {
      await apiRequest(`/characters/${selectedCharacterId}/analyze-relationships`, { method: "POST" });
      const result = await apiRequest(`/relationships/graph?character_id=${selectedCharacterId}`);
      setGraph(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAnalyzing(false);
    }
  }

  // 更新目前中心角色並同步網址，讓圖表狀態可分享/重新整理。
  function handleCharacterChange(event) {
    const nextId = event.target.value;
    setSelectedCharacterId(nextId);
    setSearchParams(nextId ? { character_id: nextId } : {}, { replace: true });
  }

  return (
    <section className="workspace-section relationship-page">
      <header className="relationship-heading">
        <div>
          <p className="eyebrow eyebrow-dark">AI RELATIONSHIP MAP</p>
          <h1>角色關係網</h1>
          <p>關係由角色資料推論，僅供探索參考；可拖曳節點整理視角。</p>
        </div>
        <Link className="button button-quiet" to="/">← 返回角色名錄</Link>
      </header>
      <div className="relationship-controls">
        <label className="field-label">選擇關係圖中心角色
          <select value={selectedCharacterId} onChange={handleCharacterChange}>
            <option value="">全部已分析關係</option>
            {characters.map((character) => <option key={character.id} value={character.id}>{character.character_name}</option>)}
          </select>
        </label>
        {user && selectedCharacter && selectedCharacter.created_by === user.id && (
          <button className="button button-red" type="button" disabled={analyzing} onClick={handleAnalyze}>
            {analyzing ? "AI 分析中…" : "✳ 重新提取關係"}
          </button>
        )}
      </div>
      {error && <p className="page-alert" role="alert">{error}</p>}
      <div className="relationship-legend">
        <span><i className="legend-node" />角色</span>
        <span><i className="legend-line" />AI 推論關係</span>
        <span>{graph.nodes.length} 個角色 · {graph.links.length} 條關係</span>
      </div>
      <div className="relationship-canvas" ref={containerRef}>
        {loading ? <p className="page-state">正在載入關係網…</p> : graph.nodes.length > 0 ? (
          <ForceGraph2D
            graphData={graph}
            width={graphWidth}
            height={560}
            backgroundColor="#fffefa"
            nodeId="id"
            nodeLabel={(node) => `${node.name}${node.group ? ` · ${node.group}` : ""}`}
            nodeAutoColorBy="group"
            nodeCanvasObjectMode={() => "after"}
            nodeCanvasObject={(node, context, globalScale) => {
              const label = node.name;
              const fontSize = Math.max(10, 13 / globalScale);
              context.font = `${fontSize}px sans-serif`;
              context.textAlign = "left";
              context.textBaseline = "middle";
              context.fillStyle = "#302a30";
              context.fillText(label, node.x + 8, node.y + 1);
              if (node.id === graph.focus_id) {
                context.beginPath();
                context.arc(node.x, node.y, 7, 0, 2 * Math.PI, false);
                context.strokeStyle = "#d32f2f";
                context.lineWidth = 2 / globalScale;
                context.stroke();
              }
            }}
            linkColor={() => "rgba(183, 137, 72, .58)"}
            linkWidth={(link) => 1 + (link.confidence || 0.5) * 2}
            linkDirectionalArrowLength={5}
            linkDirectionalArrowRelPos={1}
            linkLabel={(link) => `${link.relation_type}: ${link.description || "AI 推論關係"}`}
            onNodeClick={(node) => navigate(`/characters/${node.id}`)}
            cooldownTicks={100}
            d3AlphaDecay={0.025}
          />
        ) : (
          <div className="relationship-empty">
            <span>緣</span>
            <h2>{selectedCharacterId ? "尚未有已確認的關係" : "關係網還沒有資料"}</h2>
            <p>{selectedCharacterId ? "角色建立者可從角色詳情或上方按鈕啟動 AI 關係分析。" : "前往角色詳情，使用 AI 關係分析建立第一條連線。"}</p>
            {selectedCharacterId && <Link className="button button-quiet" to={`/characters/${selectedCharacterId}`}>查看角色詳情</Link>}
          </div>
        )}
      </div>
      <p className="relationship-disclaimer">AI 結果可能不完整或不正確；每次重新分析會替換該角色先前的 AI 推論關係。</p>
    </section>
  );
}
