// Gemini AI integration for the WhatsApp bot.
// Uses the bot's own gemini_api_keys setting when present (comma/newline
// separated), otherwise falls back to the global GEMINI_API_KEY env var.
// Every call is wrapped so an upstream failure never crashes the process.

const FALLBACK_KEY = process.env.GEMINI_API_KEY || "";
const FALLBACK_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

export function firstUsableKey(geminiApiKeys) {
  if (geminiApiKeys && typeof geminiApiKeys === "string") {
    const candidates = geminiApiKeys
      .split(/[,\n]/)
      .map((k) => k.trim())
      .filter(Boolean);
    if (candidates.length) return candidates[0];
  }
  return FALLBACK_KEY || null;
}

/**
 * Ask Gemini for a reply based on an incoming WhatsApp message.
 * @param {object} settings bot_settings row (may have gemini_api_keys/ai_system_prompt)
 * @param {string} userMessage text from the sender
 * @returns {Promise<string|null>} generated response, or null on failure/no key
 */
export async function askGemini(settings, userMessage) {
  const key = firstUsableKey(settings?.gemini_api_keys);
  if (!key) {
    console.warn("[gemini] لا يوجد مفتاح (لا gemini_api_keys ولا GEMINI_API_KEY)");
    return null;
  }

  const model = settings?.gemini_model || FALLBACK_MODEL;
  const systemPrompt =
    settings?.ai_system_prompt ||
    "You are a helpful WhatsApp assistant. Reply concisely in Arabic.";

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}` +
    `:generateContent?key=${encodeURIComponent(key)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          { role: "user", parts: [{ text: String(userMessage).slice(0, 2000) }] },
        ],
        generationConfig: { maxOutputTokens: 300 },
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      console.error(`[gemini] HTTP ${res.status}:`, (await res.text()).slice(0, 200));
      return null;
    }

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts) || !parts.length) return null;
    return parts.map((p) => p.text || "").join(" ").trim() || null;
  } catch (e) {
    console.error("[gemini] failed:", e.message);
    return null;
  }
}
