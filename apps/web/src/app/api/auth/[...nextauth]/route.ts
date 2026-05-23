import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Use shared auth configuration from lib/auth.ts
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
