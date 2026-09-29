import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { languageFromCookie } from "@/lib/i18n";
import { listConversations } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const language = languageFromCookie(req.cookies.get("flowpilot_lang")?.value);
  const user = await currentUser();
  if (!user) return NextResponse.json({ errorCode: "AUTH_REQUIRED", error: errorMessage("AUTH_REQUIRED", language) }, { status: 401 });
  return NextResponse.json({ conversations: listConversations(user.id) });
}
