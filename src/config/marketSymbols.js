/** Ticker normalization and Yahoo Finance symbol mapping per market */

import { getMarketConfig } from './markets.js';

/**
 * Display ticker stored in app state (no exchange suffix).
 * @param {string} ticker
 * @param {string} [marketId]
 */
export function normalizeTicker(ticker, marketId = 'US') {
  const t = ticker.trim().toUpperCase();
  if (!t) return t;

  const config = getMarketConfig(marketId);
  if (marketId === 'IN') {
    return t.replace(/\.(NS|BO|NSE|BSE)$/i, '');
  }
  return t;
}

/**
 * Detect market from ticker shape (portfolio positions entered without market context).
 * @param {string} ticker
 */
export function detectMarketFromTicker(ticker) {
  const t = ticker.trim().toUpperCase();
  if (/\.(NS|BO|NSE|BSE)$/i.test(t)) return 'IN';
  if (t.startsWith('^')) return 'US';
  return null;
}

/**
 * Yahoo Finance symbol for API requests.
 * @param {string} ticker
 * @param {string} [marketId]
 */
export function toYahooSymbol(ticker, marketId = 'US') {
  const config = getMarketConfig(marketId);
  const normalized = normalizeTicker(ticker, marketId);

  if (marketId === 'IN') {
    if (normalized.startsWith('^')) return normalized;
    if (normalized.endsWith('.NS') || normalized.endsWith('.BO')) return normalized;
    return `${normalized}${config.yahooSuffix || '.NS'}`;
  }

  return normalized.replace(/\./g, '-');
}

/**
 * @param {string} yahooSymbol
 * @param {string} [marketId]
 */
export function fromYahooSymbol(yahooSymbol, marketId = 'US') {
  if (marketId === 'IN') {
    return yahooSymbol.toUpperCase().replace(/\.(NS|BO)$/i, '');
  }
  return yahooSymbol.toUpperCase().replace(/-/g, (m, offset, str) => {
    if (str.includes('-') && str.indexOf('-') === offset) return '.';
    return m;
  });
}
