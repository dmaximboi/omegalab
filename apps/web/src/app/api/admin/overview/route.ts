import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient, OrderStatus } from "@prisma/client";

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
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const prisma = getPrisma();
    const [orderStats, productCount, userCount, unreadMessages] = await Promise.all([
      prisma.order.groupBy({
        by: ["status"],
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.product.count(),
      prisma.user.count(),
      prisma.contactMessage.count({ where: { isRead: false } }),
    ]);

    let totalOrders = 0;
    let paidOrders = 0;
    let pendingOrders = 0;
    let failedOrders = 0;
    let totalRevenue = 0;

    for (const row of orderStats) {
      totalOrders += row._count;
      if (row.status === OrderStatus.PAID) {
        paidOrders += row._count;
        totalRevenue += Number(row._sum.totalAmount || 0);
      }
      if (
        row.status === OrderStatus.INITIATED ||
        row.status === OrderStatus.PROCESSING ||
        row.status === OrderStatus.VERIFYING
      ) {
        pendingOrders += row._count;
      }
      if (row.status === OrderStatus.FAILED) {
        failedOrders += row._count;
      }
    }

    return NextResponse.json(
      {
        totalOrders,
        pendingOrders,
        totalRevenue,
        paidOrders,
        failedOrders,
        productCount,
        userCount,
        messageCount: unreadMessages,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    console.error("[ADMIN OVERVIEW] Error:", error);
    return NextResponse.json({ error: "Failed to fetch overview" }, { status: 500 });
  }
}
