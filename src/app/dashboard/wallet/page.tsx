import { createClient } from "@/lib/supabase/server";
import ReferralBox from "./referral-box";

export const dynamic = "force-dynamic";

const typeLabels: Record<string, string> = {
  deposit: "إيداع",
  bonus: "مكافأة",
  referral: "مكافأة إحالة",
  usage: "استهلاك",
};

export default async function WalletPage() {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, wallet_balance, referral_code")
    .single();

  const [{ count }, { data: refTx }, { data: transactions }] = await Promise.all([
    profile
      ? supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("referred_by", profile.id)
      : Promise.resolve({ count: 0 }),
    supabase.from("transactions").select("amount").eq("type", "referral"),
    supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const earnedFromReferrals =
    refTx?.reduce((sum, t) => sum + (t.amount ?? 0), 0) ?? 0;

  const referralUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/signup?ref=${profile?.referral_code ?? ""}`;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-8 text-2xl font-bold">المحفظة والإحالات</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-6">
          <p className="text-sm text-muted">الرصيد الحالي</p>
          <p className="mt-2 text-4xl font-bold text-accent">
            {profile?.wallet_balance ?? 0} <span className="text-lg text-muted">كريدت</span>
          </p>
          <p className="mt-3 text-xs text-muted">تُستخدم الكريدت لوقت تشغيل البوت.</p>
        </div>

        <ReferralBox
          url={referralUrl}
          code={profile?.referral_code ?? ""}
          count={count ?? 0}
          earned={earnedFromReferrals}
        />
      </div>

      <h2 className="mb-4 mt-10 text-lg font-semibold">آخر المعاملات</h2>
      {!transactions?.length ? (
        <div className="card p-10 text-center text-muted">لا توجد معاملات بعد.</div>
      ) : (
        <div className="card divide-y divide-border/60">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <h3 className="font-medium">{typeLabels[t.type] ?? t.type}</h3>
                <p className="text-sm text-muted">{t.description}</p>
              </div>
              <span dir="ltr" className={`font-mono font-semibold ${t.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {t.amount >= 0 ? "+" : ""}{t.amount}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
