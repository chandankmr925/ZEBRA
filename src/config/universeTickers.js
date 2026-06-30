/** Build a deduplicated ticker list for the synthetic universe */

import { NSE_TICKERS } from './indiaTickers.js';
import { getMarketConfig } from './markets.js';
import { SP500_TICKERS } from './tickers.js';

/**
 * @param {number} [count]
 * @param {string} [marketId='US']
 * @returns {string[]}
 */
export function buildUniqueTickerList(count, marketId = 'US') {
  const config = getMarketConfig(marketId);
  const max = count ?? config.maxUniverse;
  const source = marketId === 'IN' ? NSE_TICKERS : SP500_TICKERS;
  const unique = [];
  const seen = new Set();

  for (const ticker of source) {
    if (seen.has(ticker)) continue;
    seen.add(ticker);
    unique.push(ticker);
    if (unique.length >= max) break;
  }

  const prefix = marketId === 'IN' ? 'IN' : 'SYM';
  while (unique.length < max) {
    unique.push(`${prefix}${String(unique.length + 1).padStart(3, '0')}`);
  }

  return unique;
}
