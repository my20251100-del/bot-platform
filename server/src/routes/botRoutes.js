import { Router } from "express";
import {
  pairBot,
  isReady,
  initBot,
  stopBot,
  updateBotSettings,
  getBotSettings,
  getBotStatus,
  sendMessage,
  getCachedQr,
  getSessionStatus,
  anyReady,
} from "../whatsappController.js";

const router = Router();

/**
 * POST /api/bot/pair
 * Body: { phoneNumber: "967772847565", botId: "uuid-or-id" }
 * Returns the 8-character pairing code immediately (no QR).
 */
router.post("/api/bot/pair", async (req, res, next) => {
  try {
    const { phoneNumber, botId } = req.body || {};
    if (!phoneNumber) return res.status(400).json({ error: "phoneNumber مطلوب" });
    if (!botId) return res.status(400).json({ error: "botId مطلوب" });
    const result = await pairBot(botId, phoneNumber);
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/bot/init
 * Body: { botId } — start a previously-linked bot in the background.
 */
router.post("/api/bot/init", async (req, res, next) => {
  try {
    const { botId } = req.body || {};
    if (!botId) return res.status(400).json({ error: "botId مطلوب" });
    res.status(200).json(initBot(botId));
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/bot/stop
 * Body: { botId } — يوقف/يزيل client البوت من الذاكرة ويميّزه على أنه disconnected.
 */
router.post("/api/bot/stop", async (req, res, next) => {
  try {
    const { botId } = req.body || {};
    if (!botId) return res.status(400).json({ error: "botId مطلوب" });
    res.status(200).json(await stopBot(botId));
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/bot/send
 * Body: { botId, to, text } — send a WhatsApp text from the bot.
 */
router.post("/api/bot/send", async (req, res, next) => {
  try {
    const { botId, to, text } = req.body || {};
    if (!botId) return res.status(400).json({ error: "botId مطلوب" });
    if (!to) return res.status(400).json({ error: "to مطلوب" });
    if (!text) return res.status(400).json({ error: "text مطلوب" });
    const result = await sendMessage(botId, to, text);
    res.status(200).json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/bot/status?botId=xxx  (lightweight readiness check)
 * بدون botId: يعيد true إذا كان أي بوت جاهزاً في الذاكرة.
 */
router.get("/api/bot/status", (req, res) => {
  const { botId } = req.query;
  res.status(200).json({ isReady: botId ? isReady(String(botId)) : anyReady() });
});

/**
 * POST /api/bot/qr
 * Body: { botId } — يبدأ جلسة WhatsApp بوضع QR (يعتمد على initBot +
 * التقاط الـ qr event وتخزينه). استخدم GET /api/bot/qr/:botId لعرضه.
 */
router.post("/api/bot/qr", (req, res, next) => {
  try {
    const { botId } = req.body || {};
    if (!botId) return res.status(400).json({ error: "botId مطلوب" });
    const result = initBot(botId);
    res.status(200).json({ ...result, hint: "انتظر لحظات ثم اسحب الـ QR عبر GET /api/bot/qr/:botId" });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/bot/qr/:botId — يعيد الـ QR الحالي المُلتقط (نص data URL).
 * إن لم يكن هناك QR بعد (ما زال في انتظار التوليد)، يعيد استجابة واضحة.
 */
router.get("/api/bot/qr/:botId", (req, res) => {
  const { botId } = req.params;
  const qr = getCachedQr(botId);
  const status = getSessionStatus(botId);
  if (!qr) {
    res.status(200).json({ available: false, status: status || "waiting", isReady: isReady(botId) });
    return;
  }
  res.status(200).json({ available: true, status, isReady: isReady(botId), qr });
});

/**
 * GET /api/bot/status/:botId — connection status + dashboard stats.
 */
router.get("/api/bot/status/:botId", async (req, res, next) => {
  try {
    const { botId } = req.params;
    if (!botId) return res.status(400).json({ error: "botId مطلوب" });
    res.status(200).json(await getBotStatus(botId));
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/bot/settings/:botId — fetch current settings.
 */
router.get("/api/bot/settings/:botId", async (req, res, next) => {
  try {
    res.status(200).json({ data: await getBotSettings(req.params.botId) });
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/bot/settings/:botId — upsert bot_settings.
 */
router.put("/api/bot/settings/:botId", async (req, res, next) => {
  try {
    const data = await updateBotSettings(req.params.botId, req.body || {});
    res.status(200).json({ data });
  } catch (e) {
    next(e);
  }
});

export default router;
