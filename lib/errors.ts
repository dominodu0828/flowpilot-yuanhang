import type { Language } from "./i18n";

export type AppErrorCode =
  | "AUTH_REQUIRED"
  | "API_KEY_MISSING"
  | "INVALID_REQUEST"
  | "MESSAGE_EMPTY"
  | "MESSAGE_TOO_LONG"
  | "RATE_LIMITED"
  | "CONVERSATION_NOT_FOUND"
  | "TRANSFER_INPUT_INVALID"
  | "TRANSFER_LIMIT_EXCEEDED"
  | "TRANSFER_CONFIRMATION_REQUIRED"
  | "TRANSFER_APPROVAL_MISMATCH"
  | "TRANSFER_ADDRESS_NOT_SCREENED"
  | "UNKNOWN_ERROR";

const messages: Record<AppErrorCode, { zh: string; en: string; tw: string }> = {
  AUTH_REQUIRED: { zh: "请先登录。", en: "Please log in first.", tw: "請先登入。" },
  API_KEY_MISSING: { zh: "服务端尚未配置 Anthropic API Key。", en: "The Anthropic API key is not configured.", tw: "伺服器尚未設定 Anthropic API Key。" },
  INVALID_REQUEST: { zh: "请求格式错误。", en: "Invalid request format.", tw: "請求格式錯誤。" },
  MESSAGE_EMPTY: { zh: "消息不能为空。", en: "Message cannot be empty.", tw: "訊息不能為空。" },
  MESSAGE_TOO_LONG: { zh: "消息过长（上限 4000 字符）。", en: "Message is too long (4,000 characters max).", tw: "訊息過長（上限 4000 字元）。" },
  RATE_LIMITED: { zh: "请求过于频繁，请稍后再试。", en: "Too many requests. Please try again later.", tw: "請求過於頻繁，請稍後再試。" },
  CONVERSATION_NOT_FOUND: { zh: "会话不存在。", en: "Conversation not found.", tw: "會話不存在。" },
  TRANSFER_INPUT_INVALID: { zh: "需要有效的收款地址和正数 USDC 金额。", en: "A valid recipient address and positive USDC amount are required.", tw: "需要有效的收款地址和正數 USDC 金額。" },
  TRANSFER_LIMIT_EXCEEDED: { zh: "测试网单笔转账上限为 100 USDC。", en: "The testnet single-transfer limit is 100 USDC.", tw: "測試網單筆轉帳上限為 100 USDC。" },
  TRANSFER_CONFIRMATION_REQUIRED: { zh: "请先明确确认完全一致的 USDC 金额和收款地址。", en: "Explicit confirmation must match the USDC amount and recipient address.", tw: "請先明確確認完全一致的 USDC 金額與收款地址。" },
  TRANSFER_APPROVAL_MISMATCH: { zh: "已确认的金额和收款地址必须与本次交易完全一致。", en: "The approved amount and recipient must exactly match this transfer.", tw: "已確認的金額與收款地址必須與本次交易完全一致。" },
  TRANSFER_ADDRESS_NOT_SCREENED: { zh: "收款地址尚未在本回合通过合规筛查。", en: "The recipient address has not passed compliance screening in this turn.", tw: "收款地址尚未在本回合通過合規篩查。" },
  UNKNOWN_ERROR: { zh: "发生未知错误。", en: "An unknown error occurred.", tw: "發生未知錯誤。" },
};

export function errorMessage(code: AppErrorCode, language: Language): string {
  const item = messages[code];
  return language === "en" ? item.en : language === "zh-TW" ? item.tw : item.zh;
}
