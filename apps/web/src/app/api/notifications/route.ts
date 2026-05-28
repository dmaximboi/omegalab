import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
  }
  return globalForPrisma.prisma;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch stored notifications
    const notifications = await getPrisma().notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Also fetch user's completed/failed orders that may not have notification entries
    // This ensures historical transactions always appear
    const orders = await getPrisma().order.findMany({
      where: {
        userId,
        status: { in: ["PAID", "FAILED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        txRef: true,
        totalAmount: true,
        status: true,
        createdAt: true,
      },
    });

    // Build a set of orderIds already represented in notifications
    const notifiedOrderIds = new Set<string>();
    for (const n of notifications) {
      const match = n.body?.match(/\[orderId:([^\]]+)\]/);
      if (match) notifiedOrderIds.add(match[1]);
    }

    // Synthesize notifications for orders without existing notification entries
    const syntheticNotifications = orders
      .filter((order) => !notifiedOrderIds.has(order.id))
      .map((order) => ({
        id: `order_${order.id}`,
        type: order.status === "PAID" ? "order_success" : "order_failed",
        title:
          order.status === "PAID"
            ? "Payment Successful! ✓"
            : "Payment Failed",
        body:
          order.status === "PAID"
            ? `Your order #${order.txRef} has been confirmed. Total: ₦${Number(order.totalAmount).toLocaleString()}. Your receipt is ready. [orderId:${order.id}]`
            : `Your payment for order #${order.txRef} could not be verified. Please contact support if you were charged. [orderId:${order.id}]`,
        isRead: true,
        createdAt: order.createdAt,
      }));

    // Merge and sort by date (newest first)
    const allNotifications = [...notifications, ...syntheticNotifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const unreadCount = await getPrisma().notification.count({
      where: { userId, isRead: false },
    });

    return NextResponse.json({ notifications: allNotifications, unreadCount });
  } catch (error) {
    console.error("[NOTIFICATIONS] Fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
