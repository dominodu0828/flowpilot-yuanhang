import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { languageFromCookie } from "@/lib/i18n";
import { deleteConversation, loadMessages, ownsConversation } from "@/lib/store";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };

function fail(language: ReturnType<typeof languageFromCookie>, code: "AUTH_REQUIRED" | "CONVERSATION_NOT_FOUND", status: number) {
  return NextResponse.json({ errorCode: code, error: errorMessage(code, language) }, { status });
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const language = languageFromCookie(req.cookies.get("flowpilot_lang")?.value);
  const { id } = await params; const user = await currentUser();
  if (!user) return fail(language, "AUTH_REQUIRED", 401);
  if (!ownsConversation(user.id, id)) return fail(language, "CONVERSATION_NOT_FOUND", 404);
  return NextResponse.json({ messages: loadMessages(id) });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const language = languageFromCookie(req.cookies.get("flowpilot_lang")?.value);
  const { id } = await params; const user = await currentUser();
  if (!user) return fail(language, "AUTH_REQUIRED", 401);
  if (!deleteConversation(user.id, id)) return fail(language, "CONVERSATION_NOT_FOUND", 404);
  return NextResponse.json({ ok: true });
}
