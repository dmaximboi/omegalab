/**
 * Payment verification checks for locked USD quotes.
 * Run: npx tsx apps/web/src/lib/fulfill-order.test.ts
 */
import assert from "assert";
import { evaluateCheckout } from "./checkout-checks";
import type { BachsCheckoutSession } from "./bachs";

function session(partial: Partial<BachsCheckoutSession>): BachsCheckoutSession {
  return {
    checkout_id: "chk_test123456",
    status: "completed",
    payment_status: "succeeded",
    amount: "102.00",
    currency: "USD",
    reference: "OMEGA-abc",
    metadata: { order_id: "ord_1" },
    ...partial,
  };
}

const expected = {
  txRef: "OMEGA-abc",
  paymentAmount: "102.00",
  paymentCurrency: "USD",
  orderId: "ord_1",
};

assert.strictEqual(evaluateCheckout(session({}), expected).amountOk, true);
assert.strictEqual(evaluateCheckout(session({}), expected).currencyOk, true);
assert.strictEqual(evaluateCheckout(session({}), expected).isSuccess, true);

assert.strictEqual(
  evaluateCheckout(session({ amount: "50.00" }), expected).amountOk,
  false,
  "underpayment rejected"
);

assert.strictEqual(
  evaluateCheckout(session({ currency: "NGN" }), expected).currencyOk,
  false,
  "wrong currency rejected"
);

assert.strictEqual(
  evaluateCheckout(session({ reference: "OTHER" }), expected).txRefMatch,
  false,
  "txRef mismatch rejected"
);

assert.strictEqual(
  evaluateCheckout(session({ status: "open", payment_status: null }), expected).sessionOpen,
  true,
  "open session detected"
);

assert.strictEqual(
  evaluateCheckout(session({ metadata: { order_id: "someone_else" } }), expected).orderIdMatch,
  false,
  "order_id mismatch rejected"
);

assert.strictEqual(
  evaluateCheckout(session({ metadata: null }), expected).orderIdMatch,
  false,
  "missing order_id metadata rejected"
);

assert.strictEqual(
  evaluateCheckout(session({ payment_status: null, charge: { payment_id: "pay_1" } }), expected).isSuccess,
  false,
  "missing payment status is not success"
);

assert.strictEqual(
  evaluateCheckout(session({ payment_status: "pending" }), expected).isSuccess,
  false,
  "pending payment status is not success"
);

assert.strictEqual(
  evaluateCheckout(session({ reference: null }), expected).txRefMatch,
  false,
  "missing reference rejected"
);

assert.strictEqual(
  evaluateCheckout(session({ amount: null, charge: undefined }), expected).amountOk,
  false,
  "missing amount rejected"
);

assert.strictEqual(
  evaluateCheckout(session({ currency: null }), expected).currencyOk,
  false,
  "missing currency rejected"
);

assert.strictEqual(
  evaluateCheckout(session({ amount: "not-a-number" }), expected).amountOk,
  false,
  "unparseable amount rejected"
);

console.log("✓ fulfill-order evaluateCheckout checks passed");
