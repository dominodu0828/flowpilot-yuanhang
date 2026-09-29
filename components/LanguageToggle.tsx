"use client";

import { useState } from "react";
import type { Language } from "@/lib/i18n";

export default function LanguageToggle({ language }: { language: Language }) {
  const [busy, setBusy] = useState(false);
  function toggle() {
    if (busy) return;
    setBusy(true);
    const next: Language = language === "en" ? "zh-CN" : language === "zh-CN" ? "zh-TW" : "en";
    document.cookie = `flowpilot_lang=${next}; path=/; max-age=31536000; samesite=lax`;
    window.localStorage.setItem("flowpilot_lang", next);
    window.location.reload();
  }
  const label = language === "en" ? "简" : language === "zh-CN" ? "繁" : "EN";
  const nextLabel = language === "en" ? "切换到简体中文" : language === "zh-CN" ? "切换到繁体中文" : "Switch to English";
  return <button type="button" onClick={toggle} disabled={busy} className="pressable material-chip shrink-0 rounded-full px-2.5 py-1 text-[0.7rem] font-medium text-label-2 hover:text-label disabled:opacity-50" aria-label={nextLabel} title={nextLabel}>{label}</button>;
}
