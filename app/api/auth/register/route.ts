import { NextRequest, NextResponse } from "next/server";
import { register } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; displayName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "缺少信箱或密碼" }, { status: 400 });
  }

  const result = await register({
    email: body.email,
    password: body.password,
    displayName: typeof body.displayName === "string" ? body.displayName : "",
    userAgent: req.headers.get("user-agent"),
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ user: result.user });
}
