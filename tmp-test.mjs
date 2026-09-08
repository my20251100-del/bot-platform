import { makeWASocket, fetchLatestBaileysVersion, useMultiFileAuthState, DisconnectReason, Browsers } from "@whiskeysockets/baileys";
import { randomBytes } from "crypto";
import { mkdirSync } from "fs";

const AUTH_DIR = "/tmp/opencode/t1-auth/n" + randomBytes(2).toString("hex");
mkdirSync(AUTH_DIR, { recursive: true });

const NUMBER = process.argv[2] || "967712343137";
const USE_BROWSER = process.argv.includes("--browser");
const USE_TRACE = process.argv.includes("--trace");
const t0 = Date.now();
const log = (m) => console.log(`[t=${Math.round((Date.now()-t0)/1000)}s] ${m}`);

const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
const { version } = await fetchLatestBaileysVersion(); const FORCE = process.argv.includes("--forcev"); if (FORCE) { console.log("forcing version 2.3000.1046958387"); version[2]=1046958387; }
log(`WA version: ${version.join(".")} | auth: ${AUTH_DIR} | browser=${USE_BROWSER?"yes":"default"}`);
log(`PROXY env: ${process.env.WA_PROXY||process.env.HTTPS_PROXY||process.env.HTTP_PROXY||"none"}`);

let requested = false;
let lastQrAt = 0;

function start() {
  const sock = makeWASocket({
    version,
    auth: state,
    
    ...(USE_BROWSER ? { browser: Browsers.ubuntu("Chrome") } : {}),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (u) => {
    if (u.qr) {
      lastQrAt = Date.now();
      log(`qr event received`);
      if (!requested) {
        requested = true;
        try {
          const code = await sock.requestPairingCode(NUMBER);
          log(`✅ CODE=${code}`);
        } catch (e) {
          console.error("requestPairingCode failed:", e.message);
        }
      }
    }
    if (u.connection === "open") {
      log(`OPEN! registered=${sock.authState.creds.registered}`);
    }
    if (u.connection === "close") {
      const code = u.lastDisconnect?.error?.output?.statusCode;
      const msg = u.lastDisconnect?.error?.message;
      log(`CLOSE code=${code} msg=${msg} (survived ${Math.round((Date.now()-lastQrAt)/1000)}s since last qr)`);
      if (code !== DisconnectReason.loggedOut) {
        setTimeout(start, 15000);
      }
    }
  });
}

start();
setTimeout(() => { log("6-min test window done."); process.exit(0); }, 6 * 60 * 1000);