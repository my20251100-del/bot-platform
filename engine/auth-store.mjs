import { createClient } from "@supabase/supabase-js";
import { initAuthCreds } from "@whiskeysockets/baileys";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(URL, KEY);

function toBufferSafe(v) {
  if (Buffer.isBuffer(v)) return { __buffer: true, data: v.toString("base64") };
  if (v instanceof Uint8Array) return { __buffer: true, data: Buffer.from(v).toString("base64") };
  if (v && typeof v === "object" && v.constructor && v.constructor.name === "Object") return v;
  return v;
}
function fromBufferSafe(v) {
  if (v && typeof v === "object" && v.__buffer) return Buffer.from(v.data, "base64");
  return v;
}
function deepBufferSafe(obj) {
  if (Buffer.isBuffer(obj)) return toBufferSafe(obj);
  if (obj instanceof Uint8Array) return toBufferSafe(obj);
  if (Array.isArray(obj)) return obj.map(deepBufferSafe);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, val] of Object.entries(obj)) out[k] = deepBufferSafe(val);
    return out;
  }
  return toBufferSafe(obj);
}
function deepFromBufferSafe(obj) {
  if (Buffer.isBuffer(obj)) return obj;
  if (obj instanceof Uint8Array) return obj;
  if (obj && typeof obj === "object" && obj.__buffer && typeof obj.data === "string") {
    return Buffer.from(obj.data, "base64");
  }
  if (Array.isArray(obj)) return obj.map(deepFromBufferSafe);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, val] of Object.entries(obj)) out[k] = deepFromBufferSafe(val);
    return out;
  }
  return fromBufferSafe(obj);
}

const REQUIRED_CREDS_FIELDS = [
  "noiseKey",
  "pairingEphemeralKeyPair",
  "signedIdentityKey",
  "advSecretKey",
  "firstUnuploadedPreKeyId",
  "nextPreKeyId",
  "registrationId",
  "accountSyncCounter",
  "accountSettings",
  "processedHistoryMessages",
];

function hasValidCreds(creds) {
  if (!creds || typeof creds !== "object") return false;
  for (const field of REQUIRED_CREDS_FIELDS) {
    if (!(field in creds)) return false;
    const val = creds[field];
    if (val === null || val === undefined) return false;
    if (field === "noiseKey" || field === "pairingEphemeralKeyPair" || field === "signedIdentityKey") {
      if (!val.public || !val.private) return false;
    }
  }
  return true;
}

export async function createSupabaseAuthStore(botId) {
  const { data: credRow } = await supabase
    .from("bot_auth")
    .select("creds")
    .eq("bot_id", botId)
    .single();

  let creds = credRow?.creds || null;

  if (!hasValidCreds(creds)) {
    console.log(`[auth-store] Invalid or missing creds for ${botId}, will initialize fresh`);
    creds = initAuthCreds();
    await supabase.from("bot_auth").upsert({
      bot_id: botId,
      creds: deepBufferSafe(creds),
      updated_at: new Date().toISOString(),
    });
  }

  const { data: keysRows } = await supabase
    .from("bot_keys")
    .select("category, key_id, data")
    .eq("bot_id", botId);

  const keysByCategory = new Map();
  for (const r of (keysRows || [])) {
    if (!keysByCategory.has(r.category)) keysByCategory.set(r.category, new Map());
    keysByCategory.get(r.category).set(r.key_id, deepFromBufferSafe(r.data));
  }

  const keysStore = {
    async get(category, ids) {
      const map = keysByCategory.get(category);
      if (!map) return {};
      const result = {};
      for (const id of ids) {
        if (map.has(id)) result[id] = deepFromBufferSafe(map.get(id));
      }
      return result;
    },
    async set(data) {
      const cats = Object.keys(data);
      for (const [category, idMap] of Object.entries(data)) {
        await supabase.from("bot_keys").delete().eq("bot_id", botId).eq("category", category);
        for (const [keyId, value] of Object.entries(idMap)) {
          await supabase
            .from("bot_keys")
            .upsert({ bot_id: botId, category, key_id: keyId, data: deepBufferSafe(value) });
        }
      }
    },
    async remove(category, ids) {
      if (ids) {
        await supabase.from("bot_keys").delete().eq("bot_id", botId).eq("category", category).in("key_id", ids);
      } else if (category) {
        await supabase.from("bot_keys").delete().eq("bot_id", botId).eq("category", category);
      } else {
        await supabase.from("bot_keys").delete().eq("bot_id", botId);
      }
    },
    async clear() {
      await supabase.from("bot_keys").delete().eq("bot_id", botId);
    },
  };

  const saveCreds = async (newCreds) => {
    if (!newCreds || typeof newCreds !== "object") {
      console.warn(`[auth-store] Ignoring invalid creds save for ${botId}`);
      return;
    }
    // Buffers → JSON آمن (base64) قبل الحفظ في Supabase
    await supabase
      .from("bot_auth")
      .upsert({ bot_id: botId, creds: deepBufferSafe(newCreds), updated_at: new Date().toISOString() });
  };

  return { state: { creds: deepFromBufferSafe(creds), keys: keysStore }, saveCreds };
}

export { hasValidCreds };