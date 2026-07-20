/**
 * UploadThing URL helpers — keep file-key extraction consistent across admin routes.
 */

const ALLOWED_HOST_SUFFIXES = [".ufs.sh", ".uploadthing.com"];
const ALLOWED_HOSTS = new Set(["utfs.io", "uploadthing.com"]);

export function isAllowedUploadThingUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (ALLOWED_HOSTS.has(host)) return true;
    return ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
  } catch {
    return false;
  }
}

/** Extract UploadThing file key from a CDN URL (strips query params). */
export function extractUploadThingKey(url: string): string | null {
  try {
    const u = new URL(url);
    const match = u.pathname.match(/\/f\/([^/]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function extractUploadThingKeys(urls: string[]): string[] {
  const keys = new Set<string>();
  for (const url of urls) {
    const key = extractUploadThingKey(url);
    if (key) keys.add(key);
  }
  return Array.from(keys);
}
