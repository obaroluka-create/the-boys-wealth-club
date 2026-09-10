import type { InvestmentPortfolio } from "@/types";
import {
  lossPercentage,
  netPerformancePercentage,
  netProfitLoss,
  profitPercentage,
} from "@/utils/investmentCalculations";

export function getPortfolioMetrics(portfolio: InvestmentPortfolio) {
  const net = netProfitLoss(portfolio.totalProfit, portfolio.totalLoss);
  return {
    net,
    profitPct: profitPercentage(portfolio.totalProfit, portfolio.totalDeposit),
    lossPct: lossPercentage(portfolio.totalLoss, portfolio.totalDeposit),
    netPct: netPerformancePercentage(net, portfolio.totalDeposit),
  };
}
