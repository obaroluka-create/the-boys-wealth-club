/**
 * Unit accounting for the collective book.
 *
 * The book works like a mutual fund:
 * - The book has a unit price (₦1,000 at launch).
 * - A deposit buys units at the unit price in effect when it is recorded.
 * - Recording book performance changes only the unit price.
 * - Balance = units held × current unit price.
 *
 * Because units are bought at the current price, a deposit only earns the
 * performance that happens after it was made. Every investor still shares
 * the same book and the same price.
 *
 * This is the frontend reference implementation. The backend must own these
 * calculations and store units and purchase prices on each deposit.
 */

import type { BookValuation, PortfolioPerformancePoint } from "@/types";
import { roundCurrency } from "@/utils/investmentCalculations";

export const LAUNCH_UNIT_PRICE = 1_000;

const UNIT_SCALE = 1e6; // units are held to 6 decimal places
const PRICE_SCALE = 1e4; // unit prices are held to 4 decimal places

export function roundUnits(value: number): number {
  return Math.round(value * UNIT_SCALE) / UNIT_SCALE;
}

export function roundUnitPrice(value: number): number {
  return Math.round(value * PRICE_SCALE) / PRICE_SCALE;
}

/** Units bought by a deposit of `amount` at `unitPrice`. */
export function unitsForAmount(amount: number, unitPrice: number): number {
  if (!(unitPrice > 0)) throw new Error("Unit price must be greater than zero.");
  return roundUnits(amount / unitPrice);
}

export function unitValue(units: number, unitPrice: number): number {
  return roundCurrency(units * unitPrice);
}

/** Net period return in percent from the profit and loss an admin records. */
export function netPeriodPercent(profitPercent: number, lossPercent: number): number {
  return profitPercent - lossPercent;
}

/** Unit price after a period's profit and loss percentages are applied. */
export function applyPeriodReturn(
  unitPrice: number,
  profitPercent: number,
  lossPercent: number,
): number {
  return roundUnitPrice(unitPrice * (1 + netPeriodPercent(profitPercent, lossPercent) / 100));
}

export function percentChange(from: number, to: number): number {
  if (from === 0) return 0;
  return ((to - from) / from) * 100;
}

/**
 * Unit price in effect at `at` (ISO date or datetime): the latest valuation
 * recorded at or before it. Valuations must be sorted oldest first.
 */
export function unitPriceAt(valuations: BookValuation[], at: string): number {
  let price = valuations[0]?.unitPrice ?? LAUNCH_UNIT_PRICE;
  for (const valuation of valuations) {
    if (valuation.date > at) break;
    price = valuation.unitPrice;
  }
  return price;
}

export interface LedgerDeposit {
  date: string;
  amount: number;
  units: number;
  unitPrice: number;
}

export interface PortfolioPosition {
  units: number;
  totalDeposit: number;
  currentBalance: number;
  /** Sum of every gain from price rises while units were held. */
  totalProfit: number;
  /** Sum of every loss from price falls while units were held (positive number). */
  totalLoss: number;
  points: PortfolioPerformancePoint[];
}

/**
 * Rebuild a portfolio from its deposits and the book's valuation history.
 *
 * Events are processed in time order. A deposit adds the units it bought; a
 * valuation moves the price, and the change on the units held at that moment
 * is booked as profit or loss. A deposit dated on the same day as a
 * valuation, but earlier (date-only strings sort before datetimes), buys at
 * the price before that valuation and then takes part in it.
 */
export function replayPortfolio(
  deposits: LedgerDeposit[],
  valuations: BookValuation[],
): PortfolioPosition {
  type Event =
    | { kind: "deposit"; date: string; deposit: LedgerDeposit }
    | { kind: "valuation"; date: string; valuation: BookValuation };

  const events: Event[] = [
    ...deposits.map((deposit) => ({ kind: "deposit" as const, date: deposit.date, deposit })),
    ...valuations.map((valuation) => ({
      kind: "valuation" as const,
      date: valuation.date,
      valuation,
    })),
  ].sort((a, b) =>
    a.date === b.date ? (a.kind === "deposit" ? -1 : 1) : a.date.localeCompare(b.date),
  );

  let units = 0;
  let deposited = 0;
  let price = valuations[0]?.unitPrice ?? LAUNCH_UNIT_PRICE;
  let gains = 0;
  const byDay = new Map<string, PortfolioPerformancePoint>();

  for (const event of events) {
    if (event.kind === "deposit") {
      units = roundUnits(units + event.deposit.units);
      deposited = roundCurrency(deposited + event.deposit.amount);
      price = event.deposit.unitPrice;
    } else {
      // Rises are booked as profit; falls show up in totalLoss, derived below.
      const change = units * (event.valuation.unitPrice - price);
      if (change > 0) gains += change;
      price = event.valuation.unitPrice;
    }
    if (units > 0) {
      const value = unitValue(units, price);
      byDay.set(event.date.slice(0, 10), {
        date: event.date.slice(0, 10),
        value,
        percentageChange: percentChange(deposited, value),
      });
    }
  }

  const currentBalance = unitValue(units, price);
  const totalProfit = roundCurrency(gains);
  // Derive loss from the balance so profit − loss always equals balance − deposits exactly.
  const totalLoss = roundCurrency(totalProfit - (currentBalance - deposited));

  return {
    units,
    totalDeposit: deposited,
    currentBalance,
    totalProfit,
    totalLoss: Math.abs(totalLoss) < 0.005 ? 0 : totalLoss,
    points: [...byDay.values()],
  };
}
