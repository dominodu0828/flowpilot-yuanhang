"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import type { Language } from "@/lib/i18n";

type Mode = "login" | "register";

export default function AuthForm({ language }: { language: Language }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);

  const emailError =
    touched.email && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? language === "en" ? "Enter a valid email address." : "请输入有效邮箱。"
      : null;
  const passwordError =
    touched.password && password && mode === "register"
      ? password.length < 8
        ? language === "en" ? "Use at least 8 characters." : "密码至少 8 位。"
        : /^\d+$/.test(password)
          ? language === "en" ? "Password cannot contain only numbers." : "密码不能全是数字。"
          : null
      : null;

  const canSubmit = email.length > 0 && password.length > 0 && !emailError && !passwordError && !busy;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setServerError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? (language === "en" ? "Operation failed." : "操作失败。"));
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : language === "en" ? "Network error." : "网络错误。");
    } finally {
      setBusy(false);
    }
  }

  async function enterDemo() {
    setDemoBusy(true);
    setServerError(null);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? (language === "en" ? "Demo login is unavailable." : "Demo 登录暂不可用。"));
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : language === "en" ? "Demo login failed." : "Demo 登录失败。");
    } finally {
      setDemoBusy(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setServerError(null);
    setTouched({});
  }

  const en = language === "en";

  return (
    <form onSubmit={submit} className="animate-materialize w-full max-w-[22rem]">
      <div role="tablist" aria-label={en ? "Login or register" : "登录或注册"} className="material-chip mb-5 grid grid-cols-2 gap-1 rounded-full p-1">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={`pressable rounded-full py-1.5 text-[0.8125rem] font-medium ${mode === m ? "bg-white/14 text-label" : "text-label-2 hover:text-label"}`}
          >
            {m === "login" ? (en ? "Log in" : "登录") : (en ? "Register" : "注册")}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {mode === "register" && (
          <Field
            label={en ? "Display name" : "显示名称"}
            hint={en ? "optional" : "可选"}
            value={displayName}
            onChange={setDisplayName}
            autoComplete="nickname"
            placeholder={en ? "Your name" : "你的称呼"}
          />
        )}
        <Field
          label={en ? "Email" : "邮箱"}
          type="email"
          value={email}
          onChange={setEmail}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={emailError}
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
        <Field
          label={en ? "Password" : "密码"}
          type="password"
          value={password}
          onChange={setPassword}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={passwordError}
          hint={mode === "register" ? (en ? "8+ characters" : "至少 8 位") : undefined}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          placeholder="••••••••"
          required
        />
      </div>

      {serverError && (
        <p role="alert" className="animate-materialize mt-3 flex items-start gap-2 rounded-[12px] border border-red/25 bg-red/10 px-3 py-2 text-[0.8125rem] text-red">
          <span aria-hidden>!</span><span>{serverError}</span>
        </p>
      )}

      <button type="submit" disabled={!canSubmit} className="pressable mt-5 w-full rounded-full bg-blue py-3 text-[0.9375rem] font-medium text-white disabled:bg-white/10 disabled:text-label-3">
        {busy ? (en ? "Working…" : "处理中…") : mode === "login" ? (en ? "Log in" : "登录") : (en ? "Create account" : "创建账号")}
      </button>

      {mode === "login" && (
        <button type="button" onClick={enterDemo} disabled={busy || demoBusy} className="pressable mt-2 w-full rounded-full border border-white/12 py-2.5 text-[0.8125rem] font-medium text-label-2 hover:bg-white/[0.06] disabled:opacity-50">
          {demoBusy ? (en ? "Entering demo…" : "正在进入 Demo…") : (en ? "Enter demo" : "一键进入 Demo")}
        </button>
      )}

      <p className="type-caption mt-4 text-center leading-relaxed text-label-3">
        {en ? "Passwords are scrypt-hashed; plaintext is never stored." : "密码使用 scrypt 加密，服务器不保存明文。"}<br />
        {en ? "Demo environment: all transactions run on a testnet (Base Sepolia); no real funds are involved." : "演示环境：所有交易均在测试网执行，不涉及真实资金"}
      </p>
    </form>
  );
}

function Field({ label, hint, error, value, onChange, onBlur, type = "text", ...rest }: {
  label: string; hint?: string; error?: string | null; value: string; onChange: (v: string) => void; onBlur?: () => void; type?: string;
  autoComplete?: string; placeholder?: string; required?: boolean;
}) {
  const id = `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div>
      <label htmlFor={id} className="type-caption mb-1 flex items-baseline gap-1.5 text-label-2">{label}{hint && !error && <span className="text-label-3">{hint}</span>}</label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} className={`material-chip w-full rounded-[12px] px-3.5 py-2.5 text-[0.9375rem] outline-none transition-colors duration-200 placeholder:text-label-3 ${error ? "border-red/50 focus:border-red/70" : "focus:border-blue/50"}`} {...rest} />
      {error && <p id={`${id}-err`} className="type-caption mt-1 text-red">{error}</p>}
    </div>
  );
}
