export function calculateForwardRate({ spot1Year, spot2Year }) {
  const r1 = spot1Year / 100;
  const r2 = spot2Year / 100;
  
  // f(1,1) = [(1 + s₂)² / (1 + s₁)] - 1
  const forwardRate = (Math.pow(1 + r2, 2) / (1 + r1)) - 1;
  const forwardRatePct = forwardRate * 100;
  
  // Strategy 1: Invest 1 year, then reinvest at forward rate
  const strategy1Year1 = 100 * (1 + r1);
  const strategy1Year2 = strategy1Year1 * (1 + forwardRate);
  
  // Strategy 2: Invest 2 years at 2-year rate
  const strategy2Year2 = 100 * Math.pow(1 + r2, 2);
  
  return {
    forwardRate: forwardRatePct,
    forwardRateDecimal: forwardRate,
    strategy1Year1Value: strategy1Year1,
    strategy1Final: strategy1Year2,
    strategy2Final: strategy2Year2,
    isValid: Number.isFinite(forwardRatePct)
      && r1 >= 0 && r2 >= 0
      && r1 <= 0.5 && r2 <= 0.5
  };
}

export function generateCashFlows({ spot1Year, spot2Year, forwardData }) {
  const cashFlows = [
    {
      period: 0,
      year: 0,
      strategy1Cash: -100,
      strategy2Cash: -100,
      spot1Year: null,
      spot2Year: spot2Year,
      forwardRate: null
    },
    {
      period: 1,
      year: 1,
      strategy1Maturity: forwardData.strategy1Year1Value,
      strategy1Reinvest: -forwardData.strategy1Year1Value,
      strategy2Cash: 0,
      spot1Year: spot1Year,
      spot2Year: spot2Year,
      forwardRate: null
    },
    {
      period: 2,
      year: 2,
      strategy1Cash: forwardData.strategy1Final,
      strategy2Cash: forwardData.strategy2Final,
      spot1Year: null,
      spot2Year: spot2Year,
      forwardRate: forwardData.forwardRate
    }
  ];
  
  return cashFlows;
}

export function calculateForwardMetrics(params) {
  const { spot1Year, spot2Year } = params;
  
  const forwardData = calculateForwardRate({ spot1Year, spot2Year });
  const cashFlows = generateCashFlows({ spot1Year, spot2Year, forwardData });
  
  return {
    ...forwardData,
    cashFlows
  };
}
