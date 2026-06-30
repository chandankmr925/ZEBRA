/** Build a deduplicated ticker list for the synthetic universe */

import { SP500_TICKERS } from './tickers.js';
import { MAX_UNIVERSE_SIZE } from './constants.js';

/**
 * @param {number} [count=MAX_UNIVERSE_SIZE]
 * @returns {string[]}
 */
export function buildUniqueTickerList(count = MAX_UNIVERSE_SIZE) {
  const unique = [];
  const seen = new Set();

  for (const ticker of SP500_TICKERS) {
    if (seen.has(ticker)) continue;
    seen.add(ticker);
    unique.push(ticker);
    if (unique.length >= count) break;
  }

  while (unique.length < count) {
    unique.push(`SYM${String(unique.length + 1).padStart(3, '0')}`);
  }

  return unique;
}
