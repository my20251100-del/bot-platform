import { createClient } from "@/lib/supabase/server";
import { getLiveBotIds } from "@/lib/live-bots";
import DashboardLive from "./dashboard-live";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: bots }, { data: profile }, liveBotIds] = await Promise.all([
    supabase.from("bots").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("full_name, referral_code").single(),
    getLiveBotIds(5),
  ]);

  return (
    <DashboardLive
      bots={(bots ?? []).map((b) => ({ ...b, live: liveBotIds.has(b.id) }))}
      fullName={profile?.full_name ?? null}
      referralCode={profile?.referral_code ?? null}
    />
  );
}
