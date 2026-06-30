/** Supported equity markets */

export const MARKETS = {
  US: {
    id: 'US',
    label: 'United States (S&P 500)',
    dashboardTitle: 'S&P 500 Dashboard',
    shortLabel: 'S&P 500',
    currency: 'USD',
    currencySymbol: '$',
    exchange: 'NYSE/NASDAQ',
    maxUniverse: 500,
    defaultScanSize: 500,
    benchmark: 'SPY',
    syntheticPriceMultiplier: 1,
    theme: {
      bodyClass: 'market-us',
      logoGradient: 'from-blue-500 to-indigo-600',
      logoShadow: 'shadow-blue-500/20',
      accentText: 'text-blue-400',
      scanButton: 'from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25',
      bannerBorder: 'border-blue-800/50',
      bannerBg: 'from-blue-950/40 to-slate-900',
    },
  },
  IN: {
    id: 'IN',
    label: 'India (NSE 200)',
    dashboardTitle: 'NSE 200 Dashboard',
    shortLabel: 'NSE 200',
    currency: 'INR',
    currencySymbol: '₹',
    exchange: 'NSE',
    maxUniverse: 200,
    defaultScanSize: 150,
    benchmark: '^NSEI',
    yahooSuffix: '.NS',
    syntheticPriceMultiplier: 12,
    theme: {
      bodyClass: 'market-in',
      logoGradient: 'from-orange-500 to-amber-600',
      logoShadow: 'shadow-orange-500/20',
      accentText: 'text-orange-400',
      scanButton: 'from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-orange-500/25',
      bannerBorder: 'border-orange-800/50',
      bannerBg: 'from-orange-950/40 to-slate-900',
    },
  },
};

/** @param {string} marketId */
export function getMarketConfig(marketId) {
  return MARKETS[marketId] ?? MARKETS.US;
}

export const MARKET_IDS = Object.keys(MARKETS);
