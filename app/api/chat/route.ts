import { NextRequest, NextResponse } from "next/server";
import { runAgent, parseIntent } from "@/lib/agent";
import { currentUser } from "@/lib/auth";
import { errorMessage, type AppErrorCode } from "@/lib/errors";
import { languageFromCookie } from "@/lib/i18n";
import { takeChatRequest } from "@/lib/rateLimit";
import { appendMessage, createConversation, loadTurns, ownsConversation, recordTransfers } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 120;

function fail(code: AppErrorCode, language: ReturnType<typeof languageFromCookie>, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ errorCode: code, error: errorMessage(code, language), ...extra }, { status });
}

export async function POST(req: NextRequest) {
  const language = languageFromCookie(req.cookies.get("flowpilot_lang")?.value);
  const user = await currentUser();
  if (!user) return fail("AUTH_REQUIRED", language, 401);
  if (!process.env.ANTHROPIC_API_KEY) return fail("API_KEY_MISSING", language, 500);

  let body: { message?: string; conversationId?: string };
  try { body = await req.json(); } catch { return fail("INVALID_REQUEST", language, 400); }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return fail("MESSAGE_EMPTY", language, 400);
  if (message.length > 4000) return fail("MESSAGE_TOO_LONG", language, 400);

  const rate = takeChatRequest(user.id);
  if (!rate.allowed) return NextResponse.json({ errorCode: "RATE_LIMITED", error: errorMessage("RATE_LIMITED", language), retryAfterSeconds: rate.retryAfterSeconds }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });

  let conversationId = body.conversationId;
  if (conversationId) {
    if (!ownsConversation(user.id, conversationId)) return fail("CONVERSATION_NOT_FOUND", language, 404);
  } else conversationId = createConversation(user.id, message);
  appendMessage(conversationId, { role: "user", content: message });
  const history = loadTurns(conversationId);

  try {
    const [intent, agentResult] = await Promise.all([parseIntent(history, language), runAgent(history, language)]);
    appendMessage(conversationId, { role: "assistant", content: agentResult.text, intent, events: agentResult.events });
    recordTransfers(user.id, conversationId, agentResult.events);
    return NextResponse.json({ conversationId, text: agentResult.text, intent, events: agentResult.events });
  } catch (err) {
    console.error("[/api/chat] agent failed", err);
    return fail("UNKNOWN_ERROR", language, 500, { conversationId });
  }
}
