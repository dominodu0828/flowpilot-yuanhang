import { NextResponse } from "next/server";
import { login, register } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * A deliberately opt-in reviewer account. It is disabled unless the demo
 * switch is enabled, so production deployments cannot accidentally expose a
 * shared credential.
 */
export async function POST(req: Request) {
  if (process.env.DEMO_LOGIN_ENABLED !== "true") {
    return NextResponse.json({ error: "Demo login is disabled." }, { status: 404 });
  }

  const email = process.env.DEMO_EMAIL || "demo@flowpilot.local";
  const password = process.env.DEMO_PASSWORD || "FlowPilotDemo2026!";
  const userAgent = req.headers.get("user-agent");

  let result = await login({ email, password, userAgent });
  if (!result.ok) {
    result = await register({ email, password, displayName: "FlowPilot Demo", userAgent });
    if (!result.ok) result = await login({ email, password, userAgent });
  }

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ user: result.user, demo: true });
}
