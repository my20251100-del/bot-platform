import "dotenv/config";
import express from "express";
import cors from "cors";
import botRoutes from "./routes/botRoutes.js";
import { shutdownAll, startSynchronizer } from "./whatsappController.js";

// ---------------------------------------------------------------------------
// Environment validation — log clearly (without printing secret values) which
// required vars are missing so startup failures are obvious in the console.
// ---------------------------------------------------------------------------
const REQUIRED_ENV = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missingEnv = REQUIRED_ENV.filter((k) => !(process.env[k] || "").trim());
if (missingEnv.length) {
  console.warn(
    `[server] ⚠️ Missing required environment variables: ${missingEnv.join(", ")}. ` +
      "The HTTP API (/ping, /api/bot/status) will still boot, but Supabase " +
      "and WhatsApp connections will be disabled. Set them in the Back4App " +
      "dashboard / .env then redeploy."
  );
} else {
  const origin = (process.env.CLIENT_ORIGIN || "").trim() || "(not set — CORS open)";
  console.log(`[server] ✓ Supabase env present. CLIENT_ORIGIN=${origin}`);
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
// CORS: افتح للواجهة الأمامية المحدّدة في CLIENT_ORIGIN (أو عدة أصول مفصولة
// بفواصل)، وافتح للجميع عند غيابه (لتطوير/مرونة). مناسب للنشر السحابي.
const clientOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors(
    clientOrigins.length
      ? {
          origin(origin, callback) {
            if (!origin || clientOrigins.includes(origin)) return callback(null, true);
            callback(new Error("الأصل غير مسموح به — Not allowed by CORS"));
          },
        }
      : undefined
  )
);
app.use(express.json());

// Light request logger (helpful for Render cron pings)
app.use((req, _res, next) => {
  console.log(`[http] ${req.method} ${req.path}`);
  next();
});

// ---------------------------------------------------------------------------
// Ping endpoint — used by cron jobs to keep Render awake
// ---------------------------------------------------------------------------
app.get("/ping", (_req, res) => {
  res.status(200).json({ status: "alive" });
});

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.use(botRoutes);

// 404 fallback
app.use((_req, res) => res.status(404).json({ error: "المسار غير موجود" }));

// ---------------------------------------------------------------------------
// Central error handler — never crash the process
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[server] error:", err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ success: false, error: err.message || "خطأ داخلي في الخادم" });
});

// ---------------------------------------------------------------------------
// Boot + graceful shutdown
// ---------------------------------------------------------------------------
// Bind to 0.0.0.0 by default so cloud platforms (Back4App/Render) can route
// external traffic into the container regardless of the local interface. Allow
// overriding via HOST env (e.g. set HOST=0.0.0.0 in the dashboard if needed).
const HOST = (process.env.HOST || "0.0.0.0").trim();
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 WhatsApp Bot backend listening on ${HOST}:${PORT}`);
  console.log(`   Ping endpoint → GET /ping`);
});

// تشغيل البوتات المؤهَّلة تلقائياً + loop مزامنة دورية على جدول `bots`
// (يكتشف البوتات المُنشأة حديثاً أو تغيّر command=start/stop دون إعادة تشغيل).
// لا يُحبس الـ HTTP عند فشل أي بوت لأن كل خطأ يُعالج بأمان داخل المحرّك.
const syncHandle = startSynchronizer();
syncHandle.start(); // يبدأ حلقة المزامنة الدورية.
syncHandle.runOnce().catch((e) => {
  console.error("[WhatsApp] auto-boot failed:", e.message);
});

async function shutdown(signal) {
  console.log(`\n[server] ${signal} received — shutting down gracefully…`);
  syncHandle.stop(); // أوقف حلقة المزامنة أولاً حتى لا تُنشئ clients جديدة.
  server.close(async () => {
    try {
      await shutdownAll();
    } finally {
      process.exit(0);
    }
  });
  // Force-exit if clients can't close within 8s.
  setTimeout(() => process.exit(1), 8000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Safety net: unhandled rejections must not kill the server.
process.on("unhandledRejection", (reason) => {
  console.error("[server] unhandledRejection:", reason);
});
