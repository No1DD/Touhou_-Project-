// 匯入 React 狀態、副作用和 DOM 參照 Hooks。
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
// 匯入 API helper 和角色卡片。
import { apiRequest } from "../api.js";
import CharacterCard from "../components/CharacterCard.jsx";
// 匯入登入狀態以顯示適合的首頁操作。
import { useAuth } from "../auth.jsx";
// 匯入登入者收藏清單與切換操作。
import useFavorites from "../hooks/useFavorites.js";

// 控制列表一次從伺服器載入的角色數量。
const PAGE_SIZE = 12;

// 顯示公開角色名錄與即時搜尋。
export default function HomePage() {
  // 分開保存搜尋輸入和已套用搜尋，避免每個按鍵都發出 API 請求。
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  // 保存目前模式、頁碼、總數和後端回傳的角色。
  const [displayMode, setDisplayMode] = useState("pages");
  const [page, setPage] = useState(1);
  const [characters, setCharacters] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // 觀察列表底部來觸發無限捲動，並避免同時送出多個下一頁請求。
  const sentinelRef = useRef(null);
  const loadingMoreRef = useRef(false);
  // 首頁 CTA 依使用者登入狀態前往不同頁面。
  const { user } = useAuth();
  const { favorites, loading: favoritesLoading, pendingId, error: favoriteError, toggleFavorite } = useFavorites();

  // 使用短暫延遲合併連續輸入，減少搜尋 API 請求。
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
      loadingMoreRef.current = false;
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // 搜尋、頁碼或呈現模式變更時只載入所需分頁。
  useEffect(() => {
    let active = true;
    const offset = (page - 1) * PAGE_SIZE;
    const query = new URLSearchParams({ search, offset: String(offset), limit: String(PAGE_SIZE) });
    setLoading(true);
    setError("");
    apiRequest(`/characters/page?${query.toString()}`)
      .then((result) => {
        if (!active) return;
        setCharacters((current) => displayMode === "infinite" && page > 1 ? [...current, ...result.items] : result.items);
        setTotal(result.total);
        setHasMore(result.has_more);
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => {
        if (active) {
          setLoading(false);
          loadingMoreRef.current = false;
        }
      });
    return () => { active = false; };
  }, [search, page, displayMode]);

  // 無限捲動模式快到列表底部時自動讀取下一頁。
  useEffect(() => {
    if (displayMode !== "infinite" || !hasMore || loading || !sentinelRef.current) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !loadingMoreRef.current) {
        loadingMoreRef.current = true;
        setPage((current) => current + 1);
      }
    }, { rootMargin: "320px 0px" });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [displayMode, hasMore, loading, page, characters.length]);

  // 切換呈現方式時從第一頁重新開始，避免混合不同載入策略的列表狀態。
  function changeDisplayMode(nextMode) {
    setDisplayMode(nextMode);
    setPage(1);
    loadingMoreRef.current = false;
  }

  // 頁碼模式的總頁數和目前顯示範圍。
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : displayMode === "infinite" ? 1 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = displayMode === "infinite" ? characters.length : Math.min(page * PAGE_SIZE, total);

  return (
    <>
      <section className="intro" id="top">
        <div className="hero-copy">
          <p className="eyebrow">TOUHOU PROJECT · FAN DATABASE</p>
          <h1>Discover the<br /><em>Gensokyo Wiki.</em></h1>
          <p className="intro-copy">探索角色、能力與她們的故事。<Link className="hero-stats-link" to="/statistics">查看全站統計 ↗</Link></p>
          <form className="hero-search" onSubmit={(event) => event.preventDefault()} role="search">
            <span aria-hidden="true">⌕</span>
            <input aria-label="搜尋角色、能力或作品" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search character or ability..." />
            <button type="submit">SEARCH</button>
          </form>
          <div className="hero-meta">
            <div className="intro-count"><span>{String(total).padStart(2, "0")}</span> CHARACTERS FOUND</div>
            <a href="#archive">BROWSE ARCHIVE <span aria-hidden="true">↓</span></a>
          </div>
        </div>
        <div className="hero-artwork">
          <div className="hero-art-frame">
            <span className="art-stamp">幻想<br />郷</span>
            <img src="/touhou-character.png" alt="東方風格像素角色插圖" />
          </div>
          <p>CHARACTER ARCHIVE <span>／ 001</span></p>
        </div>
      </section>
      <section className="archive-section" id="archive">
        <div className="section-heading">
          <div>
            <p className="eyebrow eyebrow-dark">THE ARCHIVE</p>
            <h2>角色名錄 <span>／ {total}</span></h2>
          </div>
          {user ? <Link className="button button-red" to="/characters/new">＋ 新增角色</Link> : <Link className="button button-quiet" to="/register">加入資料庫</Link>}
        </div>
        <div className="archive-toolbar">
          <p>顯示 {rangeStart}–{rangeEnd}，共 {total} 位角色</p>
          <div className="segmented-control" role="group" aria-label="角色列表載入方式">
            <button type="button" className={displayMode === "pages" ? "selected" : ""} aria-pressed={displayMode === "pages"} onClick={() => changeDisplayMode("pages")}>分頁</button>
            <button type="button" className={displayMode === "infinite" ? "selected" : ""} aria-pressed={displayMode === "infinite"} onClick={() => changeDisplayMode("infinite")}>無限捲動</button>
          </div>
        </div>
        {(error || favoriteError) && <p className="page-alert" role="alert">{error || favoriteError}</p>}
        <div className="character-grid">
          {characters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              favorited={favorites.some((favorite) => favorite.id === character.id)}
              favoriteBusy={favoritesLoading || pendingId === character.id}
              onFavorite={toggleFavorite}
            />
          ))}
          {!loading && characters.length === 0 && <div className="empty-state"><span>記</span><h3>{search ? "沒有符合的角色" : "名錄尚無資料"}</h3><p>{user ? "新增第一筆角色資料，開始建立名錄。" : "登入後即可新增角色與頭像。"}</p></div>}
        </div>
        {loading && <p className="page-state">正在讀取角色名錄…</p>}
        {displayMode === "pages" && total > PAGE_SIZE && (
          <nav className="pagination-controls" aria-label="角色名錄分頁">
            <button className="button button-quiet" type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>上一頁</button>
            <span>第 {page} / {pageCount} 頁</span>
            <button className="button button-quiet" type="button" disabled={page >= pageCount || loading} onClick={() => setPage((current) => current + 1)}>下一頁</button>
          </nav>
        )}
        {displayMode === "infinite" && <div className="infinite-sentinel" ref={sentinelRef}>{loading && characters.length > 0 ? "正在載入更多角色…" : hasMore ? "繼續向下瀏覽" : characters.length > 0 ? "已顯示全部角色" : ""}</div>}
      </section>
    </>
  );
}
