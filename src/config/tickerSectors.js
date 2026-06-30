/** Map tickers to GICS-style sectors (overrides index-based assignment). */

import { SECTOR_KEYS } from './sectors.js';
import { INDIA_TICKER_SECTORS } from './indiaTickerSectors.js';

export const TICKER_SECTORS = {
  AAPL: 'Technology',
  MSFT: 'Technology',
  AMZN: 'Consumer Disc.',
  NVDA: 'Technology',
  GOOGL: 'Communication',
  GOOG: 'Communication',
  META: 'Communication',
  'BRK.B': 'Financials',
  JPM: 'Financials',
  V: 'Financials',
  MA: 'Financials',
  BAC: 'Financials',
  WFC: 'Financials',
  GS: 'Financials',
  XOM: 'Energy',
  CVX: 'Energy',
  COP: 'Energy',
  JNJ: 'Healthcare',
  UNH: 'Healthcare',
  PFE: 'Healthcare',
  MRK: 'Healthcare',
  LLY: 'Healthcare',
  TSLA: 'Consumer Disc.',
  NFLX: 'Communication',
  DIS: 'Communication',
  COST: 'Consumer Staples',
  WMT: 'Consumer Staples',
  KO: 'Consumer Staples',
  PEP: 'Consumer Staples',
  HD: 'Consumer Disc.',
  NEE: 'Utilities',
  DUK: 'Utilities',
};

/**
 * @param {string} ticker
 * @param {number} index
 * @param {string} [marketId='US']
 * @returns {string}
 */
export function getSectorForTicker(ticker, index, marketId = 'US') {
  const key = ticker.toUpperCase();
  if (marketId === 'IN') {
    return INDIA_TICKER_SECTORS[key] ?? SECTOR_KEYS[index % SECTOR_KEYS.length];
  }
  return TICKER_SECTORS[key] ?? SECTOR_KEYS[index % SECTOR_KEYS.length];
}
