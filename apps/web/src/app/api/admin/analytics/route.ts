import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient, OrderStatus } from "@prisma/client";

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
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total revenue (all time)
    const totalRevenue = await getPrisma().order.aggregate({
      where: { status: OrderStatus.PAID },
      _sum: { totalAmount: true },
    });

    // Revenue in last 30 days
    const revenue30Days = await getPrisma().order.aggregate({
      where: {
        status: OrderStatus.PAID,
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { totalAmount: true },
    });

    // Revenue in last 7 days
    const revenue7Days = await getPrisma().order.aggregate({
      where: {
        status: OrderStatus.PAID,
        createdAt: { gte: sevenDaysAgo },
      },
      _sum: { totalAmount: true },
    });

    // Total orders
    const totalOrders = await getPrisma().order.count();
    const paidOrders = await getPrisma().order.count({ where: { status: OrderStatus.PAID } });
    const pendingOrders = await getPrisma().order.count({
      where: { status: { in: [OrderStatus.INITIATED, OrderStatus.PROCESSING, OrderStatus.VERIFYING] } },
    });
    const failedOrders = await getPrisma().order.count({ where: { status: OrderStatus.FAILED } });

    // Daily revenue for last 30 days - use Prisma instead of raw SQL for compatibility
    const dailyRevenue = await getPrisma().order.findMany({
      where: {
        status: OrderStatus.PAID,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Group by date
    const dailyRevenueGrouped = dailyRevenue.reduce((acc, order) => {
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, revenue: 0, orders: 0 };
      }
      acc[date].revenue += Number(order.totalAmount);
      acc[date].orders += 1;
      return acc;
    }, {} as Record<string, { date: string; revenue: number; orders: number }>);

    const dailyRevenueArray = Object.values(dailyRevenueGrouped);

    // Revenue by status - use Prisma instead of raw SQL
    const revenueByStatus = await getPrisma().order.groupBy({
      by: ["status"],
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { totalAmount: true },
      _count: true,
    });

    const revenueByStatusArray = revenueByStatus.map((item) => ({
      status: item.status,
      revenue: item._sum.totalAmount || 0,
      count: item._count,
    }));

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
      dailyRevenue: dailyRevenueArray,
      revenueByStatus: revenueByStatusArray,
      topProducts: topProductsWithNames,
    });
  } catch (error) {
    console.error("[ANALYTICS] Error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
