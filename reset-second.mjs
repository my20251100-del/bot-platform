import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetSecondBot() {
  console.log("Fetching bots...");
  const { data: bots } = await supabase.from("bots").select("*").eq("phone", "967712343137");
  
  if (!bots || bots.length === 0) {
    console.log("Second bot not found.");
    return;
  }
  
  const botId = bots[0].id;
  console.log(`Found bot: ${botId}. Resetting auth...`);
  
  // Clear auth and keys
  await supabase.from("bot_auth").delete().eq("bot_id", botId);
  await supabase.from("bot_keys").delete().eq("bot_id", botId);
  
  // Update bot status to pending so Railway engine attempts to pair it again
  await supabase.from("bots").update({ 
    status: "pending", 
    qr: null, 
    pair_code: null,
    linked_number: null
  }).eq("id", botId);
  
  console.log("Reset successful. The Railway engine will now try to generate a new code for it.");
}

resetSecondBot();
