// ============================================================================
// Bot Platform — Resilient Supabase Auth Store for Baileys
// Production Grade: Debounced Writes, Memory Caching, Auto-Recovery
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import { initAuthCreds } from "@whiskeysockets/baileys";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dynamic environment loading: ensures Supabase credentials are always found
function loadEnv() {
  for (const envFile of [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(__dirname, ".env.local"),
    path.resolve(__dirname, ".env"),
    path.resolve(__dirname, "..", ".env.local"),
    path.resolve(__dirname, "..", ".env"),
  ]) {
    try {
      if (existsSync(envFile)) {
        const content = readFileSync(envFile, "utf8");
        for (const rawLine of content.split(/\r?\n/)) {
          const line = rawLine.trim();
          if (!line || line.startsWith("#")) continue;
          const eq = line.indexOf("=");
          if (eq === -1) continue;
          const k = line.slice(0, eq).trim();
          const v = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
          if (k && !process.env[k]) process.env[k] = v;
        }
      }
    } catch {}
  }
}

let _supabase = null;
export function getSupabase() {
  if (_supabase) return _supabase;
  loadEnv();
  const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || "";
  if (URL && KEY) {
    _supabase = createClient(URL, KEY, {
      auth: { persistSession: false },
    });
  }
  return _supabase;
}

function toBufferSafe(v) {
  if (Buffer.isBuffer(v)) return { __buffer: true, data: v.toString("base64") };
  if (v instanceof Uint8Array) return { __buffer: true, data: Buffer.from(v).toString("base64") };
  if (v && typeof v === "object" && v.constructor && v.constructor.name === "Object") return v;
  return v;
}

function fromBufferSafe(v) {
  if (v && typeof v === "object" && v.__buffer && typeof v.data === "string") {
    return Buffer.from(v.data, "base64");
  }
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

function isResumableSession(creds) {
  if (!creds || typeof creds !== "object") return false;
  // If registered with an account, it's fully resumable
  if (creds.registered && creds.me) return true;
  if (hasValidCreds(creds)) return true;
  // If in initial pairing stage with fundamental keys
  return Boolean(creds.noiseKey && creds.signedIdentityKey);
}

// Global registry of active debounced cred savers for clean flushing
const activeSavers = new Map();

export async function flushAllCreds() {
  const promises = [];
  for (const saver of activeSavers.values()) {
    if (typeof saver.flush === "function") {
      promises.push(saver.flush());
    }
  }
  await Promise.allSettled(promises);
}

export async function createSupabaseAuthStore(botId) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error(
      "[auth-store] Supabase credentials not found. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  // Load creds
  const { data: credRow, error: credErr } = await supabase
    .from("bot_auth")
    .select("creds")
    .eq("bot_id", botId)
    .maybeSingle();

  if (credErr) {
    console.warn(`[auth-store][${botId}] warning loading creds:`, credErr.message);
  }

  let creds = credRow?.creds || null;

  if (!isResumableSession(creds)) {
    if (creds) {
      console.log(`[auth-store][${botId}] resetting malformed session state`);
      await supabase.from("bot_auth").delete().eq("bot_id", botId);
      await supabase.from("bot_keys").delete().eq("bot_id", botId);
      creds = null;
    }
    creds = initAuthCreds();
    console.log(`[auth-store][${botId}] initialized fresh auth creds`);
    await supabase.from("bot_auth").upsert({
      bot_id: botId,
      creds: deepBufferSafe(creds),
      updated_at: new Date().toISOString(),
    });
  }

  // Pre-load keys into memory
  const { data: keysRows } = await supabase
    .from("bot_keys")
    .select("category, key_id, data")
    .eq("bot_id", botId)
    .limit(50000);

  const keysByCategory = new Map();
  for (const r of keysRows || []) {
    if (!keysByCategory.has(r.category)) keysByCategory.set(r.category, new Map());
    keysByCategory.get(r.category).set(r.key_id, deepFromBufferSafe(r.data));
  }

  const loadedCreds = deepFromBufferSafe(creds);
  if (loadedCreds && !loadedCreds.registered && loadedCreds.me) {
    delete loadedCreds.me;
  }
  const authState = { creds: loadedCreds, keys: null };

  const keysStore = {
    async get(category, ids) {
      if (!keysByCategory.has(category)) keysByCategory.set(category, new Map());
      const map = keysByCategory.get(category);
      const missing = ids.filter((id) => !map.has(id));

      if (missing.length > 0) {
        const { data: fetched } = await supabase
          .from("bot_keys")
          .select("key_id, data")
          .eq("bot_id", botId)
          .eq("category", category)
          .in("key_id", missing);

        if (fetched) {
          for (const f of fetched) {
            map.set(f.key_id, deepFromBufferSafe(f.data));
          }
        }
      }

      const result = {};
      for (const id of ids) {
        if (map.has(id)) result[id] = deepFromBufferSafe(map.get(id));
      }
      return result;
    },

    async set(data) {
      for (const [category, idMap] of Object.entries(data)) {
        if (!keysByCategory.has(category)) keysByCategory.set(category, new Map());
        const catMap = keysByCategory.get(category);
        const toUpsert = [];
        const toDelete = [];

        for (const [keyId, value] of Object.entries(idMap)) {
          if (!value) {
            catMap.delete(keyId);
            toDelete.push(keyId);
          } else {
            catMap.set(keyId, value);
            toUpsert.push({
              bot_id: botId,
              category,
              key_id: keyId,
              data: deepBufferSafe(value),
              updated_at: new Date().toISOString(),
            });
          }
        }

        if (toDelete.length > 0) {
          try {
            await supabase
              .from("bot_keys")
              .delete()
              .eq("bot_id", botId)
              .eq("category", category)
              .in("key_id", toDelete);
          } catch (err) {
            console.warn(`[auth-store][${botId}] key delete error:`, err?.message || err);
          }
        }

        if (toUpsert.length > 0) {
          try {
            await supabase
              .from("bot_keys")
              .upsert(toUpsert);
          } catch (err) {
            console.warn(`[auth-store][${botId}] key upsert error:`, err?.message || err);
          }
        }
      }
    },

    async remove(category, ids) {
      const catMap = keysByCategory.get(category);
      if (ids && ids.length) {
        if (catMap) {
          for (const id of ids) catMap.delete(id);
        }
        try {
          await supabase
            .from("bot_keys")
            .delete()
            .eq("bot_id", botId)
            .eq("category", category)
            .in("key_id", ids);
        } catch (err) {
          console.warn(`[auth-store][${botId}] remove error:`, err?.message || err);
        }
      } else if (category) {
        keysByCategory.delete(category);
        try {
          await supabase
            .from("bot_keys")
            .delete()
            .eq("bot_id", botId)
            .eq("category", category);
        } catch (err) {
          console.warn(`[auth-store][${botId}] remove category error:`, err?.message || err);
        }
      } else {
        keysByCategory.clear();
        try {
          await supabase
            .from("bot_keys")
            .delete()
            .eq("bot_id", botId);
        } catch (err) {
          console.warn(`[auth-store][${botId}] clear keys error:`, err?.message || err);
        }
      }
    },

    async clear() {
      keysByCategory.clear();
      try {
        await supabase
          .from("bot_keys")
          .delete()
          .eq("bot_id", botId);
      } catch (err) {
        console.warn(`[auth-store][${botId}] clear error:`, err?.message || err);
      }
    },

    async transaction(work) {
      return await work();
    },
  };

  authState.keys = keysStore;

  let closed = false;
  let saveTimer = null;
  let isSaving = false;
  let pendingSave = false;

  const doSave = async () => {
    if (closed) return;
    if (isSaving) {
      pendingSave = true;
      return;
    }
    isSaving = true;
    try {
      if (closed) return;
      const payload = deepBufferSafe(authState.creds);
      if (payload && !authState.creds?.registered && payload.me) {
        delete payload.me;
      }
      await supabase.from("bot_auth").upsert({
        bot_id: botId,
        creds: payload,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn(`[auth-store][${botId}] debounced save error (will retry):`, err.message);
    } finally {
      isSaving = false;
      if (pendingSave && !closed) {
        pendingSave = false;
        setTimeout(doSave, 300);
      }
    }
  };

  const saveCreds = async (newCreds) => {
    if (closed) return;
    if (newCreds && typeof newCreds === "object") {
      Object.assign(authState.creds, newCreds);
    }
    if (authState.creds?.registered) {
      if (saveTimer) clearTimeout(saveTimer);
      await doSave();
      return;
    }
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 300);
  };

  const clearStore = async () => {
    closed = true;
    if (saveTimer) clearTimeout(saveTimer);
    pendingSave = false;
    activeSavers.delete(botId);
    try {
      await supabase.from("bot_auth").delete().eq("bot_id", botId);
      await supabase.from("bot_keys").delete().eq("bot_id", botId);
    } catch (err) {
      console.warn(`[auth-store][${botId}] clearStore error:`, err?.message || err);
    }
  };

  const saver = {
    flush: async () => {
      if (closed) return;
      if (saveTimer) clearTimeout(saveTimer);
      await doSave();
    },
    destroy: () => {
      closed = true;
      if (saveTimer) clearTimeout(saveTimer);
      pendingSave = false;
      activeSavers.delete(botId);
    },
  };

  activeSavers.set(botId, saver);

  return {
    state: authState,
    saveCreds,
    flushCreds: saver.flush,
    destroyStore: saver.destroy,
    clearStore,
  };
}

export { hasValidCreds, isResumableSession };