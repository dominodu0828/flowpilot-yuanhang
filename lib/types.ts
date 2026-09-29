// 共享類型定義：意圖 / 路徑 / 匯率預測 / 交易結果

export type Priority = "cost" | "speed" | "safety";

/** M1 意圖解析輸出（Claude structured output） */
export interface PaymentIntent {
  is_payment_intent: boolean;
  amount: number | null;
  from_currency: string | null;
  to_currency: string | null;
  deadline: string | null; // ISO 日期
  priority: Priority | null;
  recipient: string | null;
  missing_info: string[]; // 還缺哪些信息才能比價/執行
}

/** M2 單條候選路徑 */
export interface Route {
  id: string;
  kind: "stablecoin" | "tradfi";
  label: string; // 例如 "USDC · Base · Across Bridge" 或 "銀行電匯 (SWIFT)"
  chain: string | null;
  stablecoin: string | null;
  bridge_or_provider: string;
  total_cost_pct: number; // 全成本（含滑點+gas+手續費）佔比 %
  total_cost_amount: number; // 以 from_currency 計的成本
  eta_minutes: number;
  slippage_pct: number;
  gas_usd: number;
  notes: string;
}

export interface RoutesResult {
  source: "mock" | "lifi";
  source_note?: string;
  quoted_at?: string;
  amount: number;
  from_currency: string;
  to_currency: string;
  routes: Route[];
}

/** M3 匯率時機建議（讀預計算 JSON） */
export interface FxForecast {
  pair: string;
  asof: string;
  spot: number;
  realized_vol_30d_ann_pct: number;
  forecast_vol_7d_ann_pct: number;
  ci95_low_pct: number; // 未來 7 天匯率變動 95% 置信區間（%）
  ci95_high_pct: number;
  recommendation: "execute_now" | "wait";
  rationale: string;
  vol_series: { date: string; vol_ann_pct: number }[];
  model: string; // e.g. "GARCH(1,1)" / "rolling_30d"
}

/** M4 合規篩查 + 執行結果 */
export interface ScreenResult {
  address: string;
  passed: boolean;
  risk_level: "low" | "medium" | "high";
  reason: string;
}

export interface TransferResult {
  simulated: boolean;
  tx_hash: string;
  explorer_url: string | null;
  to: string;
  amount_usdc: number;
  chain: "base-sepolia";
  note: string;
}

/** 後端返回給前端的一次 agent 回合 */
export interface ToolEvent {
  tool: string;
  input: unknown;
  result: unknown;
}

export interface ChatResponse {
  conversationId: string;
  text: string;
  intent: PaymentIntent | null;
  events: ToolEvent[];
  error?: string;
  errorCode?: import("./errors").AppErrorCode;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** 登入用戶（前端可見部分，不含任何憑證） */
export interface SessionUser {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}
