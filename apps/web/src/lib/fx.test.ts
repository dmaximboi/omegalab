import assert from "assert";
import Decimal from "decimal.js";
import {
  convertNgnToUsd,
  isRateSane,
  isFxQuoteFresh,
  getEffectiveCheckoutNgnPerUsd,
  estimateNgnAtRate,
  parseNgnPerUsdFromPayload,
  quoteNgnToUsd,
  validateLockedQuote,
  validateLockedQuoteIntegrity,
  FxRateError,
  CHECKOUT_QUOTE_TTL_MINUTES,
  type FxConfig,
} from "./fx";

function test(name: string, fn: () => void | Promise<void>) {
  return { name, fn };
}

function baseConfig(overrides: Partial<FxConfig> = {}): FxConfig {
  return {
    rateApiUrl: "https://example.test/rates",
    bufferPercent: 2,
    checkoutRateDiscountPercent: 10,
    minNgnPerUsd: 100,
    maxNgnPerUsd: 5000,
    quoteTtlMinutes: CHECKOUT_QUOTE_TTL_MINUTES,
    ...overrides,
  };
}

async function run() {
  const tests = [
    test("convertNgnToUsd divides by rate", () => {
      const usd = convertNgnToUsd(1600, 1600, 0);
      assert.strictEqual(usd.toFixed(2), "1.00");
    }),

    test("convertNgnToUsd applies buffer then rounds UP to cents", () => {
      const usd = convertNgnToUsd(1000, 1600, 2);
      assert.strictEqual(usd.toFixed(2), "0.64");
    }),

    test("convertNgnToUsd rejects invalid inputs", () => {
      assert.throws(() => convertNgnToUsd(0, 1600, 0));
      assert.throws(() => convertNgnToUsd(100, 0, 0));
      assert.throws(() => convertNgnToUsd(100, 1600, -1));
    }),

    test("parseNgnPerUsdFromPayload inverts sub-unit rates", () => {
      assert.strictEqual(parseNgnPerUsdFromPayload({ rate: 0.000625 }), 1600);
    }),

    test("getEffectiveCheckoutNgnPerUsd applies discount to live rate", () => {
      const config = baseConfig();
      assert.strictEqual(getEffectiveCheckoutNgnPerUsd(1600, config).toNumber(), 1440);
      assert.strictEqual(getEffectiveCheckoutNgnPerUsd(1500, config).toNumber(), 1350);
    }),

    test("180k NGN order covers catalogue total at Bachs-like NGN display", async () => {
      const config = baseConfig();
      const fakeFetch: typeof fetch = async () =>
        ({
          ok: true,
          json: async () => ({ rates: { NGN: 1600 } }),
        }) as Response;

      const quote = await quoteNgnToUsd(180000, config, fakeFetch);
      const bachsDisplayNgn = estimateNgnAtRate(quote.paymentAmountUsd, 1455);

      assert.ok(bachsDisplayNgn.gte(new Decimal(180000)));
      assert.strictEqual(quote.paymentAmountUsd.toFixed(2), "127.50");
    }),

    test("isFxQuoteFresh uses 5 minute checkout window", () => {
      const recent = new Date(Date.now() - 4 * 60 * 1000);
      const stale = new Date(Date.now() - 6 * 60 * 1000);
      assert.strictEqual(isFxQuoteFresh(recent, CHECKOUT_QUOTE_TTL_MINUTES), true);
      assert.strictEqual(isFxQuoteFresh(stale, CHECKOUT_QUOTE_TTL_MINUTES), false);
    }),

    test("quoteNgnToUsd requires live rate", async () => {
      const config = baseConfig();
      const fakeFetch: typeof fetch = async () =>
        ({
          ok: true,
          json: async () => ({ rates: { NGN: 1600 } }),
        }) as Response;

      const quote = await quoteNgnToUsd(160000, config, fakeFetch);
      assert.strictEqual(quote.liveNgnPerUsd.toNumber(), 1600);
      assert.strictEqual(quote.paymentAmountUsd.toFixed(2), "113.34");
    }),

    test("quoteNgnToUsd rejects unavailable provider", async () => {
      const config = baseConfig();
      const fakeFetch: typeof fetch = async () => {
        throw new Error("network down");
      };

      await assert.rejects(() => quoteNgnToUsd(3200, config, fakeFetch), FxRateError);
    }),

    test("quoteNgnToUsd rejects out-of-range rate", async () => {
      const config = baseConfig();
      const fakeFetch: typeof fetch = async () =>
        ({
          ok: true,
          json: async () => ({ rates: { NGN: 50 } }),
        }) as Response;

      await assert.rejects(() => quoteNgnToUsd(1600, config, fakeFetch), FxRateError);
    }),

    test("validateLockedQuote rejects stale and tampered quotes", () => {
      const freshAt = new Date();
      const staleAt = new Date(Date.now() - 10 * 60 * 1000);

      assert.strictEqual(
        validateLockedQuote({
          totalAmount: { toString: () => "180000" },
          paymentAmount: { toString: () => "127.50" },
          fxRate: { toString: () => "1440" },
          fxBufferPercent: { toString: () => "2" },
          fxQuotedAt: freshAt,
        }),
        true
      );

      assert.strictEqual(
        validateLockedQuote({
          totalAmount: { toString: () => "180000" },
          paymentAmount: { toString: () => "127.50" },
          fxRate: { toString: () => "1440" },
          fxBufferPercent: { toString: () => "2" },
          fxQuotedAt: staleAt,
        }),
        false
      );

      assert.strictEqual(
        validateLockedQuoteIntegrity({
          totalAmount: { toString: () => "180000" },
          paymentAmount: { toString: () => "999.99" },
          fxRate: { toString: () => "1440" },
          fxBufferPercent: { toString: () => "2" },
          fxQuotedAt: staleAt,
        }),
        false
      );

      assert.strictEqual(
        validateLockedQuoteIntegrity({
          totalAmount: { toString: () => "180000" },
          paymentAmount: { toString: () => "127.50" },
          fxRate: { toString: () => "1440" },
          fxBufferPercent: { toString: () => "2" },
          fxQuotedAt: staleAt,
        }),
        true
      );
    }),
  ];

  let passed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`✓ ${t.name}`);
      passed += 1;
    } catch (err) {
      console.error(`✗ ${t.name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }
  console.log(`\n${passed}/${tests.length} passed`);
  if (passed !== tests.length) process.exit(1);
}

run();
