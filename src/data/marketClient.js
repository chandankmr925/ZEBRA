/** Client for live market data API (proxied via local server) */

/**
 * @param {string[]} tickers
 * @param {string} [marketId='US']
 */
export async function fetchLiveQuotes(tickers, marketId = 'US') {
  if (tickers.length === 0) {
    return { quotes: {}, failed: [], fetchedAt: new Date().toISOString(), market: marketId };
  }

  const res = await fetch(
    `/api/market/quotes?tickers=${encodeURIComponent(tickers.join(','))}&market=${encodeURIComponent(marketId)}`,
    { cache: 'no-store' }
  );

  if (!res.ok) {
    throw new Error(`Quote fetch failed: HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * @param {string[]} tickers
 * @param {number} [concurrency=6]
 * @param {string} [marketId='US']
 */
export async function fetchUniverseStocks(tickers, concurrency = 6, marketId = 'US') {
  const res = await fetch('/api/market/universe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tickers, concurrency, market: marketId }),
  });

  if (!res.ok) {
    throw new Error(`Universe fetch failed: HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * @param {string} ticker
 * @param {string} [marketId='US']
 */
export async function fetchStockHistory(ticker, marketId = 'US') {
  const res = await fetch(
    `/api/market/history?ticker=${encodeURIComponent(ticker.toUpperCase())}&market=${encodeURIComponent(marketId)}`,
    { cache: 'no-store' }
  );

  if (!res.ok) {
    throw new Error(`History fetch failed for ${ticker}: HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * @param {import('../types.js').Stock[]} universe
 * @param {Record<string, { price: number, quoteTime?: string }>} quotes
 */
export function applyQuotesToUniverse(universe, quotes) {
  for (const stock of universe) {
    const q = quotes[stock.ticker.toUpperCase()];
    if (!q) continue;

    stock.currentPrice = q.price;
    stock.isLive = true;
    if (q.quoteTime) stock.quoteTime = q.quoteTime;

    if (stock.history?.length) {
      const last = stock.history[stock.history.length - 1];
      last.close = q.price;
      last.high = Math.max(last.high, q.price);
      last.low = Math.min(last.low, q.price);
    }
  }
}

/**
 * @param {import('../types.js').Stock[]} liveStocks
 * @param {import('../types.js').Stock[]} syntheticFallback
 * @returns {import('../types.js').Stock[]}
 */
export function mergeLiveWithSynthetic(liveStocks, syntheticFallback) {
  const liveMap = new Map(liveStocks.map((s) => [s.ticker.toUpperCase(), s]));
  const merged = [];

  for (const syn of syntheticFallback) {
    const key = syn.ticker.toUpperCase();
    merged.push(liveMap.get(key) ?? syn);
    liveMap.delete(key);
  }

  for (const stock of liveMap.values()) {
    merged.push(stock);
  }

  return merged;
}
