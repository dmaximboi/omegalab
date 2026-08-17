import { OrderStatus, PrismaClient } from "@prisma/client";
import { getCheckoutSession } from "@/lib/bachs";

function normalizeStatus(value: string | null | undefined): string {
  return String(value || "").trim().toLowerCase();
}

type OrderRow = {
  id: string;
  checkoutId: string | null;
  paymentVerified: boolean;
  status: OrderStatus;
};

export async function syncOrderCheckoutState(
  prisma: PrismaClient,
  order: OrderRow
): Promise<{ changed: boolean; bachsStatus: string | null }> {
  if (order.paymentVerified) {
    return { changed: false, bachsStatus: null };
  }

  if (!order.checkoutId) {
    if (order.status === OrderStatus.PROCESSING || order.status === OrderStatus.VERIFYING) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.INITIATED },
      });
      return { changed: true, bachsStatus: null };
    }
    return { changed: false, bachsStatus: null };
  }

  const session = await getCheckoutSession(order.checkoutId);
  if (!session) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.INITIATED, checkoutId: null },
    });
    return { changed: true, bachsStatus: "missing" };
  }

  const status = normalizeStatus(session.status);
  const paymentStatus = normalizeStatus(session.payment_status || session.charge?.status);

  if (status === "open") {
    if (order.status === OrderStatus.INITIATED) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PROCESSING },
      });
      return { changed: true, bachsStatus: status };
    }
    return { changed: false, bachsStatus: status };
  }

  const succeeded =
    (status === "completed" || status === "complete") &&
    (paymentStatus === "succeeded" ||
      paymentStatus === "successful" ||
      paymentStatus === "completed" ||
      paymentStatus === "paid");

  if (succeeded) {
    return { changed: false, bachsStatus: status };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: OrderStatus.INITIATED, checkoutId: null },
  });
  return { changed: true, bachsStatus: status };
}

export async function syncOpenOrdersForEmail(prisma: PrismaClient, customerEmail: string) {
  const orders = await prisma.order.findMany({
    where: {
      customerEmail,
      paymentVerified: false,
      status: { in: [OrderStatus.INITIATED, OrderStatus.PROCESSING, OrderStatus.VERIFYING] },
    },
    select: { id: true, checkoutId: true, paymentVerified: true, status: true },
  });

  for (const order of orders) {
    await syncOrderCheckoutState(prisma, order);
  }
}
