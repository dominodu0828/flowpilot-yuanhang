import crypto from "crypto";
import { db, nowISO } from "./db";
import type { ChatTurn, PaymentIntent, ToolEvent, TransferResult } from "./types";

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  intent: PaymentIntent | null;
  events: ToolEvent[];
  created_at: string;
}

export interface TransferRecord {
  id: string;
  to_address: string;
  amount_usdc: number;
  tx_hash: string;
  explorer_url: string | null;
  simulated: boolean;
  screened_ok: boolean;
  created_at: string;
}

/* ------------------------------ 會話 ------------------------------ */

export function createConversation(userId: string, firstMessage: string): string {
  const id = crypto.randomUUID();
  const ts = nowISO();
  db()
    .prepare(
      `INSERT INTO conversations (id, user_id, title, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(id, userId, titleFrom(firstMessage), ts, ts);
  return id;
}

/** 確認會話屬於該用戶——所有讀寫都要先過這關，避免橫向越權 */
export function ownsConversation(userId: string, conversationId: string): boolean {
  return !!db()
    .prepare(`SELECT 1 FROM conversations WHERE id = ? AND user_id = ?`)
    .get(conversationId, userId);
}

export function listConversations(userId: string): ConversationSummary[] {
  return db()
    .prepare(
      `SELECT c.id, c.title, c.created_at, c.updated_at,
              (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count
         FROM conversations c
        WHERE c.user_id = ?
        ORDER BY c.updated_at DESC
        LIMIT 100`
    )
    .all(userId) as ConversationSummary[];
}

export function deleteConversation(userId: string, conversationId: string): boolean {
  const res = db()
    .prepare(`DELETE FROM conversations WHERE id = ? AND user_id = ?`)
    .run(conversationId, userId);
  return res.changes > 0;
}

/* ------------------------------ 訊息 ------------------------------ */

export function appendMessage(
  conversationId: string,
  msg: {
    role: "user" | "assistant";
    content: string;
    intent?: PaymentIntent | null;
    events?: ToolEvent[];
  }
) {
  const ts = nowISO();
  db()
    .prepare(
      `INSERT INTO messages (conversation_id, role, content, intent_json, events_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      conversationId,
      msg.role,
      msg.content,
      msg.intent ? JSON.stringify(msg.intent) : null,
      msg.events?.length ? JSON.stringify(msg.events) : null,
      ts
    );
  db().prepare(`UPDATE conversations SET updated_at = ? WHERE id = ?`).run(ts, conversationId);
}

export function loadMessages(conversationId: string): StoredMessage[] {
  const rows = db()
    .prepare(
      `SELECT role, content, intent_json, events_json, created_at
         FROM messages WHERE conversation_id = ? ORDER BY id ASC`
    )
    .all(conversationId) as {
    role: "user" | "assistant";
    content: string;
    intent_json: string | null;
    events_json: string | null;
    created_at: string;
  }[];

  return rows.map((r) => ({
    role: r.role,
    content: r.content,
    intent: r.intent_json ? (JSON.parse(r.intent_json) as PaymentIntent) : null,
    events: r.events_json ? (JSON.parse(r.events_json) as ToolEvent[]) : [],
    created_at: r.created_at,
  }));
}

/** 給 agent 用的純文字歷史（不含工具事件） */
export function loadTurns(conversationId: string): ChatTurn[] {
  return loadMessages(conversationId)
    .filter((m) => m.content.trim().length > 0)
    .map((m) => ({ role: m.role, content: m.content }));
}

/* ------------------------------ 執行記錄 ------------------------------ */

/** 從 agent 的工具事件裡抽出轉賬並落庫（合規審計用） */
export function recordTransfers(
  userId: string,
  conversationId: string,
  events: ToolEvent[]
): void {
  for (const [index, e] of events.entries()) {
    if (e.tool !== "execute_transfer") continue;
    const r = e.result as TransferResult | { error: string };
    if ("error" in r) continue;

    // The audit record must prove that this exact recipient was screened.
    const screenedOk = events.slice(0, index).some((prior) => {
      if (prior.tool !== "screen_address") return false;
      const result = prior.result as { passed?: boolean; address?: string };
      return result.passed === true && result.address?.toLowerCase() === r.to.toLowerCase();
    });

    db()
      .prepare(
        `INSERT INTO transfers
           (id, user_id, conversation_id, to_address, amount_usdc, tx_hash,
            explorer_url, simulated, screened_ok, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        crypto.randomUUID(),
        userId,
        conversationId,
        r.to,
        r.amount_usdc,
        r.tx_hash,
        r.explorer_url,
        r.simulated ? 1 : 0,
        screenedOk ? 1 : 0,
        nowISO()
      );
  }
}

export function listTransfers(userId: string): TransferRecord[] {
  const rows = db()
    .prepare(
      `SELECT id, to_address, amount_usdc, tx_hash, explorer_url, simulated, screened_ok, created_at
         FROM transfers WHERE user_id = ? ORDER BY created_at DESC LIMIT 200`
    )
    .all(userId) as (Omit<TransferRecord, "simulated" | "screened_ok"> & {
    simulated: number;
    screened_ok: number;
  })[];

  return rows.map((r) => ({
    ...r,
    simulated: !!r.simulated,
    screened_ok: !!r.screened_ok,
  }));
}

/* ------------------------------ 工具 ------------------------------ */

function titleFrom(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 40 ? `${clean.slice(0, 40)}…` : clean || "新對話";
}
