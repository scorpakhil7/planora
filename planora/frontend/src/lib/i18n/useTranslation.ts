"use client";

import { useLanguage } from "./LanguageContext";
import { translations } from "./translations";

function getPath(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => (acc == null ? acc : acc[part]), obj);
}

export function useTranslation() {
  const { lang, setLang, toggleLang } = useLanguage();

  function t(key: string): string {
    const value = getPath(translations[lang], key) ?? getPath(translations.en, key);
    return typeof value === "string" ? value : key;
  }

  return { t, lang, setLang, toggleLang };
}
