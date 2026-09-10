/**
 * Investment calculation helpers.
 *
 * Performance percentages are measured against total deposits
 * (all capital contributed over time), not a single opening amount.
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

export function derivedBalance(
  totalDeposit: number,
  totalProfit: number,
  totalLoss: number,
): number {
  return totalDeposit + netProfitLoss(totalProfit, totalLoss);
}

export function applyBookToDeposit(
  totalDeposit: number,
  profitRate: number,
  lossRate: number,
): { totalProfit: number; totalLoss: number; currentBalance: number } {
  const totalProfit = roundCurrency(totalDeposit * profitRate);
  const totalLoss = roundCurrency(totalDeposit * lossRate);
  return {
    totalProfit,
    totalLoss,
    currentBalance: roundCurrency(derivedBalance(totalDeposit, totalProfit, totalLoss)),
  };
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
