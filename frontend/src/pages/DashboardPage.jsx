// 匯入 React 副作用與狀態 Hooks。
import React, { useEffect, useState } from "react";
// 匯入路由連結。
import { Link } from "react-router-dom";
// 匯入 API、登入者資料和角色卡片。
import { apiRequest } from "../api.js";
import { useAuth } from "../auth.jsx";
import CharacterCard from "../components/CharacterCard.jsx";
import useFavorites from "../hooks/useFavorites.js";
import { useLanguage } from "../language.jsx";

// 顯示登入使用者的個人首頁與投稿管理清單。
export default function DashboardPage() {
  // 保存目前使用者的投稿資料。
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeList, setActiveList] = useState("contributions");
  // 讀取目前登入者資料，受保護 API 使用 HttpOnly Cookie。
  const { user } = useAuth();
  const { t } = useLanguage();
  // 讀取收藏清單、收藏操作和收藏載入狀態。
  const { favorites, loading: favoritesLoading, pendingId, error: favoritesError, toggleFavorite } = useFavorites();

  // 載入由目前登入者建立的角色。
  useEffect(() => {
    let active = true;
    apiRequest("/characters/mine")
      .then((result) => { if (active) setCharacters(result); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id]);

  // 刪除使用者選定的投稿並更新清單。
  async function deleteCharacter(character) {
    if (!window.confirm(t("Delete character \"{name}\"?", { name: character.character_name }))) return;
    try {
      await apiRequest(`/characters/${character.id}`, { method: "DELETE" });
      setCharacters((current) => current.filter((item) => item.id !== character.id));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  // 依目前選取的個人清單決定要顯示的角色。
  const visibleCharacters = activeList === "favorites" ? favorites : characters;
  // 收藏和取消收藏由共用 Hook 處理錯誤及清單更新。
  function handleFavorite(character) {
    toggleFavorite(character).catch(() => {});
  }

  return (
    <section className="workspace-section dashboard-page">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow eyebrow-dark">PERSONAL DASHBOARD</p>
          <h1>{t("Hello, {name}", { name: user.username })}</h1>
          <p>{t("Manage your contributions and account.")}</p>
        </div>
        <Link className="button button-red" to="/characters/new">＋ {t("Add character")}</Link>
      </div>
      <div className="dashboard-stats">
        <div><span>{String(characters.length).padStart(2, "0")}</span><small>{t("My contributions")}</small></div>
        <div><span>{String(favorites.length).padStart(2, "0")}</span><small>{t("My favorites")}</small></div>
        <div><span>{user.email}</span><small>{t("Signed-in account")}</small></div>
      </div>
      <div className="dashboard-tabs segmented-control" role="tablist" aria-label={t("Personal character lists")}>
        <button type="button" role="tab" aria-selected={activeList === "contributions"} className={activeList === "contributions" ? "selected" : ""} onClick={() => setActiveList("contributions")}>{t("My contributions")} <span>{characters.length}</span></button>
        <button type="button" role="tab" aria-selected={activeList === "favorites"} className={activeList === "favorites" ? "selected" : ""} onClick={() => setActiveList("favorites")}>{t("My favorites")} <span>{favorites.length}</span></button>
      </div>
      <div className="section-heading dashboard-list-heading">
        <div><p className="eyebrow eyebrow-dark">{activeList === "favorites" ? t("SAVED CHARACTERS") : t("YOUR CONTRIBUTIONS")}</p><h2>{activeList === "favorites" ? t("Favorites") : t("My characters")} <span>／ {visibleCharacters.length}</span></h2></div>
      </div>
      {(error || favoritesError) && <p className="page-alert" role="alert">{error || favoritesError}</p>}
      {loading || favoritesLoading ? <p className="page-state">{t("Loading your lists…")}</p> : (
        <div className="character-grid">
          {visibleCharacters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              favorited={favorites.some((favorite) => favorite.id === character.id)}
              favoriteBusy={pendingId === character.id}
              onFavorite={handleFavorite}
              onDelete={deleteCharacter}
            />
          ))}
          {visibleCharacters.length === 0 && (
            <div className="empty-state">
              <span>{activeList === "favorites" ? t("Favorites") : t("Contributions")}</span>
              <h3>{activeList === "favorites" ? t("Your favorites list is empty") : t("You have not contributed any characters yet")}</h3>
              <p>{activeList === "favorites" ? t("Select the heart on a character card to save it here.") : t("Add your first character to start your archive.")}</p>
              <Link className="button button-red" to={activeList === "favorites" ? "/" : "/characters/new"}>{activeList === "favorites" ? t("Browse characters") : t("Add character")}</Link>
            </div>
          )}
        </div>
      )}
      <div className="dashboard-back"><Link to="/">← {t("Back to the character archive")}</Link></div>
    </section>
  );
}
