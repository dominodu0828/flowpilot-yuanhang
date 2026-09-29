import type { AppErrorCode } from "@/lib/errors";
import type { Language } from "@/lib/i18n";

/** Display-only mapping from the server's policy error codes to the rule that fired. */
const RULES: Partial<Record<AppErrorCode, { zh: [string, string]; en: [string, string] }>> = {
  TRANSFER_LIMIT_EXCEEDED: { zh: ["单笔限额", "测试网单笔上限为 100，本次请求金额超出上限"], en: ["Single-transfer limit", "The testnet limit is 100 per transfer; this request exceeds it"] },
  TRANSFER_CONFIRMATION_REQUIRED: { zh: ["显式确认", "必须由用户在最新一条消息中确认完全一致的金额与收款方"], en: ["Explicit confirmation", "The user's latest message must confirm the exact amount and recipient"] },
  TRANSFER_APPROVAL_MISMATCH: { zh: ["确认一致性", "执行参数与用户确认的金额或收款方不一致"], en: ["Approval match", "Execution parameters differ from the confirmed amount or recipient"] },
  TRANSFER_ADDRESS_NOT_SCREENED: { zh: ["收款方风险筛查", "收款方尚未在本回合通过风险筛查"], en: ["Recipient risk screening", "The recipient has not passed screening in this turn"] },
  TRANSFER_INPUT_INVALID: { zh: ["输入校验", "收款地址或金额无效"], en: ["Input validation", "Recipient address or amount is invalid"] },
};

export default function PolicyGateCard({ passed, code, reason, request, language }: {
  passed: boolean;
  code?: AppErrorCode;
  reason?: string;
  request?: { to?: unknown; amount_usdc?: unknown };
  language: Language;
}) {
  const en = language === "en";
  const rule = code ? RULES[code] : undefined;
  const [ruleName, ruleDetail] = rule ? (en ? rule.en : rule.zh) : [en ? "Execution check" : "执行校验", reason ?? ""];
  const amount = request && Number.isFinite(Number(request.amount_usdc)) ? Number(request.amount_usdc) : null;
  const to = request && typeof request.to === "string" ? request.to : null;

  if (passed) {
    const checks = en ? ["Explicit confirmation matches", "Recipient screening passed", "Within single-transfer limit"] : ["用户确认与执行参数一致", "收款方风险筛查通过", "单笔限额内"];
    return <section className="rounded-card border-2 border-gold/60 bg-gold/[0.10] px-4 py-3.5"><header className="flex items-center gap-2"><span aria-hidden className="grid h-6 w-6 place-items-center rounded-full bg-gold text-[0.8125rem] font-bold text-white">✓</span><h3 className="type-title text-ink">{en ? "Policy gate · Passed" : "策略闸门 · 通过"}</h3><span className="type-caption ml-auto text-slate">{en ? "Model-independent server check" : "服务端规则校验，与模型无关"}</span></header><ul className="mt-2.5 flex flex-wrap gap-1.5">{checks.map((c) => <li key={c} className="type-caption rounded-full border border-gold/40 bg-white/70 px-2 py-0.5 text-ink">✓ {c}</li>)}</ul></section>;
  }

  return <section role="alert" className="rounded-card border-2 border-red/55 bg-red/[0.08] px-4 py-3.5"><header className="flex items-center gap-2"><span aria-hidden className="grid h-6 w-6 place-items-center rounded-full bg-red text-[0.8125rem] font-bold text-white">✗</span><h3 className="type-title text-red">{en ? "Policy gate · Blocked" : "策略闸门 · 已拦截"}</h3><span className="type-caption ml-auto text-slate">{en ? "Not executed" : "交易未执行"}</span></header><dl className="mt-2.5 space-y-1 text-[0.8125rem]"><div className="flex gap-2"><dt className="w-16 shrink-0 text-label-3">{en ? "Rule" : "触发规则"}</dt><dd className="font-semibold text-ink">{ruleName}</dd></div>{ruleDetail && <div className="flex gap-2"><dt className="w-16 shrink-0 text-label-3">{en ? "Reason" : "拦截原因"}</dt><dd className="text-label">{ruleDetail}</dd></div>}{amount != null && <div className="flex gap-2"><dt className="w-16 shrink-0 text-label-3">{en ? "Request" : "请求内容"}</dt><dd className="tnum min-w-0 break-all text-label-2">{amount.toLocaleString()}{to ? ` → ${to}` : ""}</dd></div>}</dl></section>;
}
