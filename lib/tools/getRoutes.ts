import type { Language } from "../i18n";
import type { Priority, Route, RoutesResult } from "../types";

export async function getRoutes(input: { amount: number; from_currency: string; to_currency: string; priority?: Priority; language?: Language }): Promise<RoutesResult> {
  if (process.env.LIFI_API_KEY) {
    try { return await fetchLifiRoutes(input); } catch (err) { console.error("[getRoutes] LI.FI failed; falling back to mock", err); }
  }
  return mockRoutes(input);
}

async function fetchLifiRoutes(input: { amount: number; from_currency: string; to_currency: string; priority?: Priority; language?: Language }): Promise<RoutesResult> {
  if (input.from_currency.toUpperCase() !== "USDC" || input.to_currency.toUpperCase() !== "USDC") throw new Error("LI.FI live quotes are available only for USDC-to-USDC demo routes.");
  const fromChain = envNumber("LIFI_FROM_CHAIN"); const toChain = envNumber("LIFI_TO_CHAIN"); const fromToken = process.env.LIFI_FROM_TOKEN; const toToken = process.env.LIFI_TO_TOKEN; const fromAddress = process.env.LIFI_DEMO_FROM_ADDRESS; const toAddress = process.env.LIFI_DEMO_TO_ADDRESS;
  if (!fromChain || !toChain || !fromToken || !toToken || !fromAddress || !toAddress) throw new Error("LI.FI demo route environment is incomplete.");
  const decimals = envNumber("LIFI_TOKEN_DECIMALS") ?? 6; const fromAmount = toUnits(input.amount, decimals);
  const query = new URLSearchParams({ fromChain: String(fromChain), toChain: String(toChain), fromToken, toToken, fromAmount, fromAddress, toAddress });
  const response = await fetch(`https://li.quest/v1/quote?${query}`, { headers: { "x-lifi-api-key": process.env.LIFI_API_KEY ?? "" }, cache: "no-store", signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`LI.FI quote failed with HTTP ${response.status}.`);
  const quote = await response.json() as { estimate?: { toAmount?: string; executionDuration?: number; gasCosts?: { amountUSD?: string }[]; feeCosts?: { amountUSD?: string }[] }; toolDetails?: { name?: string }; includedSteps?: { toolDetails?: { name?: string } }[] };
  const estimate = quote.estimate; if (!estimate?.toAmount) throw new Error("LI.FI quote did not include an output amount.");
  const output = fromUnits(estimate.toAmount, decimals); const networkCosts = [...(estimate.gasCosts ?? []), ...(estimate.feeCosts ?? [])].reduce((sum, cost) => sum + Number(cost.amountUSD ?? 0), 0); const outputLoss = Math.max(0, input.amount - output); const totalCostAmount = round(outputLoss + networkCosts, 6); const provider = quote.toolDetails?.name ?? quote.includedSteps?.[0]?.toolDetails?.name ?? "LI.FI";
  const en = input.language === "en";
  const route: Route = { id: `lifi-${fromChain}-${toChain}-${provider.toLowerCase().replace(/\s+/g, "-")}`, kind: "stablecoin", label: en ? `USDC via ${provider}` : `USDC · ${provider}`, chain: `${fromChain} → ${toChain}`, stablecoin: "USDC", bridge_or_provider: provider, total_cost_pct: input.amount ? round((totalCostAmount / input.amount) * 100, 4) : 0, total_cost_amount: totalCostAmount, eta_minutes: Math.max(1, Math.ceil((estimate.executionDuration ?? 0) / 60)), slippage_pct: input.amount ? round((outputLoss / input.amount) * 100, 4) : 0, gas_usd: round(networkCosts, 6), notes: en ? "Live LI.FI quote for configured demo wallets; refresh before execution." : "已配置演示钱包的 LI.FI 实时报价；执行前请刷新。" };
  return { source: "lifi", source_note: en ? "Live LI.FI quote for configured USDC demo wallets." : "已配置 USDC 演示钱包的 LI.FI 实时报价。", quoted_at: new Date().toISOString(), amount: input.amount, from_currency: input.from_currency, to_currency: input.to_currency, routes: [route] };
}

function mockRoutes(input: { amount: number; from_currency: string; to_currency: string; priority?: Priority; language?: Language }): RoutesResult {
  const { amount, from_currency, to_currency, priority } = input; const en = input.language === "en"; const pct = (p: number) => Math.round(amount * p) / 100;
  const routes: Route[] = [
    { id: "usdc-base", kind: "stablecoin", label: en ? "USDC via Base" : "USDC · Base 原生路线", chain: "Base", stablecoin: "USDC", bridge_or_provider: "Base (Coinbase L2)", total_cost_pct: 0.42, total_cost_amount: pct(0.42), eta_minutes: 4, slippage_pct: 0.15, gas_usd: 0.03, notes: en ? "Lowest cost; recipient needs a Base wallet." : "成本最低；收款方需要 Base 钱包。" },
    { id: "usdt-polygon", kind: "stablecoin", label: en ? "USDT via Polygon · Across" : "USDT · Polygon · Across Bridge", chain: "Polygon", stablecoin: "USDT", bridge_or_provider: "Across", total_cost_pct: 0.58, total_cost_amount: pct(0.58), eta_minutes: 9, slippage_pct: 0.22, gas_usd: 0.05, notes: en ? "Deep liquidity; bridge time can vary." : "流动性深；桥接时间可能波动。" },
    { id: "usdc-arbitrum", kind: "stablecoin", label: en ? "USDC via Arbitrum · Stargate" : "USDC · Arbitrum · Stargate", chain: "Arbitrum", stablecoin: "USDC", bridge_or_provider: "Stargate", total_cost_pct: 0.66, total_cost_amount: pct(0.66), eta_minutes: 7, slippage_pct: 0.25, gas_usd: 0.11, notes: en ? "Alternative route; DEX depth may lag Base." : "备选路线；DEX 深度可能低于 Base。" },
    { id: "wise", kind: "tradfi", label: "Wise", chain: null, stablecoin: null, bridge_or_provider: "Wise", total_cost_pct: 1.65, total_cost_amount: pct(1.65), eta_minutes: 1440, slippage_pct: 0, gas_usd: 0, notes: en ? "Transparent FX; usually one business day." : "公开费率；通常 1 个工作日。" },
    { id: "swift", kind: "tradfi", label: "SWIFT", chain: null, stablecoin: null, bridge_or_provider: "SWIFT", total_cost_pct: 4.2, total_cost_amount: pct(4.2), eta_minutes: 4320, slippage_pct: 0, gas_usd: 0, notes: en ? "Bank and intermediary fees; 3–5 business days." : "银行及中转行费用；3–5 个工作日。" },
  ];
  if (priority === "speed") routes.sort((a, b) => a.eta_minutes - b.eta_minutes); else routes.sort((a, b) => a.total_cost_pct - b.total_cost_pct);
  return { source: "mock", source_note: en ? "Demo estimate: not a live quote or fiat on/off-ramp offer." : "演示估算，不是实时报价或法币出入金报价。", quoted_at: new Date().toISOString(), amount, from_currency, to_currency, routes };
}

function envNumber(name: string): number | undefined { const value = process.env[name]; if (!value) return undefined; const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined; }
function toUnits(amount: number, decimals: number): string { if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(decimals) || decimals < 0 || decimals > 18) throw new Error("Invalid LI.FI amount or token decimals."); const [whole, fraction = ""] = String(amount).split("."); return `${whole}${fraction.padEnd(decimals, "0").slice(0, decimals)}`.replace(/^0+(?=\d)/, ""); }
function fromUnits(amount: string, decimals: number): number { const value = BigInt(amount); const base = 10n ** BigInt(decimals); return Number(value / base) + Number(value % base) / Number(base); }
function round(value: number, digits: number): number { const factor = 10 ** digits; return Math.round(value * factor) / factor; }
