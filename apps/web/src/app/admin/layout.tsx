import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * ADMIN LAYOUT - Server-side protection
 * This runs on the server BEFORE any admin page renders
 * Non-admins get a 404 - they never see any admin content
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // No session = not logged in = 404
  if (!session) {
    notFound();
  }

  // Not admin = 404 (don't reveal admin exists)
  if (session.user?.isAdmin !== true) {
    notFound();
  }

  // Admin verified - render children
  return <>{children}</>;
}
