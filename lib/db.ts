import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

/**
 * SQLite 單文件庫。部署到騰訊雲時把 DATA_DIR 指到一個持久化目錄
 * （例：/var/lib/flowpilot），該目錄要在備份範圍內。
 */
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const instance = new Database(path.join(DATA_DIR, "flowpilot.db"));

  // WAL：併發讀不阻塞寫；FULL 同步保證斷電不丟已提交事務
  instance.pragma("journal_mode = WAL");
  instance.pragma("synchronous = FULL");
  instance.pragma("foreign_keys = ON");

  migrate(instance);
  _db = instance;
  return instance;
}

function migrate(d: Database.Database) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      display_name  TEXT NOT NULL,
      password_hash TEXT NOT NULL,   -- scrypt 派生密鑰（hex）
      password_salt TEXT NOT NULL,   -- 每用戶隨機鹽（hex）
      created_at    TEXT NOT NULL
    );

    -- 只存 session token 的 SHA-256，庫被讀走也無法直接冒用
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      user_agent TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS conversations (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS messages (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role            TEXT NOT NULL CHECK (role IN ('user','assistant')),
      content         TEXT NOT NULL,
      intent_json     TEXT,
      events_json     TEXT,
      created_at      TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id, id);

    -- 執行記錄獨立成表：合規審計要能單獨查，不用翻聊天記錄
    CREATE TABLE IF NOT EXISTS transfers (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
      to_address      TEXT NOT NULL,
      amount_usdc     REAL NOT NULL,
      tx_hash         TEXT NOT NULL,
      explorer_url    TEXT,
      simulated       INTEGER NOT NULL,
      screened_ok     INTEGER NOT NULL,
      created_at      TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_transfer_user ON transfers(user_id, created_at DESC);
  `);
}

export function nowISO(): string {
  return new Date().toISOString();
}
