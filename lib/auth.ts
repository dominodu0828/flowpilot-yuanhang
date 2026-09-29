import crypto from "crypto";
import { cookies } from "next/headers";
import { db, nowISO } from "./db";

/**
 * 認證：Node 內建 scrypt 派生密鑰 + 資料庫 session。
 * 不引入 bcrypt/JWT 依賴——少一個原生模塊，部署到境內服務器少一個裝不上的風險。
 */

const COOKIE = "fp_session";
const SESSION_DAYS = 30;

// scrypt 參數：N=16384 約 100ms/次，足以讓離線爆破不划算，又不拖慢登入
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

export interface User {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}

/* --------------------------------- 密碼 --------------------------------- */

function derive(password: string, salt: Buffer): Buffer {
  return crypto.scryptSync(password, salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    maxmem: 64 * 1024 * 1024,
  });
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  return { hash: derive(password, salt).toString("hex"), salt: salt.toString("hex") };
}

function verifyPassword(password: string, hashHex: string, saltHex: string): boolean {
  const expected = Buffer.from(hashHex, "hex");
  const actual = derive(password, Buffer.from(saltHex, "hex"));
  // 長度不等時 timingSafeEqual 會拋，先擋掉
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

/* -------------------------------- Session ------------------------------- */

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createSession(userId: string, userAgent: string | null): string {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  db()
    .prepare(
      `INSERT INTO sessions (token_hash, user_id, created_at, expires_at, user_agent)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(hashToken(token), userId, nowISO(), expires.toISOString(), userAgent?.slice(0, 300) ?? null);
  return token;
}

async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production", // 生產環境務必掛 HTTPS
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

/** 讀取當前登入用戶；順手清掉過期 session。未登入返回 null。 */
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const row = db()
    .prepare(
      `SELECT u.id, u.email, u.display_name, u.created_at, s.expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?`
    )
    .get(hashToken(token)) as (User & { expires_at: string }) | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db().prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(hashToken(token));
    return null;
  }

  const { expires_at, ...user } = row;
  return user;
}

export async function logout() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (token) db().prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(hashToken(token));
  cookieStore.delete(COOKIE);
}

/* --------------------------------- 註冊 --------------------------------- */

export type AuthResult = { ok: true; user: User } | { ok: false; error: string };

export async function register(input: {
  email: string;
  password: string;
  displayName: string;
  userAgent: string | null;
}): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim() || email.split("@")[0];

  const invalid = validateCredentials(email, input.password);
  if (invalid) return { ok: false, error: invalid };

  const exists = db().prepare(`SELECT 1 FROM users WHERE email = ?`).get(email);
  if (exists) return { ok: false, error: "此信箱已註冊，請直接登入" };

  const { hash, salt } = hashPassword(input.password);
  const user: User = {
    id: crypto.randomUUID(),
    email,
    display_name: displayName.slice(0, 60),
    created_at: nowISO(),
  };

  db()
    .prepare(
      `INSERT INTO users (id, email, display_name, password_hash, password_salt, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(user.id, user.email, user.display_name, hash, salt, user.created_at);

  await setSessionCookie(createSession(user.id, input.userAgent));
  return { ok: true, user };
}

/* --------------------------------- 登入 --------------------------------- */

// 進程內限流。單機夠用；多實例部署要換成 Redis 或資料庫計數。
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

function throttled(key: string): boolean {
  const rec = attempts.get(key);
  if (!rec || Date.now() > rec.resetAt) {
    attempts.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_ATTEMPTS;
}

export async function login(input: {
  email: string;
  password: string;
  userAgent: string | null;
}): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();

  if (throttled(`login:${email}`)) {
    return { ok: false, error: "嘗試次數過多，請 10 分鐘後再試" };
  }

  const row = db()
    .prepare(
      `SELECT id, email, display_name, created_at, password_hash, password_salt
         FROM users WHERE email = ?`
    )
    .get(email) as
    | (User & { password_hash: string; password_salt: string })
    | undefined;

  // 帳號不存在與密碼錯誤返回同一句話，避免洩露哪些信箱已註冊
  const GENERIC = "信箱或密碼錯誤";
  if (!row) {
    derive("dummy", crypto.randomBytes(16)); // 補一次等時開銷，防止用響應時間探測
    return { ok: false, error: GENERIC };
  }
  if (!verifyPassword(input.password, row.password_hash, row.password_salt)) {
    return { ok: false, error: GENERIC };
  }

  attempts.delete(`login:${email}`);
  await setSessionCookie(createSession(row.id, input.userAgent));
  return {
    ok: true,
    user: { id: row.id, email: row.email, display_name: row.display_name, created_at: row.created_at },
  };
}

/* -------------------------------- 校驗 ---------------------------------- */

function validateCredentials(email: string, password: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "信箱格式不正確";
  if (email.length > 254) return "信箱過長";
  if (password.length < 8) return "密碼至少 8 個字元";
  if (password.length > 200) return "密碼過長";
  // 只擋最弱的一類，不做複雜度硬性要求（長度比字符種類更有效）
  if (/^\d+$/.test(password)) return "密碼不能全是數字";
  return null;
}
