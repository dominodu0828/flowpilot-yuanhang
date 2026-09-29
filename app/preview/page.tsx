import { cookies } from "next/headers";
import IntentCard from "@/components/IntentCard";
import RouteCard from "@/components/RouteCard";
import FxForecastCard from "@/components/FxForecastCard";
import TransferResultCard from "@/components/TransferResultCard";
import LanguageToggle from "@/components/LanguageToggle";
import fx from "@/data/fx_volatility.json";
import type { FxForecast, RoutesResult } from "@/lib/types";
import { languageFromCookie } from "@/lib/i18n";
import BrandMark from "@/components/BrandMark";
import PolicyGateCard from "@/components/PolicyGateCard";

export const dynamic = "force-dynamic";

export default async function Preview() {
  const language = languageFromCookie((await cookies()).get("flowpilot_lang")?.value);
  const en = language === "en";
  const routes: RoutesResult = {
    source: "mock", amount: 5000, from_currency: "CNY", to_currency: "HKD",
    routes: [
      { id: "usdc-base", kind: "stablecoin", label: en ? "USDC via Base" : "USDC · Base 原生路线", chain: "Base", stablecoin: "USDC", bridge_or_provider: "Base", total_cost_pct: 0.42, total_cost_amount: 21, eta_minutes: 4, slippage_pct: 0.15, gas_usd: 0.03, notes: en ? "Lowest cost; recipient needs a Base wallet" : "成本最低；收款方需要 Base 钱包" },
      { id: "usdt-polygon", kind: "stablecoin", label: en ? "USDT via Polygon · Across" : "USDT · Polygon · Across Bridge", chain: "Polygon", stablecoin: "USDT", bridge_or_provider: "Across", total_cost_pct: 0.58, total_cost_amount: 29, eta_minutes: 9, slippage_pct: 0.22, gas_usd: 0.05, notes: en ? "Deep liquidity; bridge time varies" : "流动性深；桥接时间可能波动" },
      { id: "wise", kind: "tradfi", label: "Wise", chain: null, stablecoin: null, bridge_or_provider: "Wise", total_cost_pct: 1.65, total_cost_amount: 82.5, eta_minutes: 1440, slippage_pct: 0, gas_usd: 0, notes: en ? "Transparent FX; usually one business day" : "公开费率；通常 1 个工作日" },
      { id: "swift", kind: "tradfi", label: "SWIFT", chain: null, stablecoin: null, bridge_or_provider: "SWIFT", total_cost_pct: 4.2, total_cost_amount: 210, eta_minutes: 4320, slippage_pct: 0, gas_usd: 0, notes: en ? "Bank fees and intermediary costs; 3–5 business days" : "银行及中转行费用；3–5 个工作日" },
    ],
  };
  const cnyHkd = { ...(fx.CNYHKD as FxForecast), rationale: en ? "Low expected volatility and a narrow confidence interval support executing the lowest-cost route now." : "预期波动较低、置信区间较窄，建议现在执行成本最低的路线。" };
  const cnyKrw = { ...(fx.CNYKRW as FxForecast), rationale: en ? "Higher expected volatility suggests watching the market or splitting the transfer if the deadline allows." : "预期波动较高；若时间允许，建议观察或分批执行。" };
  return <main className="mx-auto max-w-[46rem] space-y-3 px-4 py-6"><div className="flex items-center justify-between"><div className="flex items-center gap-2.5"><BrandMark className="h-8 w-8 rounded-[10px]" /><div><p className="type-label text-label-3">FlowPilot {en ? "" : "远航"}</p><h1 className="type-title">{en ? "Compliant cross-border payment agent for China–Thailand micro-merchants" : "面向中泰跨境小微商户的合规支付智能体"}</h1></div></div><LanguageToggle language={language} /></div><IntentCard language={language} intent={{ is_payment_intent: true, amount: 5000, from_currency: "CNY", to_currency: "HKD", deadline: "2026-08-14", priority: "cost", recipient: en ? "Hong Kong landlord" : "香港房东", missing_info: [en ? "recipient address" : "收款钱包地址"] }} /><RouteCard result={routes} language={language} /><FxForecastCard forecast={cnyHkd} language={language} /><FxForecastCard forecast={cnyKrw} language={language} /><div className="flex items-center gap-2.5 rounded-card border border-green/25 bg-green/10 px-4 py-2.5 text-[0.875rem] text-green"><span aria-hidden>✓</span><span className="min-w-0 flex-1">{en ? "Recipient risk screening · passed (low risk) · no blacklist match" : "收款方风险筛查 · 通过（low risk）· 未命中黑名单"}</span><span className="tnum type-caption shrink-0 opacity-70">0x7099…9C8</span></div><PolicyGateCard passed={false} code="TRANSFER_LIMIT_EXCEEDED" request={{ to: "0x8589427373D6D84E98730D7795D8f6f8731FDA16", amount_usdc: 50000 }} language={language} /><PolicyGateCard passed language={language} /><TransferResultCard language={language} result={{ simulated: true, tx_hash: "0x0000019fe904080d0000019fe904080d0000019fe904080d0000019fe904080d", explorer_url: null, to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", amount_usdc: 50, chain: "base-sepolia", note: en ? "No WALLET_PRIVATE_KEY configured; returning a simulated transaction." : "未配置 WALLET_PRIVATE_KEY，返回模拟交易。" }} /><TransferResultCard language={language} result={{ simulated: false, tx_hash: "0xabc1230000000000000000000000000000000000000000000000000000004def", explorer_url: "https://sepolia.basescan.org/tx/0xabc123", to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", amount_usdc: 50, chain: "base-sepolia", note: en ? "Executed on Base Sepolia testnet." : "已在 Base Sepolia 测试网执行。" }} /><p className="type-caption pt-2 text-center font-medium text-slate">{en ? "Demo environment: all transactions run on a testnet; no real funds are involved." : "演示环境：所有交易均在测试网执行，不涉及真实资金"}</p></main>;
}
