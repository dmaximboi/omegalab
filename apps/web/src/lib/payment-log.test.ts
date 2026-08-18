import assert from "node:assert/strict";
import { parseLogResponseData, serializeLogPayload } from "./payment-log";

assert.deepEqual(parseLogResponseData('{"ok":true}'), { ok: true });
assert.deepEqual(parseLogResponseData("Deposit limit exceeded"), { message: "Deposit limit exceeded" });
assert.equal(parseLogResponseData(null), null);

assert.equal(serializeLogPayload({ message: "fail" }), '{"message":"fail"}');
assert.equal(serializeLogPayload("plain text"), '{"message":"plain text"}');
assert.equal(serializeLogPayload('{"already":"json"}'), '{"already":"json"}');
assert.equal(serializeLogPayload(null), null);

console.log("payment-log tests passed");
