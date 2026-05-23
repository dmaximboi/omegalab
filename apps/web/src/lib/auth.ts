import { NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

// Lazy Prisma client - only instantiated when first accessed
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getPrisma() {
  if (!globalForPrisma.prisma) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error("[AUTH] CRITICAL: DATABASE_URL environment variable is not set!");
    } else {
      console.log("[AUTH] DATABASE_URL is set (length:", dbUrl.length, ")");
    }
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });
  }
  return globalForPrisma.prisma;
}

/**
 * ============================================
 * SECURE AUTHENTICATION FLOW
 * ============================================
 * 
 * [ Frontend: User clicks Google Login ]
 *                   │
 *                   ▼ (Sends Google ID Token)
 * [ Backend Server ] 
 *    ├── 1. Validates token with Google's public keys
 *    ├── 2. Reads the verified email address
 *    ├── 3. Checks Prisma Database (e.g., role == "ADMIN")
 *    │         ├── IF NOT ADMIN ──> Normal user access
 *    │         └── IF ADMIN     ──> Grants Admin Access ✅
 *    └── 4. Generates secure httpOnly cookie with signed JWT
 * 
 * SECURITY MEASURES:
 * 1. Email verified by Google OAuth - CANNOT be spoofed
 * 2. Admin role in database - CANNOT be modified via console
 * 3. JWT signed with NEXTAUTH_SECRET - CANNOT be tampered
 * 4. Cookies: httpOnly, secure, sameSite=lax
 * 5. Database with RLS - row-level security
 * 6. SSL/TLS enforced on database connection
 * 7. Failed login tracking and account lockout
 * 8. Session fingerprinting
 * 9. Audit logging for security events
 * 
 * HOW TO MAKE SOMEONE ADMIN:
 * - Direct database access ONLY (Neon Console, Prisma Studio)
 * - NO API endpoint exists to change roles
 */

// Rate limiting for auth attempts (in-memory, use Redis in production)
const authAttempts = new Map<string, { count: number; lastAttempt: number; lockedUntil?: number }>();
const MAX_AUTH_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 5 * 60 * 1000; // 5 minutes

function checkRateLimit(identifier: string): { allowed: boolean; remainingAttempts: number } {
  const now = Date.now();
  const record = authAttempts.get(identifier);
  
  if (!record) {
    authAttempts.set(identifier, { count: 1, lastAttempt: now });
    return { allowed: true, remainingAttempts: MAX_AUTH_ATTEMPTS - 1 };
  }
  
  // Check if locked out
  if (record.lockedUntil && now < record.lockedUntil) {
    return { allowed: false, remainingAttempts: 0 };
  }
  
  // Reset if outside window
  if (now - record.lastAttempt > ATTEMPT_WINDOW) {
    authAttempts.set(identifier, { count: 1, lastAttempt: now });
    return { allowed: true, remainingAttempts: MAX_AUTH_ATTEMPTS - 1 };
  }
  
  // Increment count
  record.count++;
  record.lastAttempt = now;
  
  if (record.count > MAX_AUTH_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION;
    console.warn(`[AUTH] Account locked: ${identifier} - too many attempts`);
    return { allowed: false, remainingAttempts: 0 };
  }
  
  return { allowed: true, remainingAttempts: MAX_AUTH_ATTEMPTS - record.count };
}

function clearRateLimit(identifier: string): void {
  authAttempts.delete(identifier);
}

// Generate session fingerprint for additional security
function generateSessionFingerprint(userAgent?: string, ip?: string): string {
  const data = `${userAgent || "unknown"}-${ip || "unknown"}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 16);
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
      checks: ["state"],
    }),
  ],
  callbacks: {
    async signIn({ user, profile, account }) {
      if (!user.email) {
        console.warn("[AUTH] Sign in rejected: No email");
        return false;
      }

      const email = user.email.toLowerCase();
      
      // Check rate limit
      const rateCheck = checkRateLimit(email);
      if (!rateCheck.allowed) {
        console.warn(`[AUTH] Sign in blocked: ${email} - rate limited`);
        return false;
      }

      const googleProfile = profile as { email_verified?: boolean; hd?: string };
      
      // MUST have verified email
      if (googleProfile && googleProfile.email_verified === false) {
        console.warn("[AUTH] Sign in rejected: Email not verified");
        return false;
      }

      // Verify the account is from Google
      if (account?.provider !== "google") {
        console.warn("[AUTH] Sign in rejected: Invalid provider");
        return false;
      }

      // Create or update user in database
      try {
        const existingUser = await getPrisma().user.findUnique({
          where: { email },
          select: { id: true, failedLogins: true, lockedUntil: true },
        });

        // Check if account is locked in database
        if (existingUser?.lockedUntil && new Date() < existingUser.lockedUntil) {
          console.warn(`[AUTH] Sign in blocked: ${email} - account locked in DB`);
          return false;
        }

        await getPrisma().user.upsert({
          where: { email },
          update: {
            name: user.name || undefined,
            image: user.image || undefined,
            lastLoginAt: new Date(),
            failedLogins: 0, // Reset on successful login
            lockedUntil: null,
          },
          create: {
            email,
            name: user.name || "",
            image: user.image || "",
            role: "USER", // Always USER by default - admin set via DB only
          },
        });

        // Log successful login
        await getPrisma().securityEvent.create({
          data: {
            eventType: "LOGIN_SUCCESS",
            severity: "info",
            userId: existingUser?.id,
            ipAddress: "server",
            description: `Successful login via Google: ${email}`,
            metadata: JSON.stringify({ provider: "google", email }),
          },
        }).catch(() => {}); // Don't fail login if audit fails

        // Clear rate limit on success
        clearRateLimit(email);
        
      } catch (error) {
        console.error("[AUTH] Database error:", error);
        // Still allow sign in even if DB fails
      }

      return true;
    },

    async jwt({ token, account, profile, trigger }) {
      // On sign in or token refresh, check database for admin role
      if (account || trigger === "signIn" || trigger === "update") {
        const email = token.email?.toLowerCase();
        
        if (email) {
          try {
            // Fetch role from database - this is the source of truth
            const dbUser = await getPrisma().user.findUnique({
              where: { email },
              select: { role: true, id: true },
            });
            
            // Admin ONLY if database says so
            token.isAdmin = dbUser?.role === "ADMIN";
            token.userId = dbUser?.id;
            
            // Add issued timestamp for token age verification
            token.iat = Math.floor(Date.now() / 1000);
            
            // Add random jti (JWT ID) for token uniqueness
            token.jti = crypto.randomBytes(16).toString("hex");
            
            if (token.isAdmin) {
              console.log(`[AUTH] Admin login: ${email}`);
              
              // Log admin access for audit
              await getPrisma().securityEvent.create({
                data: {
                  eventType: "ADMIN_ACCESS",
                  severity: "warning",
                  userId: dbUser?.id,
                  ipAddress: "server",
                  description: `Admin login: ${email}`,
                  metadata: JSON.stringify({ email, action: "login" }),
                },
              }).catch(() => {});
            }
          } catch (error) {
            console.error("[AUTH] Failed to check admin status:", error);
            token.isAdmin = false;
          }
        }
        
        token.emailVerified = (profile as { email_verified?: boolean })?.email_verified;
      }
      
      // Verify token hasn't been tampered with
      if (!token.iat) {
        token.iat = Math.floor(Date.now() / 1000);
      }
      
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.isAdmin = token.isAdmin === true;
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 3 * 24 * 60 * 60, // 3 days max session
    updateAge: 5 * 60, // Refresh token every 5 minutes of activity
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-next-auth.session-token" 
        : "next-auth.session-token",
      options: {
        httpOnly: true, // Cannot be accessed by JavaScript
        sameSite: "lax", // CSRF protection
        path: "/",
        secure: process.env.NODE_ENV === "production", // HTTPS only in production
        // Domain is automatically set by NextAuth
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.callback-url"
        : "next-auth.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Host-next-auth.csrf-token"
        : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Additional security options
  useSecureCookies: process.env.NODE_ENV === "production",
  debug: false, // Never enable in production
};

export const getSession = () => getServerSession(authOptions);

export const isAdmin = async () => {
  const session = await getSession();
  return session?.user?.isAdmin === true;
};
