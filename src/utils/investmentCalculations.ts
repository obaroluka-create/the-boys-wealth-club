/**
 * Investment calculation helpers.
 *
 * Performance percentages are measured against total deposits
 * (all capital contributed over time), not a single opening amount.
 * Balances themselves come from unit accounting (see unitAccounting.ts).
 *
 * The backend remains the source of truth and may later re-implement
 * or validate the same formulas.
 */

export function profitPercentage(profit: number, totalDeposit: number): number {
  if (totalDeposit === 0) return 0;
  return (profit / totalDeposit) * 100;
}

export function lossPercentage(loss: number, totalDeposit: number): number {
  if (totalDeposit === 0) return 0;
  return (loss / totalDeposit) * 100;
}

export function netProfitLoss(totalProfit: number, totalLoss: number): number {
  return totalProfit - totalLoss;
}

export function netPerformancePercentage(net: number, totalDeposit: number): number {
  if (totalDeposit === 0) return 0;
  return (net / totalDeposit) * 100;
}

export function portfolioPerformancePercentage(portfolio: {
  totalProfit: number;
  totalLoss: number;
  totalDeposit: number;
}): number {
  return netPerformancePercentage(
    netProfitLoss(portfolio.totalProfit, portfolio.totalLoss),
    portfolio.totalDeposit,
  );
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}
