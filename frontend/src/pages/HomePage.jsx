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
import { useLanguage } from "../language.jsx";

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
  const { language, t } = useLanguage();
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
          <p className="eyebrow">{t("TOUHOU PROJECT · FAN DATABASE")}</p>
          <h1>{t("Discover the")}<br /><em>{t("Gensokyo Wiki.")}</em></h1>
          <p className="intro-copy">{t("Characters, abilities, and their stories.")}<Link className="hero-stats-link" to="/statistics">{t("View site statistics ↗")}</Link></p>
          <form className="hero-search" onSubmit={(event) => event.preventDefault()} role="search">
            <span aria-hidden="true">⌕</span>
            <input aria-label={t("Search characters, abilities, or works")} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={t("Search character or ability...")} />
            <button type="submit">{t("SEARCH")}</button>
          </form>
          <div className="hero-meta">
            <div className="intro-count"><span>{String(total).padStart(2, "0")}</span> {t("CHARACTERS FOUND")}</div>
            <a href="#archive">{t("BROWSE ARCHIVE")} <span aria-hidden="true">↓</span></a>
          </div>
        </div>
        <div className="hero-artwork">
          <div className="hero-art-frame">
            <span className="art-stamp">{language === "en" ? <>GEN<br />SOKYO</> : <>幻想<br />郷</>}</span>
            <img src={`${import.meta.env.BASE_URL}touhou-character.png`} alt={t("A Touhou-inspired pixel character illustration")} />
          </div>
          <p>{t("CHARACTER ARCHIVE · {number}", { number: "001" })}</p>
        </div>
      </section>
      <section className="archive-section" id="archive">
        <div className="section-heading">
          <div>
            <p className="eyebrow eyebrow-dark">{t("THE ARCHIVE")}</p>
            <h2>{t("Character archive / {count}", { count: total })}</h2>
          </div>
          {user ? <Link className="button button-red" to="/characters/new">＋ {t("Add character")}</Link> : <Link className="button button-quiet" to="/register">{t("Join the archive")}</Link>}
        </div>
        <div className="archive-toolbar">
          <p>{t("Showing {start}–{end} of {total} characters", { start: rangeStart, end: rangeEnd, total })}</p>
          <div className="segmented-control" role="group" aria-label={t("Character list loading mode")}>
            <button type="button" className={displayMode === "pages" ? "selected" : ""} aria-pressed={displayMode === "pages"} onClick={() => changeDisplayMode("pages")}>{t("Pages")}</button>
            <button type="button" className={displayMode === "infinite" ? "selected" : ""} aria-pressed={displayMode === "infinite"} onClick={() => changeDisplayMode("infinite")}>{t("Infinite scroll")}</button>
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
          {!loading && characters.length === 0 && <div className="empty-state"><span>{language === "en" ? "A" : "記"}</span><h3>{search ? t("No matching characters") : t("The archive is empty")}</h3><p>{user ? t("Add the first character to start building the archive.") : t("Log in to add characters and avatars.")}</p></div>}
        </div>
        {loading && <p className="page-state">{t("Loading the character archive…")}</p>}
        {displayMode === "pages" && total > PAGE_SIZE && (
          <nav className="pagination-controls" aria-label={t("Character archive pagination")}>
            <button className="button button-quiet" type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>{t("Previous")}</button>
            <span>{t("Page {page} of {pages}", { page, pages: pageCount })}</span>
            <button className="button button-quiet" type="button" disabled={page >= pageCount || loading} onClick={() => setPage((current) => current + 1)}>{t("Next")}</button>
          </nav>
        )}
        {displayMode === "infinite" && <div className="infinite-sentinel" ref={sentinelRef}>{loading && characters.length > 0 ? t("Loading more characters…") : hasMore ? t("Scroll to explore more") : characters.length > 0 ? t("All characters shown") : ""}</div>}
      </section>
    </>
  );
}
