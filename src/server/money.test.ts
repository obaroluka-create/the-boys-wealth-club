import { describe, expect, it } from "vitest";
import {
  LAUNCH_UNIT_PRICE,
  applyPeriodReturn,
  nairaToKobo,
  percentToScaled,
  replay,
  roundDiv,
  unitsForAmount,
  valueOf,
} from "@/server/money";

const day = (iso: string) => new Date(iso);

describe("conversions", () => {
  it("converts naira to kobo without floating-point drift", () => {
    expect(nairaToKobo(0.1 + 0.2)).toBe(30n);
    expect(nairaToKobo(1_250_000)).toBe(125_000_000n);
    expect(nairaToKobo(19.99)).toBe(1_999n);
  });

  it("scales percentages to ten-thousandths", () => {
    expect(percentToScaled(2)).toBe(20_000n);
    expect(percentToScaled(0.1234)).toBe(1_234n);
  });

  it("rounds half away from zero", () => {
    expect(roundDiv(5n, 2n)).toBe(3n);
    expect(roundDiv(-5n, 2n)).toBe(-3n);
    expect(roundDiv(4n, 3n)).toBe(1n);
  });
});

describe("unit pricing", () => {
  it("buys units at the current price", () => {
    // ₦100,000 at ₦1,000 per unit = 100 units
    expect(unitsForAmount(nairaToKobo(100_000), LAUNCH_UNIT_PRICE)).toBe(100_000_000n);
    expect(valueOf(100_000_000n, LAUNCH_UNIT_PRICE)).toBe(nairaToKobo(100_000));
  });

  it("applies a period's net return to the unit price", () => {
    // +5% profit, −1% loss → +4%
    expect(applyPeriodReturn(LAUNCH_UNIT_PRICE, percentToScaled(5), percentToScaled(1))).toBe(
      10_400_000n,
    );
  });
});

describe("replay", () => {
  const valuations = [
    { at: day("2025-01-01T16:00:00Z"), unitPrice: LAUNCH_UNIT_PRICE },
    { at: day("2025-02-01T16:00:00Z"), unitPrice: 11_000_000n }, // ₦1,100 (+10%)
    { at: day("2025-03-01T16:00:00Z"), unitPrice: 9_900_000n }, // ₦990 (−10%)
  ];

  it("credits a deposit only with performance after it was made", () => {
    const early = {
      at: day("2025-01-10T00:00:00Z"),
      amount: nairaToKobo(100_000),
      unitPrice: LAUNCH_UNIT_PRICE,
      units: unitsForAmount(nairaToKobo(100_000), LAUNCH_UNIT_PRICE),
    };
    const late = {
      at: day("2025-02-10T00:00:00Z"),
      amount: nairaToKobo(110_000),
      unitPrice: 11_000_000n,
      units: unitsForAmount(nairaToKobo(110_000), 11_000_000n),
    };

    const earlyOnly = replay([early], valuations);
    expect(earlyOnly.currentBalance).toBe(nairaToKobo(99_000)); // 100 units × ₦990
    expect(earlyOnly.totalProfit).toBe(nairaToKobo(10_000));
    expect(earlyOnly.totalLoss).toBe(nairaToKobo(11_000));

    // The late deposit missed the +10% rise and only takes part in the −10% fall.
    const lateOnly = replay([late], valuations);
    expect(lateOnly.currentBalance).toBe(nairaToKobo(99_000)); // 100 units × ₦990
    expect(lateOnly.totalProfit).toBe(0n);
    expect(lateOnly.totalLoss).toBe(nairaToKobo(11_000));
  });

  it("keeps profit − loss equal to balance − deposits", () => {
    const deposits = [
      { at: day("2025-01-05T00:00:00Z"), amount: 1_234_567n, unitPrice: LAUNCH_UNIT_PRICE },
      { at: day("2025-02-05T00:00:00Z"), amount: 7_654_321n, unitPrice: 11_000_000n },
    ].map((item) => ({ ...item, units: unitsForAmount(item.amount, item.unitPrice) }));
    const position = replay(deposits, valuations);
    expect(position.totalProfit - position.totalLoss).toBe(
      position.currentBalance - position.totalDeposit,
    );
    expect(position.totalLoss >= 0n).toBe(true);
  });

  it("processes a deposit before a valuation at the same instant", () => {
    const at = day("2025-02-01T16:00:00Z");
    const deposit = {
      at,
      amount: nairaToKobo(1_000),
      unitPrice: LAUNCH_UNIT_PRICE,
      units: unitsForAmount(nairaToKobo(1_000), LAUNCH_UNIT_PRICE),
    };
    const position = replay([deposit], valuations.slice(0, 2));
    expect(position.currentBalance).toBe(nairaToKobo(1_100));
  });
});
