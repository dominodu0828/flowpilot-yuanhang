import type { Language } from "./i18n";
import type { ChatTurn, PaymentIntent, ToolEvent } from "./types";

/**
 * 公开展示版占位模块。
 *
 * FlowPilot 的智能体编排（意图解析、工具调度）与策略闸门授权模块不包含在公开仓库中。
 * 完整流程请使用在线演示；本文件只保留接口签名，使界面代码可以独立构建与预览（/preview）。
 */
export async function parseIntent(_history: ChatTurn[], _language: Language = "zh-CN"): Promise<PaymentIntent | null> {
  return null;
}

export async function runAgent(_history: ChatTurn[], language: Language = "zh-CN"): Promise<{ text: string; events: ToolEvent[] }> {
  const text = language === "en"
    ? "This public edition does not include the agent orchestration or policy-gate modules. Please use the online demo for the full flow."
    : "公开展示版不包含智能体编排与策略闸门模块，完整流程请使用在线演示。";
  return { text, events: [] };
}
