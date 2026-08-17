/**
 * Focused FX unit tests — run with:
 *   npx tsx apps/web/src/lib/fx.test.ts
 */
import assert from "assert";
import Decimal from "decimal.js";
import {
  convertNgnToUsd,
  isRateSane,
  parseNgnPerUsdFromPayload,
  quoteNgnToUsd,
  buildFxQuoteFromLocked,
  type FxConfig,
} from "./fx";

function test(name: string, fn: () => void | Promise<void>) {
  return { name, fn };
}

async function run() {
  const tests = [
    test("convertNgnToUsd divides by rate", () => {
      // 1600 NGN / 1600 = 1 USD
      const usd = convertNgnToUsd(1600, 1600, 0);
      assert.strictEqual(usd.toFixed(2), "1.00");
    }),

    test("convertNgnToUsd applies buffer then rounds UP to cents", () => {
      // 1000 / 1600 = 0.625; +2% = 0.6375 → ceil cents = 0.64
      const usd = convertNgnToUsd(1000, 1600, 2);
      assert.strictEqual(usd.toFixed(2), "0.64");
    }),

    test("convertNgnToUsd rounds up fractional cents", () => {
      // 1 / 3 = 0.333... → ceil to 0.34
      const usd = convertNgnToUsd(1, 3, 0);
      assert.strictEqual(usd.toFixed(2), "0.34");
    }),

    test("convertNgnToUsd rejects invalid inputs", () => {
      assert.throws(() => convertNgnToUsd(0, 1600, 0));
      assert.throws(() => convertNgnToUsd(100, 0, 0));
      assert.throws(() => convertNgnToUsd(100, 1600, -1));
    }),

    test("isRateSane bounds", () => {
      assert.strictEqual(isRateSane(1600), true);
      assert.strictEqual(isRateSane(50), false);
      assert.strictEqual(isRateSane(9000), false);
    }),

    test("parseNgnPerUsdFromPayload common shapes", () => {
      assert.strictEqual(parseNgnPerUsdFromPayload({ rates: { NGN: 1550 } }), 1550);
      assert.strictEqual(parseNgnPerUsdFromPayload({ conversion_rates: { NGN: 1500 } }), 1500);
      assert.strictEqual(parseNgnPerUsdFromPayload({ NGN: 1400 }), 1400);
      assert.strictEqual(parseNgnPerUsdFromPayload({ rate: 1450 }), 1450);
      assert.strictEqual(parseNgnPerUsdFromPayload({ data: { NGN: 1480 } }), 1480);
      assert.strictEqual(parseNgnPerUsdFromPayload({ foo: 1 }), null);
    }),

    test("quoteNgnToUsd uses live rate when fetch succeeds", async () => {
      const config: FxConfig = {
        rateApiUrl: "https://example.test/rates",
        fallbackNgnPerUsd: 2000,
        bufferPercent: 2,
        minNgnPerUsd: 100,
        maxNgnPerUsd: 5000,
      };
      const fakeFetch: typeof fetch = async () =>
        ({
          ok: true,
          json: async () => ({ rates: { NGN: 1600 } }),
        }) as Response;

      const quote = await quoteNgnToUsd(160000, config, fakeFetch);
      assert.strictEqual(quote.source, "live");
      assert.strictEqual(quote.ngnPerUsd.toNumber(), 1600);
      // 160000/1600 = 100; +2% = 102.00
      assert.strictEqual(quote.paymentAmountUsd.toFixed(2), "102.00");
    }),

    test("quoteNgnToUsd falls back when live fails", async () => {
      const config: FxConfig = {
        rateApiUrl: "https://example.test/rates",
        fallbackNgnPerUsd: 1600,
        bufferPercent: 0,
        minNgnPerUsd: 100,
        maxNgnPerUsd: 5000,
      };
      const fakeFetch: typeof fetch = async () => {
        throw new Error("network down");
      };

      const quote = await quoteNgnToUsd(3200, config, fakeFetch);
      assert.strictEqual(quote.source, "fallback");
      assert.strictEqual(quote.paymentAmountUsd.toFixed(2), "2.00");
    }),

    test("quoteNgnToUsd falls back when rate out of bounds", async () => {
      const config: FxConfig = {
        rateApiUrl: "https://example.test/rates",
        fallbackNgnPerUsd: 1600,
        bufferPercent: 0,
        minNgnPerUsd: 100,
        maxNgnPerUsd: 5000,
      };
      const fakeFetch: typeof fetch = async () =>
        ({
          ok: true,
          json: async () => ({ rates: { NGN: 50 } }), // too low
        }) as Response;

      const quote = await quoteNgnToUsd(1600, config, fakeFetch);
      assert.strictEqual(quote.source, "fallback");
      assert.strictEqual(quote.paymentAmountUsd.toFixed(2), "1.00");
    }),

    test("buildFxQuoteFromLocked reuses rate and buffer", () => {
      const locked = buildFxQuoteFromLocked({
        ngnAmount: 160000,
        ngnPerUsd: 1600,
        bufferPercent: 2,
        source: "live",
        quotedAt: new Date("2026-01-01T00:00:00Z"),
      });
      assert.strictEqual(locked.paymentAmountUsd.toFixed(2), "102.00");
      assert.strictEqual(locked.source, "live");
    }),

    test("locked quote reuse: stored amount matches recomputed", () => {
      const first = convertNgnToUsd(2650000, 1600, 2);
      const second = convertNgnToUsd(2650000, 1600, 2);
      assert.ok(first.eq(second));
      // Sanity: ~$1,656.25 + 2% ≈ $1,689.38 → ceil cents
      assert.ok(first.gte(new Decimal("1689")));
      assert.ok(first.lt(new Decimal("1690")));
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
