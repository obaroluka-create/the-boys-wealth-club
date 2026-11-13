/**
 * Exact fixed-point money maths for the server (BigInt, no floating point).
 *
 *   amounts   kobo                          ₦1      = 100n
 *   units     micro-units                   1 unit  = 1_000_000n
 *   prices    ten-thousandths of a naira    ₦1      = 10_000n
 *   percents  ten-thousandths of a percent  1%      = 10_000n
 *
 * The browser-side `src/utils/unitAccounting.ts` mirrors these rules with
 * floats for the mock platform; this module is the source of truth.
 */

export const KOBO_PER_NAIRA = 100n;
export const MICRO_PER_UNIT = 1_000_000n;
export const PRICE_SCALE = 10_000n;
export const PERCENT_SCALE = 10_000n;

export const LAUNCH_UNIT_PRICE = 1_000n * PRICE_SCALE; // ₦1,000

/** value(kobo) = units(micro) × price(1e-4 ₦) / 1e8 */
const VALUE_DIVISOR = 100_000_000n;

/** Integer division rounded half away from zero. */
export function roundDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new Error("Division by zero.");
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const quotient = (n + d / 2n) / d;
  return negative ? -quotient : quotient;
}

function toScaled(value: number, scale: bigint, decimals: number, label: string): bigint {
  if (!Number.isFinite(value)) throw new Error(`${label} must be a number.`);
  const fixed = value.toFixed(decimals);
  const [whole, fraction = ""] = fixed.replace("-", "").split(".");
  const scaled = BigInt(whole) * scale + BigInt(fraction.padEnd(decimals, "0") || "0");
  return value < 0 ? -scaled : scaled;
}

/** ₦ (number from JSON, up to 2 decimals) → kobo. */
export function nairaToKobo(naira: number): bigint {
  return toScaled(naira, KOBO_PER_NAIRA, 2, "Amount");
}

/** Percent (number, up to 4 decimals) → ten-thousandths of a percent. */
export function percentToScaled(percent: number): bigint {
  return toScaled(percent, PERCENT_SCALE, 4, "Percentage");
}

export function koboToNaira(kobo: bigint): number {
  return Number(kobo) / 100;
}

export function unitsToNumber(units: bigint): number {
  return Number(units) / Number(MICRO_PER_UNIT);
}

export function priceToNaira(price: bigint): number {
  return Number(price) / Number(PRICE_SCALE);
}

export function percentToNumber(percent: bigint): number {
  return Number(percent) / Number(PERCENT_SCALE);
}

/** Units bought by `amount` kobo at `unitPrice`. */
export function unitsForAmount(amount: bigint, unitPrice: bigint): bigint {
  if (unitPrice <= 0n) throw new Error("Unit price must be greater than zero.");
  return roundDiv(amount * VALUE_DIVISOR, unitPrice);
}

/** Value in kobo of `units` at `unitPrice`. */
export function valueOf(units: bigint, unitPrice: bigint): bigint {
  return roundDiv(units * unitPrice, VALUE_DIVISOR);
}

/** New unit price after a period's profit and loss (both scaled percents) are applied. */
export function applyPeriodReturn(unitPrice: bigint, profit: bigint, loss: bigint): bigint {
  const hundredPercent = 100n * PERCENT_SCALE;
  return roundDiv(unitPrice * (hundredPercent + profit - loss), hundredPercent);
}

/** Percentage change from → to, as a JS number for display. */
export function percentChange(from: bigint, to: bigint): number {
  if (from === 0n) return 0;
  return (Number(to - from) / Number(from)) * 100;
}

export interface LedgerDeposit {
  at: Date;
  amount: bigint;
  units: bigint;
  unitPrice: bigint;
}

export interface LedgerValuation {
  at: Date;
  unitPrice: bigint;
}

export interface Position {
  units: bigint;
  totalDeposit: bigint;
  currentBalance: bigint;
  totalProfit: bigint;
  totalLoss: bigint;
  points: { date: string; value: bigint; deposited: bigint }[];
}

/**
 * Replay a portfolio's deposits against the book's valuation history.
 * A deposit and a valuation at the same instant: the deposit goes first.
 * `valuations` must be sorted oldest first.
 */
export function replay(deposits: LedgerDeposit[], valuations: LedgerValuation[]): Position {
  type Event =
    | { kind: "deposit"; at: number; deposit: LedgerDeposit }
    | { kind: "valuation"; at: number; valuation: LedgerValuation };
  const events: Event[] = [
    ...deposits.map((deposit) => ({ kind: "deposit" as const, at: deposit.at.getTime(), deposit })),
    ...valuations.map((valuation) => ({
      kind: "valuation" as const,
      at: valuation.at.getTime(),
      valuation,
    })),
  ].sort((a, b) => (a.at === b.at ? (a.kind === "deposit" ? -1 : 1) : a.at - b.at));

  let units = 0n;
  let deposited = 0n;
  let price = valuations[0]?.unitPrice ?? LAUNCH_UNIT_PRICE;
  let gains = 0n;
  const byDay = new Map<string, { date: string; value: bigint; deposited: bigint }>();

  for (const event of events) {
    if (event.kind === "deposit") {
      units += event.deposit.units;
      deposited += event.deposit.amount;
      price = event.deposit.unitPrice;
    } else {
      const change = valueOf(units, event.valuation.unitPrice) - valueOf(units, price);
      if (change > 0n) gains += change;
      price = event.valuation.unitPrice;
    }
    if (units > 0n) {
      const date = new Date(event.at).toISOString().slice(0, 10);
      byDay.set(date, { date, value: valueOf(units, price), deposited });
    }
  }

  const currentBalance = valueOf(units, price);
  // profit − loss always equals balance − deposits. Unit rounding on purchase can leave a
  // kobo of difference; fold it into profit so loss never goes negative.
  let totalProfit = gains;
  let totalLoss = gains - (currentBalance - deposited);
  if (totalLoss < 0n) {
    totalProfit -= totalLoss;
    totalLoss = 0n;
  }
  return {
    units,
    totalDeposit: deposited,
    currentBalance,
    totalProfit,
    totalLoss,
    points: [...byDay.values()],
  };
}
