"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="ml-1 flex-shrink-0 rounded-lg px-3 py-2 text-muted hover:bg-elevated hover:text-white"
    >
      خروج
    </button>
  );
}
