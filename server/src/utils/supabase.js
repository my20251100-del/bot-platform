// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------
// The modern @supabase/supabase-js (v2.10x+) requires a WebSocket for its
// realtime client. Node.js 18 and 20 do NOT ship a native global WebSocket
// (that only arrived in Node 22), so backends running on Node 18 fail with:
//   "Node.js detected but native WebSocket not found."
//
// Fix (works on ANY Node version):
//   1) Polyfill globalThis.WebSocket with the `ws` package BEFORE importing
//      supabase (its WebSocketFactory detects `typeof WebSocket !== undefined`).
//   2) Also pass the constructor explicitly via realtime.transport.
// ---------------------------------------------------------------------------

import { WebSocket } from "ws";

if (typeof globalThis !== "undefined" && !globalThis.WebSocket) {
  globalThis.WebSocket = WebSocket;
}

import { createClient } from "@supabase/supabase-js";

// The server uses the service-role key so it can bypass Row Level Security.
// NEVER expose this key to the browser/frontend.
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "\n[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Add them to a .env file and load with `--env-file=.env` or dotenv.\n"
  );
  // We don't exit here so the server can still boot /ping on Render,
  // but every DB call will fail gracefully and log.
}

export const supabase =
  url && serviceKey
    ? createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        realtime: { transport: WebSocket },
      })
    : null;
