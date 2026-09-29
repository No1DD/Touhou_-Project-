// 匯入 React 狀態 Hook 和路由工具。
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
// 匯入共用 API、登入資料與頭像元件。
import { apiRequest } from "../api.js";
import { useAuth } from "../auth.jsx";
import { CharacterAvatar, FavoriteButton } from "../components/CharacterCard.jsx";
import AbilityRadar from "../components/LazyAbilityRadar.jsx";
import useFavorites from "../hooks/useFavorites.js";
import { useLanguage } from "../language.jsx";

// 既有資料也只允許開啟一般 HTTP(S) 網址。
function safeReferenceUrl(value) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

// 顯示一位角色的完整資料，路徑為 /characters/:id。
export default function CharacterDetailPage() {
  // 從網址取得角色 ID。
  const { id } = useParams();
  // 保存角色資料、載入狀態與錯誤訊息。
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // 確認目前使用者是否為角色建立者。
  const { user } = useAuth();
  const { language, t } = useLanguage();
  // 保存 AI 關係分析操作狀態和錯誤訊息。
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const navigate = useNavigate();
  // 取得目前登入者的收藏狀態與切換操作。
  const { favorites, loading: favoritesLoading, pendingId, toggleFavorite, error: favoriteError } = useFavorites();

  // 依網址中的 ID 讀取角色資料。
  useEffect(() => {
    let active = true;
    setLoading(true);
    apiRequest(`/characters/${id}`)
      .then((result) => { if (active) setCharacter(result); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  // 請後端 AI 從資料庫候選角色中抽取關係，再開啟關係網頁。
  async function analyzeRelationships() {
    setAnalyzing(true);
    setAnalysisError("");
    try {
      await apiRequest(`/characters/${id}/analyze-relationships`, { method: "POST" });
      navigate(`/relationships?character_id=${id}`);
    } catch (requestError) {
      setAnalysisError(requestError.message);
    } finally {
      setAnalyzing(false);
    }
  }

  // 顯示載入提示。
  if (loading) return <section className="workspace-section"><p className="page-state">{t("Loading character details…")}</p></section>;
  // 顯示 API 錯誤或不存在的角色。
  if (error || !character) return <section className="workspace-section"><div className="empty-state"><span>?</span><h1>{t("Character not found")}</h1><p>{error || t("This character entry does not exist.")}</p><Link className="button button-red" to="/">{t("Character archive")}</Link></div></section>;

  const isOwner = user?.id === character.created_by;
  const isFavorited = favorites.some((favorite) => favorite.id === character.id);
  const referenceUrl = safeReferenceUrl(character.reference_url);
  const themeSongUrl = safeReferenceUrl(character.theme_song_url);
  return (
    <section className="workspace-section detail-page">
      <div className="detail-breadcrumb"><Link to="/">{t("Character archive")}</Link><span>／</span><span>{character.character_name}</span></div>
      <article className="detail-panel">
        <header className="detail-hero">
          <CharacterAvatar character={character} large />
          <div>
            <p className="eyebrow">{t("CHARACTER FILE · NO. {id}", { id: String(character.id).padStart(3, "0") })}</p>
            <h1>{character.character_name}</h1>
            <p className="detail-ability">{character.abilities || t("Ability not recorded")}</p>
            {character.tags?.length > 0 && <div className="detail-tags">{character.tags.map((tag) => <span className={`tag-chip tag-chip-${tag.kind}`} key={tag.id}>{tag.name}</span>)}</div>}
          </div>
        </header>
        <div className="detail-content">
          <section className="detail-biography">
            <p className="eyebrow eyebrow-dark">PROFILE</p>
            <h2>{t("Character profile")}</h2>
            <p>{character.biography || t("No character biography yet.")}</p>
            <div className="detail-radar-panel">
              <p className="eyebrow eyebrow-dark">ABILITY PROFILE</p>
              <h2>{t("Character abilities")}</h2>
              <AbilityRadar stats={character.stats} />
            </div>
          </section>
          <aside className="detail-facts">
            <div><span>{t("Source Work")}</span><strong>{character.tags?.filter((tag) => tag.kind === "work").map((tag) => tag.name).join("\u3001") || t("Not recorded")}</strong></div>
            <div><span>{t("Created")}</span><strong>{new Date(character.created_at).toLocaleDateString(language === "en" ? "en-US" : "zh-TW")}</strong></div>
            {referenceUrl && <a href={referenceUrl} target="_blank" rel="noopener noreferrer">{t("Open reference ↗")}</a>}
            {(character.theme_song || themeSongUrl) && <div><span>{t("Character theme song")}</span><strong>{character.theme_song || t("Track link")}</strong>{themeSongUrl && <a href={themeSongUrl} target="_blank" rel="noopener noreferrer">{t("Open track ↗")}</a>}</div>}
          </aside>
        </div>
        <footer className="detail-actions">
          <Link className="button button-quiet" to="/">← {t("Back to the character archive")}</Link>
          {user && <FavoriteButton favorited={isFavorited} busy={favoritesLoading || pendingId === character.id} onClick={() => toggleFavorite(character).catch(() => {})} />}
          {isOwner && <button className="button button-quiet" type="button" disabled={analyzing} onClick={analyzeRelationships}>{analyzing ? t("AI analysis…") : t("✳ Extract relationships with AI")}</button>}
          {isOwner && <Link className="button button-red" to={`/characters/${character.id}/edit`}>{t("Edit character")}</Link>}
        </footer>
        {favoriteError && <p className="page-alert detail-alert" role="alert">{favoriteError}</p>}
        {analysisError && <p className="page-alert detail-alert" role="alert">{analysisError}</p>}
      </article>
    </section>
  );
}
