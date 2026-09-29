import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import LanguageToggle from "@/components/LanguageToggle";
import { currentUser } from "@/lib/auth";
import { languageFromCookie } from "@/lib/i18n";
import BrandMark from "@/components/BrandMark";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  const language = languageFromCookie((await cookies()).get("flowpilot_lang")?.value);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="animate-materialize mb-7 text-center">
        <BrandMark className="mx-auto mb-3 h-12 w-12 rounded-[14px]" />
        <h1
          style={{ fontSize: "1.625rem", lineHeight: 1.15, letterSpacing: "-0.026em", fontWeight: 620 }}
        >
          <span className="text-ink">Flow</span><span className="text-jade">Pilot</span> <span className="text-slate" style={{ fontWeight: 500 }}>{language === "en" ? "" : "远航"}</span>
        </h1>
        <p className="mt-1.5 text-[0.875rem] text-label-2">
          {language === "en" ? "Compliant cross-border payment agent for China–Thailand micro-merchants" : "面向中泰跨境小微商户的合规支付智能体"}
        </p>
      </div>

      <div className="mb-4">
        <LanguageToggle language={language} />
      </div>
      <AuthForm language={language} />
    </main>
  );
}
