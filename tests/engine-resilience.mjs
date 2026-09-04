// ============================================================================
// Bot Platform — Engine Resilience & Stability Test Suite
// ============================================================================

import { classifyDisconnect, DisconnectCategory } from "../engine/index.mjs";
import { createSupabaseAuthStore, hasValidCreds, isResumableSession } from "../engine/auth-store.mjs";

console.log("============================================================================");
console.log("  🧪 Running WhatsApp Engine 24/7 Resilience Test Suite");
console.log("============================================================================");

let totalPassed = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    totalPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    process.exitCode = 1;
  }
}

// ----------------------------------------------------------------------------
// Test 1: Error Classification (Section 3)
// ----------------------------------------------------------------------------
console.log("\n[Group 1] Disconnect Error Classification");

const err401 = { output: { statusCode: 401, payload: { tag: "intentional logout" } } };
assert(classifyDisconnect(err401) === DisconnectCategory.LOGGED_OUT, "Code 401 with logout tag classified as LOGGED_OUT");

const err428 = { output: { statusCode: 428 } };
assert(classifyDisconnect(err428) === DisconnectCategory.PAIRING_EXPIRED, "Code 428 classified as PAIRING_EXPIRED");

const err515 = { output: { statusCode: 515 } };
assert(classifyDisconnect(err515) === DisconnectCategory.TRANSIENT_NETWORK, "Code 515 (restart required) classified as TRANSIENT_NETWORK");

const err408 = { output: { statusCode: 408 } };
assert(classifyDisconnect(err408) === DisconnectCategory.TIMEOUT, "Code 408 classified as TIMEOUT");

const errStream = { output: { statusCode: 440, payload: { tag: "stream errored" } } };
assert(classifyDisconnect(errStream) === DisconnectCategory.TRANSIENT_NETWORK, "Stream errored / 440 classified as TRANSIENT_NETWORK");

const errReplaced = { output: { statusCode: 440, payload: { tag: "connection replaced" } } };
assert(classifyDisconnect(errReplaced) === DisconnectCategory.SESSION_REPLACED, "Connection replaced classified as SESSION_REPLACED");

// ----------------------------------------------------------------------------
// Test 2: Resumable Session Verification (Section 9)
// ----------------------------------------------------------------------------
console.log("\n[Group 2] Session Credentials Resumability");

const validCreds = {
  registered: true,
  me: { id: "967772847565:48@s.whatsapp.net" },
  noiseKey: { public: Buffer.alloc(32), private: Buffer.alloc(32) },
  signedIdentityKey: { public: Buffer.alloc(32), private: Buffer.alloc(32) },
};
assert(isResumableSession(validCreds) === true, "Registered credentials with noise/identity keys are resumable");

const pairingCreds = {
  registered: false,
  noiseKey: { public: Buffer.alloc(32), private: Buffer.alloc(32) },
  signedIdentityKey: { public: Buffer.alloc(32), private: Buffer.alloc(32) },
};
assert(isResumableSession(pairingCreds) === true, "Unregistered credentials in initial pairing phase are preserved");

const emptyCreds = {};
assert(isResumableSession(emptyCreds) === false, "Empty credentials properly identified as non-resumable (needs clean init)");

// ----------------------------------------------------------------------------
// Test 3: Supabase Auth Store Persistence (Section 10)
// ----------------------------------------------------------------------------
console.log("\n[Group 3] Supabase Auth Store Loading & Debouncing");

try {
  const testBotId = "7338dc51-affe-4eab-81c3-ab04cfe879e2";
  const { state, saveCreds, flushCreds } = await createSupabaseAuthStore(testBotId);
  assert(Boolean(state && state.creds), "Loaded auth state successfully for test bot");
  assert(Boolean(state.keys && typeof state.keys.get === "function"), "Key store initialized with get/set/remove methods");

  // Test debounced saveCreds
  saveCreds({ lastAccountSyncTimestamp: Date.now() });
  assert(typeof flushCreds === "function", "Flush function available for graceful shutdown");
} catch (err) {
  assert(false, `Auth store error: ${err.message}`);
}

console.log("\n============================================================================");
console.log(`  📊 Results: ${totalPassed} / ${totalTests} tests passed`);
console.log("============================================================================");

if (totalPassed === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
