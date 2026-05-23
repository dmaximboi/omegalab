import { NextRequest } from "next/server";
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const orderId = params.id;

  // Verify user has access to this order
  const order = await getPrisma().order.findUnique({
    where: { id: orderId },
    include: { user: { select: { email: true } } },
  });

  if (!order) {
    return new Response("Order not found", { status: 404 });
  }

  if (session?.user?.isAdmin !== true && session?.user?.email !== order.user.email) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // Send initial status
      sendEvent({ type: "status", status: order.status, paymentVerified: order.paymentVerified });

      // Poll for changes every 5 seconds
      const interval = setInterval(async () => {
        try {
          const updatedOrder = await getPrisma().order.findUnique({
            where: { id: orderId },
            select: { status: true, paymentVerified: true },
          });

          if (updatedOrder) {
            sendEvent({
              type: "status",
              status: updatedOrder.status,
              paymentVerified: updatedOrder.paymentVerified,
            });
          }
        } catch (error) {
          console.error("[SSE] Error polling order:", error);
        }
      }, 5000);

      // Cleanup on disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
