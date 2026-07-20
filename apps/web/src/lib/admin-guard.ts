import { NextResponse } from "next/server";

/** Hide admin APIs from non-admins — looks like a missing route, not Forbidden. */
export function adminNotFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
