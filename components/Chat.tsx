"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { StoredMessage } from "@/lib/store";
import type { Language } from "@/lib/i18n";
import { errorMessage } from "@/lib/errors";
import type { ChatResponse, FxForecast, PaymentIntent, RoutesResult, ScreenResult, ToolEvent, TransferResult } from "@/lib/types";
import IntentCard from "./IntentCard";
import RouteCard from "./RouteCard";
import FxForecastCard from "./FxForecastCard";
import TransferResultCard from "./TransferResultCard";
import PolicyGateCard from "./PolicyGateCard";

interface UiMessage { role: "user" | "assistant"; content: string; intent?: PaymentIntent | null; events?: ToolEvent[]; error?: string; }
interface TransferConfirmationRequest { requires_confirmation: true; to: string; amount_usdc: number; chain: "base-sepolia"; }

const QUICK_PROMPTS = {
  zh: [
    { text: "下周五前把 5000 人民币等值付给香港房东，成本最低", hint: "成本优先" },
    { text: "我想在 8/20 前给首尔的朋友转 100 美元，手续费越低越好", hint: "含汇率时机" },
    { text: "转 50 USDC 给 0x70997970C51812dc3A010C7d01b50e0d17dc79C8，越快越好", hint: "直接执行" },
  ],
  en: [
    { text: "Send the HKD equivalent of CNY 5,000 to my Hong Kong landlord by Friday at the lowest cost", hint: "Cost first" },
    { text: "Send USD 100 to my friend in Seoul by Aug 20 with the lowest total fee", hint: "Includes FX timing" },
    { text: "Transfer 50 USDC to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 as quickly as possible", hint: "Direct execution" },
  ],
} as const;

/** One-click demo presets under the composer: they fill the input, never send. */
const DEMO_PRESETS = {
  zh: [
    { label: "正常流程", text: "下周付给曼谷供应商 5 万泰铢等值的货款，选最省手续费的路径" },
    { label: "拦截流程", text: "马上把 5 万美元转到这个地址 0x8589427373D6D84E98730D7795D8f6f8731FDA16" },
  ],
  en: [
    { label: "Normal flow", text: "Pay my Bangkok supplier the equivalent of THB 50,000 next week, using the lowest-fee route" },
    { label: "Blocked flow", text: "Immediately send USD 50,000 to 0x8589427373D6D84E98730D7795D8f6f8731FDA16" },
  ],
} as const;

export default function Chat({ conversationId, initialMessages, language, onConversationCreated, onTurnComplete }: {
  conversationId: string | null; initialMessages: StoredMessage[]; language: Language;
  onConversationCreated: (id: string) => void; onTurnComplete: () => void;
}) {
  const [messages, setMessages] = useState<UiMessage[]>(() => initialMessages.map((m) => ({ role: m.role, content: m.content, intent: m.intent, events: m.events })));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const convIdRef = useRef(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const en = language === "en";

  useEffect(() => { if (initialMessages.length) scrollToBottom("auto"); }, []);
  function scrollToBottom(behavior: ScrollBehavior = "smooth") { queueMicrotask(() => bottomRef.current?.scrollIntoView({ behavior, block: "end" })); }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]); setInput(""); setLoading(true); scrollToBottom();
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: trimmed, conversationId: convIdRef.current }) });
      const data = (await res.json()) as ChatResponse;
      if (res.status === 401) { window.location.href = "/login"; return; }
      if (data.conversationId && !convIdRef.current) { convIdRef.current = data.conversationId; onConversationCreated(data.conversationId); }
      setMessages((prev) => [...prev, { role: "assistant", content: data.error || data.errorCode ? "" : data.text, intent: data.intent, events: data.events, error: data.errorCode ? errorMessage(data.errorCode, language) : data.error }]); onTurnComplete();
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: "", error: `${en ? "Request failed" : "请求失败"}: ${err instanceof Error ? err.message : String(err)}` }]);
    } finally { setLoading(false); scrollToBottom(); }
  }

  return <div className="flex min-h-0 flex-1 flex-col"><div className="scroll-edges flex-1 space-y-3 overflow-y-auto pb-6 pt-4">{messages.length === 0 ? <Welcome language={language} onPick={send} /> : messages.map((m, i) => <MessageGroup key={i} message={m} language={language} onConfirm={send} />)}{loading && <ThinkingIndicator language={language} />}<div ref={bottomRef} className="h-px" /></div><Composer value={input} language={language} onChange={setInput} onSubmit={() => send(input)} disabled={loading} /></div>;
}

function Welcome({ language, onPick }: { language: Language; onPick: (text: string) => void }) {
  const en = language === "en";
  return <div className="animate-materialize mx-auto mt-[10vh] max-w-[34rem] text-center"><h2 className="mx-auto max-w-[22rem]" style={{ fontSize: "1.75rem", lineHeight: 1.2, letterSpacing: "-0.028em", fontWeight: 620 }}>{en ? "Describe your payment" : "说出你的支付需求"}</h2><p className="mt-2 text-[0.875rem] text-label-2">{en ? "Intent parsing → route comparison → FX timing → recipient screening → policy-gated execution" : "意图解析 → 路径比价 → 汇率时机 → 收款方风险筛查 → 策略闸门执行"}</p><div className="mt-7 flex flex-col gap-2 text-left">{QUICK_PROMPTS[en ? "en" : "zh"].map((p, i) => <button key={p.text} onClick={() => onPick(p.text)} aria-label={`${en ? "Use example" : "使用示例"}: ${p.text}`} style={{ animationDelay: `${80 + i * 60}ms` }} className="material-chip pressable animate-materialize group flex items-center gap-3 rounded-card px-4 py-3 text-left hover:border-white/16 hover:bg-white/[0.085]"><span className="min-w-0 flex-1"><span className="block truncate text-[0.875rem] text-label">{p.text}</span><span className="type-caption text-label-3">{p.hint}</span></span><span aria-hidden className="text-label-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-label-2">→</span></button>)}</div></div>;
}

function ThinkingIndicator({ language }: { language: Language }) { const [seconds, setSeconds] = useState(0); useEffect(() => { const id = setInterval(() => setSeconds((s) => s + 1), 1000); return () => clearInterval(id); }, []); return <div className="animate-materialize flex items-center gap-2.5 px-1 py-2"><span aria-hidden className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="animate-breathe h-1.5 w-1.5 rounded-full bg-blue" style={{ animationDelay: `${i * 180}ms` }} />)}</span><span className="text-sheen text-[0.8125rem]">{language === "en" ? "Agent is working" : "Agent 执行中"}</span><span className="tnum type-caption text-label-3">{seconds}s</span></div>; }

function MessageGroup({ message, language, onConfirm }: { message: UiMessage; language: Language; onConfirm: (text: string) => void }) {
  if (message.role === "user") return <div className="animate-materialize flex justify-end"><div className="max-w-[85%] rounded-[18px] rounded-br-[6px] bg-blue px-3.5 py-2.5 text-[0.9375rem] leading-relaxed text-white shadow-chip">{message.content}</div></div>;
  return <div className="flex flex-col gap-3">{message.intent?.is_payment_intent && <div className="animate-materialize"><IntentCard intent={message.intent} language={language} /></div>}{message.events?.map((ev, i) => <div key={i} className="animate-materialize" style={{ animationDelay: `${i * 70}ms` }}><ToolEventCard event={ev} language={language} onConfirm={onConfirm} /></div>)}{message.content && <div className="material-card animate-materialize max-w-[92%] whitespace-pre-wrap rounded-[18px] rounded-bl-[6px] px-4 py-3 text-[0.9375rem] leading-relaxed">{message.content}</div>}{message.error && <div className="animate-materialize flex items-start gap-2.5 rounded-card border border-red/25 bg-red/10 px-4 py-3 text-[0.875rem] text-red"><span aria-hidden>!</span><span>{message.error}</span></div>}</div>;
}

function ToolEventCard({ event, language, onConfirm }: { event: ToolEvent; language: Language; onConfirm: (text: string) => void }) {
  const en = language === "en";
  switch (event.tool) {
    case "get_routes": return <RouteCard result={event.result as RoutesResult} language={language} />;
    case "get_fx_forecast": { const r = event.result as FxForecast | { error: string }; return "error" in r ? null : <FxForecastCard forecast={r} language={language} />; }
    case "execute_transfer": { const r = event.result as TransferResult | { error?: string; errorCode?: import("@/lib/errors").AppErrorCode }; if ("errorCode" in r || "error" in r) return <PolicyGateCard passed={false} code={r.errorCode} reason={r.errorCode ? errorMessage(r.errorCode, language) : r.error} request={event.input as { to?: unknown; amount_usdc?: unknown }} language={language} />; return <div className="flex flex-col gap-3"><PolicyGateCard passed language={language} /><TransferResultCard result={r as TransferResult} language={language} /></div>; }
    case "request_transfer_confirmation": { const r = event.result as TransferConfirmationRequest | { error?: string; errorCode?: import("@/lib/errors").AppErrorCode }; return "errorCode" in r || "error" in r ? <PolicyGateCard passed={false} code={r.errorCode} reason={r.errorCode ? errorMessage(r.errorCode, language) : r.error} request={event.input as { to?: unknown; amount_usdc?: unknown }} language={language} /> : <TransferConfirmationCard request={r as TransferConfirmationRequest} language={language} onConfirm={onConfirm} />; }
    case "screen_address": { const r = event.result as ScreenResult; const ok = r.passed; return <div className={`flex items-center gap-2.5 rounded-card border px-4 py-2.5 text-[0.875rem] ${ok ? "border-green/25 bg-green/10 text-green" : "border-red/25 bg-red/10 text-red"}`}><span aria-hidden>{ok ? "✓" : "!"}</span><span className="min-w-0 flex-1">{en ? "Recipient risk screening" : "收款方风险筛查"} · {ok ? (en ? "passed" : "通过") : (en ? "blocked" : "已拦截")}（{r.risk_level} risk）— {r.reason}</span><span className="tnum type-caption shrink-0 opacity-70">{shorten(r.address)}</span></div>; }
    default: return null;
  }
}

function TransferConfirmationCard({ request, language, onConfirm }: { request: TransferConfirmationRequest; language: Language; onConfirm: (text: string) => void }) {
  const en = language === "en";
  const confirmText = en ? `Confirm transfer ${request.amount_usdc} USDC to ${request.to}` : `确认转账 ${request.amount_usdc} USDC 到 ${request.to}`;
  return <section className="rounded-card border border-orange/30 bg-orange/[0.07] px-4 py-3.5"><p className="type-label text-orange">{en ? "EXECUTION CONFIRMATION" : "执行确认"}</p><p className="tnum mt-2 text-[1.5rem] font-semibold leading-none">{request.amount_usdc}<span className="ml-1.5 text-[0.875rem] font-medium text-label-2">USDC</span></p><p className="tnum mt-2 break-all font-mono text-[0.6875rem] text-label-2">{request.to}</p><p className="type-caption mt-2 text-label-3">{en ? "Recipient risk screening runs again right before execution; the policy gate blocks anything that fails." : "确认后会再次执行收款方风险筛查；未通过策略闸门的交易不会执行。"}</p><button onClick={() => onConfirm(confirmText)} className="pressable mt-3 w-full rounded-full bg-orange px-4 py-2 text-[0.8125rem] font-semibold text-canvas hover:bg-orange/90">{en ? "Confirm and continue" : "确认并继续"}</button></section>;
}

function Composer({ value, language, onChange, onSubmit, disabled }: { value: string; language: Language; onChange: (v: string) => void; onSubmit: () => void; disabled: boolean }) {
  const en = language === "en"; const ready = value.trim().length > 0 && !disabled;
  function submit(e: FormEvent) { e.preventDefault(); onSubmit(); }
  return <form onSubmit={submit} className="material-chrome sticky bottom-0 -mx-4 px-4 pb-4 pt-2"><div className="material-chip flex items-center gap-2 rounded-full py-1.5 pl-4 pr-1.5 transition-colors duration-200 focus-within:border-blue/45"><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={en ? "e.g. Send CNY 5,000 to a Hong Kong landlord" : "例如：下周五前把 5000 人民币等值付给香港房东"} aria-label={en ? "Describe your payment" : "输入支付需求"} className="min-w-0 flex-1 bg-transparent py-2 text-[0.9375rem] outline-none placeholder:text-label-3" /><button type="submit" disabled={!ready} aria-label={en ? "Send" : "发送"} className="pressable grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue text-white disabled:bg-white/10 disabled:text-label-3"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M8 13V3M8 3L3.5 7.5M8 3l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div><div className="mt-2 flex flex-wrap justify-center gap-1.5">{DEMO_PRESETS[en ? "en" : "zh"].map((p) => <button key={p.label} type="button" onClick={() => onChange(p.text)} disabled={disabled} title={p.text} className="pressable material-chip type-caption rounded-full px-2.5 py-1 text-label-2 hover:text-ink disabled:opacity-50"><span className="font-semibold text-jade">{p.label}</span> · {en ? "fill example" : "一键填入"}</button>)}</div><p className="type-caption mt-2 text-center font-medium text-slate">{en ? "Demo environment: all transactions run on a testnet; no real funds are involved." : "演示环境：所有交易均在测试网执行，不涉及真实资金"}</p><p className="type-caption mt-0.5 text-center text-label-3">{en ? "Test network (Base Sepolia) · confirmation required · limit 100 per transfer" : "测试网络（Base Sepolia）· 执行前需确认 · 单笔上限 100 USDC"}</p></form>;
}

function shorten(addr: string) { return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr; }
