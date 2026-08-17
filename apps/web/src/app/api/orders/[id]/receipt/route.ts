import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import QRCode from "qrcode";

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
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const orderId = params.id;

    const order = await getPrisma().order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { product: { select: { name: true } } },
        },
        user: { select: { email: true, name: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Security: Only allow order owner or admin to view receipt
    if (session?.user?.isAdmin !== true && session?.user?.email !== order.user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate QR code with order verification URL
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-qr?order=${orderId}`;
    const qrCode = await QRCode.toDataURL(verifyUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: "#1e293b",
        light: "#ffffff",
      },
    });

    return NextResponse.json({
      order: {
        id: order.id,
        txRef: order.txRef,
        status: order.status,
        totalAmount: parseFloat(order.totalAmount.toString()),
        paymentVerified: order.paymentVerified,
        providerRef: order.providerRef,
        checkoutId: order.checkoutId,
        createdAt: order.createdAt,
        verifiedAt: order.verifiedAt,
        customer: {
        name: order.customerName || order.user.name,
        email: order.customerEmail || order.user.email,
      },
      customerSnapshot: {
        name: order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone,
        address: order.customerAddress,
      },
      items: order.items.map((item) => ({
        product: item.product.name,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice.toString()),
      })),
      },
      qrCode,
      verifyUrl,
    });
  } catch (error) {
    console.error("[RECEIPT] Error:", error);
    return NextResponse.json({ error: "Failed to generate receipt" }, { status: 500 });
  }
}
