import { createClient } from "@/lib/supabase/server";
import SiteHeaderClient from "./site-header-client";

export default async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <SiteHeaderClient
      user={
        user
          ? {
              id: user.id,
              email: user.email,
            }
          : null
      }
    />
  );
}