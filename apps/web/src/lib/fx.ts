import Decimal from "decimal.js";

export type FxSource = "live" | "fallback";

export interface FxQuote {
  /** NGN per 1 USD */
  ngnPerUsd: Decimal;
  bufferPercent: Decimal;
  /** USD amount charged to Bachs (rounded up to cents) */
  paymentAmountUsd: Decimal;
  source: FxSource;
  quotedAt: Date;
}

export interface FxConfig {
  rateApiUrl?: string;
  rateApiKey?: string;
  fallbackNgnPerUsd: number;
  bufferPercent: number;
  /** Minimum / maximum acceptable NGN-per-USD (sanity bounds) */
  minNgnPerUsd?: number;
  maxNgnPerUsd?: number;
}

const DEFAULT_MIN = 100;
const DEFAULT_MAX = 5000;

export function getFxConfig(): FxConfig {
  const fallback = Number(process.env.FX_FALLBACK_NGN_PER_USD || "1600");
  const buffer = Number(process.env.FX_BUFFER_PERCENT || "2");
  if (!Number.isFinite(fallback) || fallback <= 0) {
    throw new Error("FX_FALLBACK_NGN_PER_USD must be a positive number");
  }
  if (!Number.isFinite(buffer) || buffer < 0 || buffer > 25) {
    throw new Error("FX_BUFFER_PERCENT must be between 0 and 25");
  }
  return {
    rateApiUrl: process.env.FX_RATE_API_URL || undefined,
    rateApiKey: process.env.FX_RATE_API_KEY || undefined,
    fallbackNgnPerUsd: fallback,
    bufferPercent: buffer,
    minNgnPerUsd: Number(process.env.FX_MIN_NGN_PER_USD || DEFAULT_MIN),
    maxNgnPerUsd: Number(process.env.FX_MAX_NGN_PER_USD || DEFAULT_MAX),
  };
}

/**
 * Convert NGN catalogue total → USD charge amount.
 * Applies buffer then rounds UP to the nearest cent so we never undercharge.
 */
export function convertNgnToUsd(
  ngnAmount: number | string | Decimal,
  ngnPerUsd: number | string | Decimal,
  bufferPercent: number | string | Decimal = 0
): Decimal {
  const ngn = new Decimal(ngnAmount.toString());
  const rate = new Decimal(ngnPerUsd.toString());
  const buffer = new Decimal(bufferPercent.toString());

  if (!ngn.isFinite() || ngn.lte(0)) throw new Error("Invalid NGN amount");
  if (!rate.isFinite() || rate.lte(0)) throw new Error("Invalid FX rate");
  if (!buffer.isFinite() || buffer.lt(0)) throw new Error("Invalid FX buffer");

  const usd = ngn.div(rate);
  const withBuffer = usd.mul(new Decimal(1).plus(buffer.div(100)));
  // Round UP to cents
  return withBuffer.mul(100).ceil().div(100);
}

export function isRateSane(
  ngnPerUsd: number,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX
): boolean {
  return Number.isFinite(ngnPerUsd) && ngnPerUsd >= min && ngnPerUsd <= max;
}

/**
 * Parse common FX API shapes into NGN-per-USD.
 * Supported:
 * - { rates: { NGN: 1600 } }  (USD base → NGN)
 * - { conversion_rates: { NGN: 1600 } }
 * - { NGN: 1600 }
 * - { rate: 1600 } / { ngn_per_usd: 1600 }
 * - { data: { NGN: 1600 } } / { data: { rate: 1600 } }
 */
export function parseNgnPerUsdFromPayload(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;

  const direct =
    numberOrNull(obj.ngn_per_usd) ??
    numberOrNull(obj.ngnPerUsd) ??
    numberOrNull(obj.rate) ??
    numberOrNull(obj.NGN);

  if (direct !== null) return direct;

  for (const key of ["rates", "conversion_rates", "data", "result"] as const) {
    const nested = obj[key];
    if (nested && typeof nested === "object") {
      const n = nested as Record<string, unknown>;
      const fromNested =
        numberOrNull(n.NGN) ??
        numberOrNull(n.ngn) ??
        numberOrNull(n.rate) ??
        numberOrNull(n.ngn_per_usd);
      if (fromNested !== null) return fromNested;
    }
  }

  return null;
}

function numberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export async function fetchLiveNgnPerUsd(
  config: FxConfig,
  fetchImpl: typeof fetch = fetch
): Promise<number | null> {
  if (!config.rateApiUrl) return null;

  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (config.rateApiKey) {
      headers.Authorization = `Bearer ${config.rateApiKey}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetchImpl(config.rateApiUrl, {
      method: "GET",
      headers,
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const rate = parseNgnPerUsdFromPayload(json);
    if (rate === null) return null;
    if (!isRateSane(rate, config.minNgnPerUsd, config.maxNgnPerUsd)) return null;
    return rate;
  } catch {
    return null;
  }
}

export async function quoteNgnToUsd(
  ngnAmount: number | string | Decimal,
  config: FxConfig = getFxConfig(),
  fetchImpl: typeof fetch = fetch
): Promise<FxQuote> {
  const live = await fetchLiveNgnPerUsd(config, fetchImpl);
  const source: FxSource = live !== null ? "live" : "fallback";
  const ngnPerUsd = new Decimal(live ?? config.fallbackNgnPerUsd);
  const bufferPercent = new Decimal(config.bufferPercent);
  const paymentAmountUsd = convertNgnToUsd(ngnAmount, ngnPerUsd, bufferPercent);

  // Bachs USD minimum is typically $1
  if (paymentAmountUsd.lt(1)) {
    throw new Error("Converted USD amount is below the $1.00 minimum");
  }

  return {
    ngnPerUsd,
    bufferPercent,
    paymentAmountUsd,
    source,
    quotedAt: new Date(),
  };
}

export function buildFxQuoteFromLocked(opts: {
  ngnAmount: number | string;
  ngnPerUsd: number | string;
  bufferPercent: number | string;
  source: FxSource;
  quotedAt: Date;
}): FxQuote {
  const ngnPerUsd = new Decimal(opts.ngnPerUsd.toString());
  const bufferPercent = new Decimal(opts.bufferPercent.toString());
  return {
    ngnPerUsd,
    bufferPercent,
    paymentAmountUsd: convertNgnToUsd(opts.ngnAmount, ngnPerUsd, bufferPercent),
    source: opts.source,
    quotedAt: opts.quotedAt,
  };
}
