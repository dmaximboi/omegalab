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
    metadata: { order_id: "ord_1", order_amount_ngn: "160000" },
    ...partial,
  };
}

const expected = {
  txRef: "OMEGA-abc",
  paymentAmount: "102.00",
  paymentCurrency: "USD",
  orderId: "ord_1",
  orderAmountNgn: "160000",
};

assert.strictEqual(evaluateCheckout(session({}), expected).amountOk, true);
assert.strictEqual(evaluateCheckout(session({}), expected).currencyOk, true);
assert.strictEqual(evaluateCheckout(session({}), expected).isSuccess, true);
assert.strictEqual(evaluateCheckout(session({}), expected).orderAmountMatch, true);

assert.strictEqual(evaluateCheckout(session({ amount: "50.00" }), expected).amountOk, false);
assert.strictEqual(evaluateCheckout(session({ currency: "NGN" }), expected).currencyOk, false);
assert.strictEqual(evaluateCheckout(session({ reference: "OTHER" }), expected).txRefMatch, false);
assert.strictEqual(
  evaluateCheckout(session({ status: "open", payment_status: null }), expected).sessionOpen,
  true
);
assert.strictEqual(
  evaluateCheckout(session({ metadata: { order_id: "ord_1", order_amount_ngn: "999" } }), expected).orderAmountMatch,
  false
);
assert.strictEqual(
  evaluateCheckout(session({ metadata: { order_id: "ord_1" } }), expected).orderAmountMatch,
  false
);
assert.strictEqual(
  evaluateCheckout(session({ payment_status: null, charge: { payment_id: "pay_1" } }), expected).isSuccess,
  false
);
assert.strictEqual(
  evaluateCheckout(session({ payment_status: "pending" }), expected).isSuccess,
  false
);
assert.strictEqual(evaluateCheckout(session({ reference: null }), expected).txRefMatch, false);
assert.strictEqual(
  evaluateCheckout(session({ amount: null, charge: undefined }), expected).amountOk,
  false
);
assert.strictEqual(evaluateCheckout(session({ currency: null }), expected).currencyOk, false);
assert.strictEqual(
  evaluateCheckout(session({ amount: "not-a-number" }), expected).amountOk,
  false
);

console.log("fulfill-order evaluateCheckout checks passed");
