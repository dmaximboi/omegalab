export function getPaymentStepLabel(step: string): string {
  if (step.startsWith("step:INITIATED")) return "Order Created";
  if (step.startsWith("step:PROCESSING")) return "Payment Started";
  if (step.startsWith("step:VERIFYING")) return "Verifying Payment";
  if (step.startsWith("step:PAID")) return "Payment Confirmed";
  if (step.includes("checkout_amount_limit")) return "Checkout Limit Exceeded";
  if (step.includes("checkout_create")) return "Checkout Create Failed";
  if (step.includes("txref_mismatch")) return "Reference Mismatch";
  if (step.includes("amount_mismatch")) return "Amount Mismatch";
  if (step.includes("currency_mismatch")) return "Currency Mismatch";
  if (step.includes("checkout_mismatch")) return "Checkout Mismatch";
  if (step.includes("invalid_locked_quote")) return "Invalid Locked Quote";
  if (step.includes("not_success")) return "Payment Not Successful";
  if (step.includes("expired")) return "Order Expired";
  if (step.startsWith("webhook:")) return "Webhook Event";
  if (step.includes("FAILED")) return "Payment Failed";
  return step;
}

export function getPaymentStepDescription(step: string): string {
  if (step.startsWith("step:INITIATED")) return "Order created with server validated totals.";
  if (step.startsWith("step:PROCESSING")) return "Customer redirected to Bachs checkout.";
  if (step.startsWith("step:VERIFYING")) return "Server verification against Bachs session.";
  if (step.startsWith("step:PAID")) return "Payment verified and order marked paid.";
  if (step.includes("checkout_amount_limit")) return "Converted USD amount exceeded provider limit.";
  if (step.includes("checkout_create")) return "Bachs rejected checkout session creation.";
  if (step.includes("mismatch")) return "Provider data did not match locked order values.";
  if (step.includes("not_success")) return "Provider reported checkout as unsuccessful.";
  if (step.includes("expired")) return "Order passed the payment window.";
  if (step.startsWith("webhook:")) return "Webhook received and processed.";
  if (step.includes("FAILED")) return "Payment step failed.";
  return "Transaction step recorded.";
}
