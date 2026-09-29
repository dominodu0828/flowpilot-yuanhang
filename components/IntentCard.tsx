import type { ReactNode } from "react";
import type { Language } from "@/lib/i18n";
import type { PaymentIntent } from "@/lib/types";

export default function IntentCard({ intent, language }: { intent: PaymentIntent; language: Language }) {
  const en = language === "en";
  const priority = intent.priority === "cost" ? (en ? "Lowest cost" : "成本最低") : intent.priority === "speed" ? (en ? "Fastest" : "最快到账") : intent.priority === "safety" ? (en ? "Safest" : "最安全") : intent.priority;
  const facts: { label: string; value: string | null }[] = [
    { label: en ? "Amount" : "金额", value: intent.amount != null ? `${intent.amount.toLocaleString()} ${intent.from_currency ?? ""}`.trim() : null },
    { label: en ? "Pair" : "币种", value: intent.from_currency && intent.to_currency ? `${intent.from_currency} → ${intent.to_currency}` : null },
    { label: en ? "Deadline" : "截止", value: intent.deadline },
    { label: en ? "Priority" : "偏好", value: priority ?? null },
    { label: en ? "Recipient" : "收款方", value: intent.recipient },
  ].filter((f) => f.value);
  return <section className="material-card rounded-card px-4 py-3.5"><CardHeader step="M1" title={en ? "Payment intent" : "结构化意图"} note="Structured Output" /><dl className="mt-3 flex flex-wrap gap-1.5">{facts.map((f) => <div key={f.label} className="material-chip flex items-baseline gap-1.5 rounded-[10px] px-2.5 py-1.5"><dt className="type-caption text-label-3">{f.label}</dt><dd className="tnum text-[0.8125rem] font-medium text-label">{f.value}</dd></div>)}</dl>{intent.missing_info.length > 0 && <p className="mt-2.5 flex items-start gap-1.5 text-[0.8125rem] text-orange"><span aria-hidden>!</span><span>{en ? "Still needed: " : "还需要："}{intent.missing_info.join(", ")}</span></p>}</section>;
}

export function CardHeader({ step, title, note, accent }: { step: string; title: string; note?: string; accent?: ReactNode }) {
  return <header className="flex items-center gap-2"><span className="type-label rounded-md bg-white/8 px-1.5 py-0.5 text-label-2">{step}</span><h3 className="type-title">{title}</h3>{note && <span className="type-caption text-label-3">{note}</span>}{accent && <div className="ml-auto">{accent}</div>}</header>;
}
