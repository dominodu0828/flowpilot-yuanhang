import type { Language } from "@/lib/i18n";
import type { TransferResult } from "@/lib/types";
import { CardHeader } from "./IntentCard";

export default function TransferResultCard({ result, language }: { result: TransferResult; language: Language }) {
  const en = language === "en"; const live = !result.simulated;
  return <section className={`rounded-card border px-4 py-3.5 ${live ? "border-green/30 bg-green/[0.07]" : "border-orange/25 bg-orange/[0.06]"}`}><CardHeader step="M4" title={en ? "Settlement-layer execution" : "结算层执行"} note={en ? "testnet demo" : "测试网演示"} accent={<span className={`type-caption rounded-full border px-2 py-0.5 font-medium ${live ? "border-green/30 bg-green/12 text-green" : "border-orange/30 bg-orange/12 text-orange"}`}>{live ? (en ? "Broadcast" : "已广播") : (en ? "Simulated" : "模拟模式")}</span>} /><p className="tnum mt-3 text-[1.75rem] font-semibold leading-none">{result.amount_usdc}<span className="ml-1.5 text-[0.9375rem] font-medium text-label-2">USDC</span></p><dl className="mt-3 space-y-1.5"><Row label={en ? "Recipient" : "收款地址"} value={result.to} /><Row label={en ? "Tx hash" : "交易哈希"} value={result.tx_hash} /></dl>{result.explorer_url ? <a href={result.explorer_url} target="_blank" rel="noreferrer" className="pressable mt-3 inline-flex items-center gap-1.5 rounded-full bg-green/15 px-3 py-1.5 text-[0.8125rem] font-medium text-green hover:bg-green/22">{en ? "View on testnet explorer" : "在测试网浏览器查看"} <span aria-hidden>→</span></a> : <p className="type-caption mt-2.5 text-orange/90">{result.note}</p>}</section>;
}

function Row({ label, value }: { label: string; value: string }) { return <div className="flex items-baseline gap-2.5"><dt className="type-caption w-16 shrink-0 text-label-3">{label}</dt><dd className="tnum min-w-0 break-all font-mono text-[0.6875rem] leading-relaxed text-label-2">{value}</dd></div>; }
