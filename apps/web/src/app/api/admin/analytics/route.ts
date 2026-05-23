import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

// Lazy Prisma client
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return globalForPrisma.prisma;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total revenue (all time)
    const totalRevenue = await getPrisma().order.aggregate({
      where: { status: "PAID" },
      _sum: { totalAmount: true },
    });

    // Revenue in last 30 days
    const revenue30Days = await getPrisma().order.aggregate({
      where: {
        status: "PAID",
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { totalAmount: true },
    });

    // Revenue in last 7 days
    const revenue7Days = await getPrisma().order.aggregate({
      where: {
        status: "PAID",
        createdAt: { gte: sevenDaysAgo },
      },
      _sum: { totalAmount: true },
    });

    // Total orders
    const totalOrders = await getPrisma().order.count();
    const paidOrders = await getPrisma().order.count({ where: { status: "PAID" } });
    const pendingOrders = await getPrisma().order.count({
      where: { status: { in: ["INITIATED", "PROCESSING", "VERIFYING"] } },
    });
    const failedOrders = await getPrisma().order.count({ where: { status: "FAILED" } });

    // Daily revenue for last 30 days
    const dailyRevenue = await getPrisma().$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        SUM("totalAmount") as revenue,
        COUNT(*) as orders
      FROM "Order"
      WHERE "status" = 'PAID' AND "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    // Revenue by status
    const revenueByStatus = await getPrisma().$queryRaw`
      SELECT 
        "status",
        SUM("totalAmount") as revenue,
        COUNT(*) as count
      FROM "Order"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY "status"
    `;

    // Top products
    const topProducts = await getPrisma().orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    });

    const productIds = topProducts.map((p) => p.productId);
    const products = await getPrisma().product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });

    const topProductsWithNames = topProducts.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        name: product?.name || "Unknown",
        quantity: item._sum.quantity,
      };
    });

    return NextResponse.json({
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      revenue30Days: revenue30Days._sum.totalAmount || 0,
      revenue7Days: revenue7Days._sum.totalAmount || 0,
      totalOrders,
      paidOrders,
      pendingOrders,
      failedOrders,
      dailyRevenue,
      revenueByStatus,
      topProducts: topProductsWithNames,
    });
  } catch (error) {
    console.error("[ANALYTICS] Error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
