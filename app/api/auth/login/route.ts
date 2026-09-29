import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "缺少信箱或密碼" }, { status: 400 });
  }

  const result = await login({
    email: body.email,
    password: body.password,
    userAgent: req.headers.get("user-agent"),
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 401 });
  return NextResponse.json({ user: result.user });
}
