/**
 * Resolve buyer display fields from Order snapshot, with legacy User fallback.
 */
export function orderCustomer(order: {
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  user?: { name?: string | null; email?: string | null } | null;
}) {
  return {
    name: order.customerName || order.user?.name || "Customer",
    email: order.customerEmail || order.user?.email || "",
    phone: order.customerPhone || "",
    address: order.customerAddress || "",
  };
}
