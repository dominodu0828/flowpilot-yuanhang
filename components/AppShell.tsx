"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Chat from "./Chat";
import LanguageToggle from "./LanguageToggle";
import type { ConversationSummary, StoredMessage } from "@/lib/store";
import type { SessionUser } from "@/lib/types";
import type { Language } from "@/lib/i18n";
import BrandMark from "./BrandMark";

export default function AppShell({ user, initialConversations, language }: {
  user: SessionUser;
  initialConversations: ConversationSummary[];
  language: Language;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<StoredMessage[]>([]);
  const [loadingConv, setLoadingConv] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const refreshList = useCallback(async () => {
    const res = await fetch("/api/conversations");
    if (res.ok) setConversations((await res.json()).conversations);
  }, []);

  async function openConversation(id: string) {
    setDrawerOpen(false);
    if (id === activeId) return;
    setLoadingConv(true);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        setInitialMessages((await res.json()).messages);
        setActiveId(id);
      }
    } finally { setLoadingConv(false); }
  }

  function newConversation() {
    setDrawerOpen(false);
    setActiveId(null);
    setInitialMessages([]);
  }

  async function removeConversation(id: string) {
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    if (id === activeId) newConversation();
    refreshList();
  }

  return (
    <div className="flex h-dvh">
      <aside className="hidden w-[15rem] shrink-0 flex-col border-r border-hairline lg:flex">
        <SidebarContent user={user} conversations={conversations} activeId={activeId} language={language} onNew={newConversation} onOpen={openConversation} onDelete={removeConversation} />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label={language === "en" ? "Close sidebar" : "关闭侧栏"} onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
          <aside className="material-chrome animate-materialize absolute inset-y-0 left-0 flex w-[16rem] flex-col shadow-sheet">
            <SidebarContent user={user} conversations={conversations} activeId={activeId} language={language} onNew={newConversation} onOpen={openConversation} onDelete={removeConversation} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="material-chrome sticky top-0 z-20 flex items-center gap-2 px-4 py-2.5">
          <button onClick={() => setDrawerOpen(true)} aria-label={language === "en" ? "Open conversations" : "打开对话列表"} className="pressable material-chip grid h-8 w-8 place-items-center rounded-[10px] lg:hidden">
            <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden><path d="M2 4h11M2 7.5h11M2 11h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          </button>
          <span className="flex shrink-0 items-center gap-1.5 lg:hidden"><BrandMark className="h-6 w-6 rounded-[7px]" /><span className="type-title text-ink">Flow<span className="text-jade">Pilot</span></span></span><div className="min-w-0 flex-1"><h1 className="type-title truncate">{activeId ? (conversations.find((c) => c.id === activeId)?.title ?? (language === "en" ? "Conversation" : "对话")) : (language === "en" ? "New conversation" : "新对话")}</h1></div>
          <LanguageToggle language={language} />
          <span title={language === "en" ? "Test network (Base Sepolia)" : "测试网络（Base Sepolia）"} className="type-caption shrink-0 rounded-full border border-jade/25 bg-jade/10 px-2.5 py-1 font-medium text-jade">{language === "en" ? "Testnet demo" : "测试网演示"}</span>
        </header>

        <div className="mx-auto flex w-full min-w-0 max-w-[44rem] flex-1 flex-col px-4">
          {loadingConv ? <div className="flex flex-1 items-center justify-center text-[0.875rem] text-label-3">{language === "en" ? "Loading conversation…" : "正在加载对话…"}</div> : <Chat key={activeId ?? "new"} conversationId={activeId} initialMessages={initialMessages} language={language} onConversationCreated={(id) => { setActiveId(id); refreshList(); }} onTurnComplete={refreshList} />}
        </div>
      </div>
    </div>
  );
}

function SidebarContent({ user, conversations, activeId, language, onNew, onOpen, onDelete }: {
  user: SessionUser; conversations: ConversationSummary[]; activeId: string | null; language: Language;
  onNew: () => void; onOpen: (id: string) => void; onDelete: (id: string) => void;
}) {
  const en = language === "en";
  return (
    <>
      <div className="flex items-center gap-2 px-3 py-3"><BrandMark className="h-7 w-7 rounded-[9px]" /><span className="type-title text-ink">Flow<span className="text-jade">Pilot</span></span><span className="type-caption text-slate">远航</span></div>
      <div className="px-3 pb-2"><button onClick={onNew} className="pressable material-chip flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-[0.8125rem] font-medium hover:bg-white/[0.09]"><span aria-hidden className="text-label-2">＋</span>{en ? "New conversation" : "新对话"}</button></div>
      <nav aria-label={en ? "Conversation history" : "历史对话"} className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <p className="type-label px-2 py-2 text-label-3">{en ? "History" : "历史对话"}</p>
        {conversations.length === 0 ? <p className="px-2 text-[0.8125rem] text-label-3">{en ? "No conversations yet" : "还没有对话"}</p> : <ul className="space-y-0.5">{conversations.map((c) => <li key={c.id} className="group relative"><button onClick={() => onOpen(c.id)} aria-current={c.id === activeId ? "true" : undefined} className={`w-full truncate rounded-[10px] py-1.5 pl-2.5 pr-8 text-left text-[0.8125rem] transition-colors duration-150 ${c.id === activeId ? "bg-white/10 text-label" : "text-label-2 hover:bg-white/[0.055] hover:text-label"}`}>{c.title}</button><button onClick={() => onDelete(c.id)} aria-label={`${en ? "Delete conversation" : "删除对话"}: ${c.title}`} className="pressable absolute right-1 top-1/2 hidden h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-label-3 hover:bg-red/15 hover:text-red group-hover:grid"><span aria-hidden className="text-[13px] leading-none">×</span></button></li>)}</ul>}
      </nav>
      <AccountFooter user={user} language={language} />
    </>
  );
}

function AccountFooter({ user, language }: { user: SessionUser; language: Language }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function signOut() { setBusy(true); await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh(); }
  const en = language === "en";
  return <div className="border-t border-hairline p-2"><Link href="/records" className="pressable mb-1 flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-[0.8125rem] text-label-2 hover:bg-white/[0.055] hover:text-label"><span aria-hidden>▣</span>{en ? "Execution records" : "执行记录"}</Link><div className="flex items-center gap-2 rounded-[10px] px-2.5 py-1.5"><span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/12 text-[10px] font-semibold uppercase">{user.display_name.slice(0, 1)}</span><span className="min-w-0 flex-1 truncate text-[0.75rem] text-label-2">{user.display_name}</span><button onClick={signOut} disabled={busy} className="pressable type-caption shrink-0 rounded-md px-1.5 py-1 text-label-3 hover:bg-white/8 hover:text-label-2">{en ? "Log out" : "退出"}</button></div></div>;
}
