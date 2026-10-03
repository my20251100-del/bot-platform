import { createClient } from "@/lib/supabase/server";
import { createAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import GroupsClient from "./groups-client";

export const metadata = {
  title: "إدارة المجموعات والترقية لمشرف — hatem X",
};

export default async function GroupsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createAdmin();
  const { data: bots } = await admin
    .from("bots")
    .select("id, name, phone, linked_number, status, metadata")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const botList = bots || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="cyber-title text-2xl font-bold flex items-center gap-2">
          <span>👑</span>
          <span>إدارة المجموعات والترقية لمشرف</span>
        </h1>
        <p className="mt-1 text-sm text-muted">
          اختر أي مجموعة يتواجد بها بوتك وقم بترقية نفسك (أو أي رقم آخر) إلى مشرف بضغطة زر واحدة أو عبر أوامر واتساب المباشرة.
        </p>
      </div>

      {botList.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          <p className="text-3xl mb-2">🤖</p>
          <p className="font-bold text-fg">لا يوجد لديك أي بوتات بعد</p>
          <p className="text-sm mt-1">قم بإنشاء بوت وربطه أولاً لتتمكن من إدارة مجموعاتك.</p>
        </div>
      ) : (
        <GroupsClient bots={botList} initialBotId={botList[0].id} />
      )}
    </div>
  );
}
