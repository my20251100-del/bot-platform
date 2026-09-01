import test from "node:test";
import assert from "node:assert/strict";

import { pickConnectedBotId, genOtp } from "./otp";

test("pickConnectedBotId prefers a connected bot and ignores stale or invalid candidates", () => {
  const bots = [
    { id: "stale-1", status: "disconnected", linked_number: "0000", phone: "0000" },
    { id: "okay-1", status: "connected", linked_number: "+966 500 111 222", phone: null },
    { id: "okay-2", status: "connected", linked_number: null, phone: "+966500333444" },
  ];

  assert.equal(pickConnectedBotId(bots), "okay-1");
});

test("genOtp returns a six-digit code", () => {
  const code = genOtp();
  assert.equal(code.length, 6);
  assert.match(code, /^\d{6}$/);
});
