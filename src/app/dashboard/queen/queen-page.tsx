"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { maskPhone } from "@/lib/phone";
import { Skeleton } from "@/components/ui/motion";
import QueenForm from "./queen-form";

export default function QueenPage() {
  const [bots, setBots] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [initial, setInitial] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("bots").select("id,name,linked_number,phone,settings");
      const list = data ?? [];
      setBots(list);
      setSelected(list[0]?.id ?? "");
      if (list[0]?.settings) setInitial(list[0].settings);
      setLoading(false);
    })();
  }, []);

  function pick(id: string) {
    setSelected(id);
    const b = bots.find((x) => x.id === id);
    setInitial(b?.settings ?? {});
  }

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="cyber-title text-2xl font-bold">👑 إعدادات QUEEN</h1>
        <p className="mt-2 text-muted">
          تحكم متقدم في سلوك البوت: التعرف على الحالة، التفاعل، الحفظ، وضع العمل والخصوصية.
        </p>
      </div>

      {bots.length === 0 ? (
        <p className="card p-6 text-muted">لا توجد بوتات بعد.</p>
      ) : (
        <>
          <div className="card p-6">
            <label className="mb-1.5 block text-sm font-medium">اختر البوت</label>
            <select className="input" value={selected} onChange={(e) => pick(e.target.value)}>
              {bots.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {maskPhone(b.linked_number || b.phone) || "غير متصل"}
                </option>
              ))}
            </select>
          </div>

          {initial && <QueenForm botId={selected} initial={initial} />}
        </>
      )}
    </div>
  );
}
