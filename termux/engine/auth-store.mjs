import { createClient } from "@supabase/supabase-js";
import { initAuthCreds } from "@whiskeysockets/baileys";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || "";

const supabase =
  URL && KEY
    ? createClient(URL, KEY)
    : null;

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

// جلسة Baileys «صالحة للاستئناف» فقط عندما يكون مسارها سليماً:
//  - مسجّلة بالكامل (registered=true) مع me → جهاز مرتبط فعلياً.
//  - أو في أول إنشاء نظيف (initAuthCreds) قبل أي اقتران: لا me بعد.
//  - أو في مرحلة الاقتران (registered=undefined/false مع me) → محاولة اقتران قائمة
// أي creds تحتوي me لكن registered=false = «نصف اقتران» من محاولة قديمة
// (نتيجة طلب pairing code سابق) → تُعد تالتة وتُعاد ضبطها من الصفر؛
// وإلا رفض واتساب إعادة الاتصال بها دائماً بـ 401 loggedOut.
function isResumableSession(creds) {
  if (!creds || typeof creds !== "object") return false;
  
  // البيانات الفارغة غير صالحة - لازم نبدأ من جديد
  if (Object.keys(creds).length === 0) return false;

  // جلسة مسجلة بالكامل بنجاح مع خوادم واتساب
  if (creds.registered === true) {
    return !!creds.me?.id && hasValidCreds(creds);
  }

  // إذا كانت تحتوي على me لكن registered غير مكتمل، فهذه محاولة اقتران سابقة غير مكتملة
  // خوادم واتساب ترفض استئنافها وتطلق 401 loggedOut، لذلك يجب ضبطها من الصفر
  if (creds.me?.id) {
    return false;
  }

  // جلسة نظيفة قبل الاقتران تحتوي على المفاتيح الأساسية
  return !!(creds.noiseKey && creds.signedIdentityKey);
}

export async function createSupabaseAuthStore(botId) {
  if (!supabase) {
    throw new Error(
      "[auth-store] بيانات Supabase غير متوفرة! يرجى ضبط SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في ملف .env أو .env.local"
    );
  }
  const { data: credRow } = await supabase
    .from("bot_auth")
    .select("creds")
    .eq("bot_id", botId)
    .single();

  let creds = credRow?.creds || null;

  // تسجيل للتشخيص (بدون كشف الأسرار)
  if (creds) {
    const fieldTypes = {};
    for (const [k, v] of Object.entries(creds)) {
      if (v === null) fieldTypes[k] = "null";
      else if (v === undefined) fieldTypes[k] = "undefined";
      else if (Buffer.isBuffer(v)) fieldTypes[k] = `Buffer(${v.length})`;
      else if (v instanceof Uint8Array) fieldTypes[k] = `Uint8Array(${v.length})`;
      else if (typeof v === "object" && v.constructor && v.constructor.name === "Object") fieldTypes[k] = "Object";
      else if (Array.isArray(v)) fieldTypes[k] = `Array(${v.length})`;
      else fieldTypes[k] = typeof v;
    }
    console.log(`[auth-store] ${botId}: loaded creds - registered=${creds.registered}, hasMe=${!!creds.me?.id}, fields=${JSON.stringify(fieldTypes)}`);
  }

  // نبدأ من صفر فقط عندما تكون creds تالفة فعلياً أو مُفقَدة، وليس عندما تكون مجرد حالة
  // اقتران غير مسجلة. الحالة `registered=false` طبيعية في Baileys وتُستخدم أثناء الطلب
  // أو إنشاء زوج الاقتران، لذلك لا نحذفها.
  if (!isResumableSession(creds)) {
    if (creds) {
      console.log(`[auth-store] ${botId}: malformed creds detected; resetting auth state`);
      await supabase.from("bot_auth").delete().eq("bot_id", botId);
      await supabase.from("bot_keys").delete().eq("bot_id", botId);
      creds = null;
    } else {
      console.log(`[auth-store] ${botId} no creds, will initialize fresh`);
    }
    creds = initAuthCreds();
    console.log(`[auth-store] ${botId}: initialized fresh creds - keys=${Object.keys(creds).join(',')}`);
    await supabase.from("bot_auth").upsert({
      bot_id: botId,
      creds: deepBufferSafe(creds),
      updated_at: new Date().toISOString(),
    });
  }

  const { data: keysRows } = await supabase
    .from("bot_keys")
    .select("category, key_id, data")
    .eq("bot_id", botId)
    .limit(50000);

  const keysByCategory = new Map();
  for (const r of (keysRows || [])) {
    if (!keysByCategory.has(r.category)) keysByCategory.set(r.category, new Map());
    keysByCategory.get(r.category).set(r.key_id, deepFromBufferSafe(r.data));
  }

  const authState = { creds: deepFromBufferSafe(creds), keys: null };

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
            });
          }
        }

        if (toDelete.length > 0) {
          await supabase
            .from("bot_keys")
            .delete()
            .eq("bot_id", botId)
            .eq("category", category)
            .in("key_id", toDelete);
        }
        if (toUpsert.length > 0) {
          await supabase.from("bot_keys").upsert(toUpsert);
        }
      }
    },
    async remove(category, ids) {
      const catMap = keysByCategory.get(category);
      if (ids && ids.length) {
        if (catMap) {
          for (const id of ids) catMap.delete(id);
        }
        await supabase.from("bot_keys").delete().eq("bot_id", botId).eq("category", category).in("key_id", ids);
      } else if (category) {
        keysByCategory.delete(category);
        await supabase.from("bot_keys").delete().eq("bot_id", botId).eq("category", category);
      } else {
        keysByCategory.clear();
        await supabase.from("bot_keys").delete().eq("bot_id", botId);
      }
    },
    async clear() {
      keysByCategory.clear();
      await supabase.from("bot_keys").delete().eq("bot_id", botId);
    },
    async transaction(work) {
      return await work();
    },
  };

  authState.keys = keysStore;

  const saveCreds = async (newCreds) => {
    if (newCreds && typeof newCreds === "object") {
      Object.assign(authState.creds, newCreds);
    }
    try {
      // Buffers → JSON آمن (base64) قبل الحفظ في Supabase
      await supabase
        .from("bot_auth")
        .upsert({ bot_id: botId, creds: deepBufferSafe(authState.creds), updated_at: new Date().toISOString() });
    } catch (err) {
      console.error(`[auth-store] Failed to save creds for ${botId}:`, err.message);
    }
  };

  return { state: authState, saveCreds };
}

export { hasValidCreds };