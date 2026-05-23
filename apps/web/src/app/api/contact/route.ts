import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

// Lazy Prisma client - only instantiated when first accessed
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  return globalForPrisma.prisma;
}

// Rate limiting for contact form
const submissions = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_SUBMISSIONS = 3;

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || 
               request.headers.get("x-real-ip") || 
               "unknown";
    
    // Rate limit check
    const now = Date.now();
    const lastSubmission = submissions.get(ip) || 0;
    if (now - lastSubmission < RATE_LIMIT_WINDOW) {
      const count = (submissions.get(`${ip}_count`) || 0) + 1;
      if (count > MAX_SUBMISSIONS) {
        return NextResponse.json(
          { error: "Too many submissions. Please wait a moment." },
          { status: 429 }
        );
      }
      submissions.set(`${ip}_count`, count);
    } else {
      submissions.set(`${ip}_count`, 1);
    }
    submissions.set(ip, now);

    const body = await request.json();
    const { name, email, phone, subject, message, website } = body;

    // Honeypot check (spam protection)
    if (website) {
      // Bot detected, silently accept but don't save
      return NextResponse.json({ success: true });
    }

    // Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Please fill in all required fields." },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedData = {
      name: name.trim().substring(0, 100),
      email: email.trim().toLowerCase().substring(0, 100),
      phone: phone?.trim().substring(0, 20) || null,
      subject: subject.trim().substring(0, 200),
      message: message.trim().substring(0, 2000),
    };

    // Save to database
    await getPrisma().contactMessage.create({
      data: {
        ...sanitizedData,
        ipAddress: ip,
        userAgent: request.headers.get("user-agent")?.substring(0, 500) || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CONTACT] Error:", error);
    return NextResponse.json(
      { error: "Could not send message. Please try again." },
      { status: 500 }
    );
  }
}
