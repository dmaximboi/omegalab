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

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { message } = await request.json();
    
    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const order = await getPrisma().order.findUnique({
      where: { id: params.id },
      include: { user: { select: { email: true, name: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Log the message in the system (you could also send email here)
    await getPrisma().notification.create({
      data: {
        userId: order.userId,
        title: `Update on Order #${order.id.slice(-8).toUpperCase()}`,
        body: message,
        type: "ORDER_UPDATE",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN MESSAGE] Error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
