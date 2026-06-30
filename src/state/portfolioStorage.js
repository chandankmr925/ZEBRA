/** Portfolio persistence — per-user, per-market via authenticated API */

import { apiFetch } from '../data/apiFetch.js';

/**
 * @param {unknown[]} list
 * @returns {import('../types.js').Position[]}
 */
function normalizeList(list) {
  if (!Array.isArray(list)) return [];

  return list
    .filter((p) => p && typeof p.ticker === 'string' && typeof p.buyPrice === 'number')
    .map((p) => ({
      ticker: p.ticker.toUpperCase(),
      buyPrice: p.buyPrice,
      quantity: typeof p.quantity === 'number' && p.quantity > 0 ? p.quantity : 1,
      addedAt: p.addedAt || new Date().toISOString(),
    }));
}

/**
 * Load portfolio for a market.
 * @param {string} [marketId='US']
 * @returns {Promise<import('../types.js').Position[]>}
 */
export async function loadSavedPositions(marketId = 'US') {
  const data = await apiFetch(`/api/portfolio?market=${encodeURIComponent(marketId)}`);
  return normalizeList(data.positions);
}

/**
 * Load all market portfolios for the current user.
 * @returns {Promise<Record<string, import('../types.js').Position[]>>}
 */
export async function loadAllMarketPositions() {
  const data = await apiFetch('/api/portfolio?market=US');
  if (data.markets && typeof data.markets === 'object') {
    /** @type {Record<string, import('../types.js').Position[]>} */
    const out = {};
    for (const [id, list] of Object.entries(data.markets)) {
      out[id] = normalizeList(list);
    }
    return out;
  }
  return { US: normalizeList(data.positions), IN: [] };
}

/**
 * Save portfolio for a market.
 * @param {import('../types.js').Position[]} positions
 * @param {string} [marketId='US']
 */
export async function savePositions(positions, marketId = 'US') {
  await apiFetch('/api/portfolio', {
    method: 'PUT',
    body: JSON.stringify({
      market: marketId,
      positions: positions.map(({ ticker, buyPrice, quantity, addedAt }) => ({
        ticker,
        buyPrice,
        quantity,
        addedAt,
      })),
    }),
  });
}
