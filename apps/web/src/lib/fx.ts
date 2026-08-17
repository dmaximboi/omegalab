import Decimal from "decimal.js";

export const CHECKOUT_QUOTE_TTL_MINUTES = 5;

export class FxRateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FxRateError";
  }
}

export interface FxQuote {
  ngnPerUsd: Decimal;
  liveNgnPerUsd: Decimal;
  bufferPercent: Decimal;
  paymentAmountUsd: Decimal;
  quotedAt: Date;
}

export interface FxConfig {
  rateApiUrl: string;
  rateApiKey?: string;
  bufferPercent: number;
  checkoutRateDiscountPercent: number;
  minNgnPerUsd: number;
  maxNgnPerUsd: number;
  quoteTtlMinutes: number;
}

const DEFAULT_MIN = 100;
const DEFAULT_MAX = 5000;

export function getFxConfig(): FxConfig {
  const rateApiUrl = process.env.FX_RATE_API_URL?.trim();
  if (!rateApiUrl) {
    throw new FxRateError("FX_RATE_API_URL is not configured");
  }

  const buffer = Number(process.env.FX_BUFFER_PERCENT || "2");
  const checkoutRateDiscountPercent = Number(process.env.FX_CHECKOUT_RATE_DISCOUNT_PERCENT || "10");
  const quoteTtlMinutes = Number(process.env.FX_QUOTE_TTL_MINUTES || String(CHECKOUT_QUOTE_TTL_MINUTES));

  if (!Number.isFinite(buffer) || buffer < 0 || buffer > 25) {
    throw new FxRateError("FX_BUFFER_PERCENT must be between 0 and 25");
  }
  if (!Number.isFinite(checkoutRateDiscountPercent) || checkoutRateDiscountPercent < 0 || checkoutRateDiscountPercent > 40) {
    throw new FxRateError("FX_CHECKOUT_RATE_DISCOUNT_PERCENT must be between 0 and 40");
  }
  if (!Number.isFinite(quoteTtlMinutes) || quoteTtlMinutes < 1 || quoteTtlMinutes > 15) {
    throw new FxRateError("FX_QUOTE_TTL_MINUTES must be between 1 and 15");
  }

  return {
    rateApiUrl,
    rateApiKey: process.env.FX_RATE_API_KEY || undefined,
    bufferPercent: buffer,
    checkoutRateDiscountPercent,
    minNgnPerUsd: Number(process.env.FX_MIN_NGN_PER_USD || DEFAULT_MIN),
    maxNgnPerUsd: Number(process.env.FX_MAX_NGN_PER_USD || DEFAULT_MAX),
    quoteTtlMinutes,
  };
}

export function getEffectiveCheckoutNgnPerUsd(liveNgnPerUsd: number, config: FxConfig): Decimal {
  if (!Number.isFinite(liveNgnPerUsd) || liveNgnPerUsd <= 0) {
    throw new FxRateError("Live FX rate is invalid");
  }

  const discount = new Decimal(config.checkoutRateDiscountPercent).div(100);
  const effective = new Decimal(liveNgnPerUsd).mul(new Decimal(1).minus(discount));

  if (!effective.isFinite() || effective.lte(0)) {
    throw new FxRateError("Effective checkout FX rate is invalid");
  }

  return effective;
}

export function isFxQuoteFresh(quotedAt: Date, ttlMinutes = CHECKOUT_QUOTE_TTL_MINUTES): boolean {
  const ageMs = Date.now() - quotedAt.getTime();
  return ageMs >= 0 && ageMs <= ttlMinutes * 60 * 1000;
}

export function estimateNgnAtRate(usdAmount: Decimal | number | string, ngnPerUsd: Decimal | number | string): Decimal {
  return new Decimal(usdAmount.toString()).mul(new Decimal(ngnPerUsd.toString()));
}

export function convertNgnToUsd(
  ngnAmount: number | string | Decimal,
  ngnPerUsd: number | string | Decimal,
  bufferPercent: number | string | Decimal = 0
): Decimal {
  const ngn = new Decimal(ngnAmount.toString());
  const rate = new Decimal(ngnPerUsd.toString());
  const buffer = new Decimal(bufferPercent.toString());

  if (!ngn.isFinite() || ngn.lte(0)) throw new FxRateError("Invalid NGN amount");
  if (!rate.isFinite() || rate.lte(0)) throw new FxRateError("Invalid FX rate");
  if (!buffer.isFinite() || buffer.lt(0)) throw new FxRateError("Invalid FX buffer");

  const usd = ngn.div(rate);
  const withBuffer = usd.mul(new Decimal(1).plus(buffer.div(100)));
  return withBuffer.mul(100).ceil().div(100);
}

export function isRateSane(ngnPerUsd: number, min = DEFAULT_MIN, max = DEFAULT_MAX): boolean {
  return Number.isFinite(ngnPerUsd) && ngnPerUsd >= min && ngnPerUsd <= max;
}

export function parseNgnPerUsdFromPayload(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;

  const direct =
    numberOrNull(obj.ngn_per_usd) ??
    numberOrNull(obj.ngnPerUsd) ??
    numberOrNull(obj.rate) ??
    numberOrNull(obj.NGN);

  if (direct !== null) return normalizeNgnPerUsd(direct);

  for (const key of ["rates", "conversion_rates", "data", "result"] as const) {
    const nested = obj[key];
    if (nested && typeof nested === "object") {
      const n = nested as Record<string, unknown>;
      const fromNested =
        numberOrNull(n.NGN) ??
        numberOrNull(n.ngn) ??
        numberOrNull(n.rate) ??
        numberOrNull(n.ngn_per_usd);
      if (fromNested !== null) return normalizeNgnPerUsd(fromNested);
    }
  }

  return null;
}

function normalizeNgnPerUsd(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value < 1) return 1 / value;
  return value;
}

function numberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export async function fetchLiveNgnPerUsd(config: FxConfig, fetchImpl: typeof fetch = fetch): Promise<number> {
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

    if (!res.ok) {
      throw new FxRateError("FX rate provider returned an error");
    }

    const json = await res.json().catch(() => null);
    const rate = parseNgnPerUsdFromPayload(json);
    if (rate === null) {
      throw new FxRateError("FX rate provider returned an unrecognised payload");
    }
    if (!isRateSane(rate, config.minNgnPerUsd, config.maxNgnPerUsd)) {
      throw new FxRateError("FX rate provider returned an out-of-range rate");
    }

    return rate;
  } catch (error) {
    if (error instanceof FxRateError) throw error;
    throw new FxRateError("FX rate provider is unavailable");
  }
}

export async function quoteNgnToUsd(
  ngnAmount: number | string | Decimal,
  config: FxConfig = getFxConfig(),
  fetchImpl: typeof fetch = fetch
): Promise<FxQuote> {
  const liveNgnPerUsd = await fetchLiveNgnPerUsd(config, fetchImpl);
  const ngnPerUsd = getEffectiveCheckoutNgnPerUsd(liveNgnPerUsd, config);
  const bufferPercent = new Decimal(config.bufferPercent);
  const paymentAmountUsd = convertNgnToUsd(ngnAmount, ngnPerUsd, bufferPercent);

  if (paymentAmountUsd.lt(1)) {
    throw new FxRateError("Converted USD amount is below the $1.00 minimum");
  }

  return {
    ngnPerUsd,
    liveNgnPerUsd: new Decimal(liveNgnPerUsd),
    bufferPercent,
    paymentAmountUsd,
    quotedAt: new Date(),
  };
}

export interface LockedQuoteFields {
  totalAmount: { toString(): string };
  paymentAmount?: { toString(): string } | null;
  fxRate?: { toString(): string } | null;
  fxBufferPercent?: { toString(): string } | null;
  fxQuotedAt?: Date | null;
}

export function recomputeLockedPaymentUsd(order: LockedQuoteFields): Decimal | null {
  if (order.fxRate == null || order.fxBufferPercent == null) return null;
  try {
    return convertNgnToUsd(
      order.totalAmount.toString(),
      order.fxRate.toString(),
      order.fxBufferPercent.toString()
    );
  } catch {
    return null;
  }
}

export function validateLockedQuoteIntegrity(order: LockedQuoteFields): boolean {
  if (!order.paymentAmount || !order.fxRate || order.fxBufferPercent == null || !order.fxQuotedAt) {
    return false;
  }

  const stored = new Decimal(order.paymentAmount.toString());
  const recomputed = recomputeLockedPaymentUsd(order);
  if (!recomputed || !stored.eq(recomputed)) {
    return false;
  }

  return true;
}

export function validateLockedQuote(
  order: LockedQuoteFields,
  ttlMinutes = CHECKOUT_QUOTE_TTL_MINUTES
): boolean {
  if (!validateLockedQuoteIntegrity(order)) {
    return false;
  }
  if (!order.fxQuotedAt || !isFxQuoteFresh(order.fxQuotedAt, ttlMinutes)) {
    return false;
  }
  return true;
}

export function sessionAmountMatchesLocked(
  sessionAmount: string | number | null | undefined,
  lockedUsd: { toString(): string }
): boolean {
  if (sessionAmount == null || sessionAmount === "") return false;
  try {
    const sessionUsd = new Decimal(sessionAmount.toString());
    const locked = new Decimal(lockedUsd.toString());
    return sessionUsd.gte(locked);
  } catch {
    return false;
  }
}
