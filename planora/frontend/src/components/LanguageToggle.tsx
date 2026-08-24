"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";

export default function LanguageToggle() {
  const { lang, setLang } = useTranslation();

  return (
    <div className="flex items-center bg-gray-100 rounded-full p-0.5 text-xs font-semibold">
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`px-2.5 py-1 rounded-full transition-colors ${
          lang === "en" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("hi")}
        className={`px-2.5 py-1 rounded-full transition-colors ${
          lang === "hi" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
        }`}
      >
        हिं
      </button>
    </div>
  );
}
