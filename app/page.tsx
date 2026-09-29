import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import AppShell from "@/components/AppShell";
import { currentUser } from "@/lib/auth";
import { listConversations } from "@/lib/store";
import { languageFromCookie } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const language = languageFromCookie((await cookies()).get("flowpilot_lang")?.value);

  return <AppShell user={user} initialConversations={listConversations(user.id)} language={language} />;
}
