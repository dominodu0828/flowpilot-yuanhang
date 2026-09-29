import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { languageFromCookie } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "FlowPilot 远航 · 合规跨境支付智能体",
  description: "面向中泰跨境小微商户的合规支付智能体：意图解析、路径比价、汇率时机建议、收款方风险筛查与策略闸门。",
};

export const viewport: Viewport = { themeColor: "#13294B", maximumScale: 5 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const language = languageFromCookie((await cookies()).get("flowpilot_lang")?.value);
  const htmlLang = language === "en" ? "en" : language === "zh-TW" ? "zh-Hant" : "zh-Hans";
  return <html lang={htmlLang}><body><div aria-hidden className="pointer-events-none fixed inset-0 -z-10" style={{ background: "radial-gradient(70rem 40rem at 50% -10%, rgba(31,158,137,0.10), transparent 60%), radial-gradient(50rem 30rem at 90% 100%, rgba(232,176,74,0.07), transparent 65%)" }} />{children}</body></html>;
}
