// 匯入 React 狀態與副作用 Hooks。
import { useEffect, useState } from "react";
// 匯入 API 呼叫與登入狀態。
import { apiRequest } from "../api.js";
import { useAuth } from "../auth.jsx";

// 封裝目前登入者的收藏清單與收藏切換操作。
export default function useFavorites() {
  // 讀取目前登入者；瀏覽器透過 HttpOnly Cookie 驗證 API。
  const { user } = useAuth();
  // 保存 API 回傳的收藏角色。
  const [favorites, setFavorites] = useState([]);
  // 保存收藏資料載入狀態。
  const [loading, setLoading] = useState(false);
  // 記錄正在切換收藏的角色 ID，避免重複送出。
  const [pendingId, setPendingId] = useState(null);
  // 保存載入或操作錯誤。
  const [error, setError] = useState("");

  // 登入狀態變更時載入使用者收藏。
  useEffect(() => {
    let active = true;
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    apiRequest("/favorites")
      .then((result) => { if (active) setFavorites(result); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id]);

  // 切換單一角色收藏狀態並同步更新目前頁面的收藏資料。
  async function toggleFavorite(character) {
    if (!user) throw new Error("請先登入後再收藏角色");
    const wasFavorited = favorites.some((item) => item.id === character.id);
    setPendingId(character.id);
    setError("");
    try {
      const method = wasFavorited ? "DELETE" : "POST";
      await apiRequest(`/characters/${character.id}/favorite`, { method });
      setFavorites((current) => wasFavorited
        ? current.filter((item) => item.id !== character.id)
        : current.some((item) => item.id === character.id) ? current : [character, ...current]);
      return !wasFavorited;
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    } finally {
      setPendingId(null);
    }
  }

  // 提供清單、載入/錯誤狀態與收藏切換函式。
  return { favorites, loading, pendingId, error, toggleFavorite };
}
