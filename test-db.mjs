import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    env[key] = val;
  }
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  const { data: bots, error: err1 } = await supabase
    .from("bots")
    .select("id, name, phone, status, settings, metadata, updated_at");
  console.log("Bots count:", bots?.length, "Error:", err1);
  console.log("Bots:", JSON.stringify(bots, null, 2));

  const { data: logs, error: err2 } = await supabase
    .from("bot_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(15);
  console.log("Recent logs:", JSON.stringify(logs, null, 2));
}

main().catch(console.error);
