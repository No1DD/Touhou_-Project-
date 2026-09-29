// 匯入 React 狀態 Hook 和頁面連結元件。
import React, { useState } from "react";
import { Link } from "react-router-dom";
// 匯入目前登入者資料。
import { useAuth } from "../auth.jsx";
// 匯入 API 網址以載入資料庫頭像。
import { API_URL } from "../api.js";
import { useLanguage } from "../language.jsx";

// 顯示角色頭像；沒有圖片時使用角色名稱首字替代。
export function CharacterAvatar({ character, large = false }) {
  const { t } = useLanguage();
  // 記錄圖片是否載入失敗。
  const [failed, setFailed] = useState(false);
  // 根據顯示大小組合頭像樣式。
  const className = `character-avatar${large ? " character-avatar-large" : ""}`;
  // 優先從 Cloudinary 載入新圖片，舊資料則沿用 FastAPI 的 BLOB 端點。
  const imageUrl = character.avatar_url || `${API_URL}/characters/${character.id}/avatar`;
  // 有頭像時顯示對應圖片來源。
  if (character.has_avatar && !failed) {
    return <img className={className} src={imageUrl} alt={`${character.character_name} ${t("Avatar")}`} onError={() => setFailed(true)} />;
  }
  // 沒有頭像或載入失敗時顯示首字圖案。
  return <div className={`${className} avatar-fallback`} aria-label={`${character.character_name} ${t("Avatar")}`}>{character.character_name.slice(0, 1)}</div>;
}

// 以愛心按鈕顯示並切換角色收藏狀態。
export function FavoriteButton({ favorited, busy = false, onClick }) {
  const { t } = useLanguage();
  // 已收藏時使用實心愛心和明確狀態文字。
  return (
    <button
      className={`favorite-button${favorited ? " is-favorited" : ""}`}
      type="button"
      aria-label={favorited ? t("Remove favorite") : t("Add to favorites")}
      aria-pressed={favorited}
      title={favorited ? t("Remove favorite") : t("Add to favorites")}
      disabled={busy}
      onClick={onClick}
    >
      <span aria-hidden="true">{favorited ? "♥" : "♡"}</span>
      {favorited ? t("Favorited") : t("Favorite")}
    </button>
  );
}

// 顯示名錄或個人主頁中的角色摘要卡片。
export default function CharacterCard({ character, favorited = false, favoriteBusy = false, onFavorite, onDelete }) {
  const { t } = useLanguage();
  // 目前登入者可操作自己建立的角色。
  const { user } = useAuth();
  const isOwner = user?.id === character.created_by;
  return (
    <article className="character-card">
      <div className="card-topline">
        <CharacterAvatar character={character} />
        <span className="card-index">NO. {String(character.id).padStart(3, "0")}</span>
      </div>
      <div className="card-content">
        <h3><Link to={`/characters/${character.id}`}>{character.character_name}</Link></h3>
        <p className="ability-line">{character.abilities || t("Ability not recorded")}</p>
        <p className="origin-line">{character.tags?.filter((tag) => tag.kind === "work").map((tag) => tag.name).join("\u3001") || t("Source not recorded")}</p>
        {character.tags?.length > 0 && (
          <div className="character-tags" aria-label={t("Character tags")}>
            {character.tags.map((tag) => <span className={`tag-chip tag-chip-${tag.kind}`} key={tag.id}>{tag.name}</span>)}
          </div>
        )}
        {character.biography && <p className="biography-preview">{character.biography}</p>}
      </div>
      <div className="card-actions">
        <Link to={`/characters/${character.id}`}>{t("View details")}</Link>
        {user && onFavorite && <FavoriteButton favorited={favorited} busy={favoriteBusy} onClick={() => onFavorite(character)} />}
        {isOwner && <Link to={`/characters/${character.id}/edit`}>{t("Edit")}</Link>}
        {isOwner && onDelete && <button className="delete-action" onClick={() => onDelete(character)}>{t("Delete")}</button>}
      </div>
    </article>
  );
}
