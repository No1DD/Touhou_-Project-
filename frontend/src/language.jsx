import React, { createContext, useContext, useEffect, useState } from "react";
import { getSavedLanguage, translateMessage } from "./translations.js";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(getSavedLanguage);

  useEffect(() => {
    window.localStorage.setItem("touhou-project-language", language);
    document.documentElement.lang = language === "en" ? "en" : "zh-Hant";
    document.title = language === "en"
      ? "touhou_「Project」 | Gensokyo Character Archive"
      : "touhou_「Project」 | 幻想鄉角色資料庫";
  }, [language]);

  const value = {
    language,
    setLanguage,
    t: (text, values) => translateMessage(text, language, values),
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
