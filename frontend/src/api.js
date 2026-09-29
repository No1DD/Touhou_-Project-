// 從環境變數取得 FastAPI 網址；未設定時使用本機預設網址。
import { getSavedLanguage, translateApiError } from "./translations.js";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// 封裝 fetch，統一加入 JSON 格式並解析 FastAPI 錯誤訊息。
export async function apiRequest(path, options = {}) {
  // 複製呼叫端的標頭，避免修改原物件。
  const headers = new Headers(options.headers || {});
  // JSON 請求預設使用 application/json；FormData 由瀏覽器設定 multipart boundary。
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  // 呼叫 FastAPI。
  const response = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: "include" });
  // 將回應解析成 JSON；無內容的回應使用空物件。
  const result = await response.json().catch(() => ({}));
  // 非成功狀態時轉成易讀的 JavaScript 錯誤。
  if (!response.ok) {
    const language = getSavedLanguage();
    const detail = Array.isArray(result.detail)
      ? result.detail.map((item) => translateApiError(item.msg, language)).join(language === "en" ? ", " : "、")
      : translateApiError(result.detail, language);
    throw new Error(detail || (language === "en" ? `Server error (${response.status})` : `伺服器錯誤 (${response.status})`));
  }
  // 回傳 API 資料給頁面元件。
  return result;
}
