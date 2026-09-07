import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminUser(user)) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}