import { createClient } from "@supabase/supabase-js";

// عميل خادم موثَّق (service role) — يُستخدم حصراً في Route Handlers / Server Components
// لتشغيل تدفق العميل (الربط + كلمة السر) دون قيود RLS الخاصة بمستخدم مجهول.
export function createAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}
