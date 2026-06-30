/**
 * Live market data via Yahoo Finance (server-side proxy).
 * Caches responses on disk to reduce API calls.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSectorForTicker } from '../src/config/tickerSectors.js';
import { SECTORS } from '../src/config/sectors.js';
import { HISTORY_DAYS } from '../src/config/constants.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = path.join(ROOT, 'data', 'market-cache');

const QUOTE_TTL_MS = 60_000;
const HISTORY_TTL_MS = 15 * 60_000;

/** @type {Map<string, { data: unknown, expires: number }>} */
const memoryCache = new Map();

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; SP500Screener/1.0)',
  Accept: 'application/json',
};

/**
 * @param {string} ticker
 */
export function toYahooSymbol(ticker) {
  return ticker.toUpperCase().replace(/\./g, '-');
}

/**
 * @param {string} ticker
 */
export function fromYahooSymbol(symbol) {
  return symbol.toUpperCase().replace(/-/g, (m, offset, str) => {
    if (str.includes('-') && str.indexOf('-') === offset) return '.';
    return m;
  });
}

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

/**
 * @param {string} key
 */
function cachePath(key) {
  return path.join(CACHE_DIR, `${key.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
}

/**
 * @param {string} key
 * @param {number} ttlMs
 */
async function readCache(key, ttlMs) {
  const mem = memoryCache.get(key);
  if (mem && mem.expires > Date.now()) return mem.data;

  try {
    const raw = await fs.readFile(cachePath(key), 'utf-8');
    const entry = JSON.parse(raw);
    if (entry.expires > Date.now()) {
      memoryCache.set(key, { data: entry.data, expires: entry.expires });
      return entry.data;
    }
  } catch {
    /* miss */
  }
  return null;
}

/**
 * @param {string} key
 * @param {unknown} data
 * @param {number} ttlMs
 */
async function writeCache(key, data, ttlMs) {
  const expires = Date.now() + ttlMs;
  memoryCache.set(key, { data, expires });
  await ensureCacheDir();
  await fs.writeFile(cachePath(key), JSON.stringify({ expires, data }), 'utf-8');
}

/**
 * @param {string} yahooSymbol
 */
async function fetchYahooChart(yahooSymbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1y`;
  const res = await fetch(url, { headers: YAHOO_HEADERS });

  if (!res.ok) {
    throw new Error(`Yahoo Finance HTTP ${res.status} for ${yahooSymbol}`);
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) {
    throw new Error(`No chart data for ${yahooSymbol}`);
  }
  return result;
}

/**
 * @param {object} chartResult
 * @param {string} ticker
 */
function parseChartToStock(chartResult, ticker) {
  const quote = chartResult.indicators?.quote?.[0];
  const timestamps = chartResult.timestamp || [];

  if (!quote || timestamps.length === 0) {
    throw new Error(`Empty OHLCV for ${ticker}`);
  }

  const history = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = quote.close?.[i];
    if (close == null || Number.isNaN(close)) continue;

    const open = quote.open?.[i] ?? close;
    const high = quote.high?.[i] ?? close;
    const low = quote.low?.[i] ?? close;
    const volume = quote.volume?.[i] ?? 0;

    history.push({
      date: i,
      open: round2(open),
      high: round2(Math.max(high, open, close)),
      low: round2(Math.min(low, open, close)),
      close: round2(close),
      volume: Math.round(volume),
    });
  }

  if (history.length < 30) {
    throw new Error(`Insufficient history for ${ticker} (${history.length} bars)`);
  }

  const trimmed = history.slice(-HISTORY_DAYS);
  const sectorKey = getSectorForTicker(ticker, 0);
  const sector = SECTORS[sectorKey] ?? SECTORS.Technology;

  const livePrice =
    chartResult.meta?.regularMarketPrice ??
    trimmed[trimmed.length - 1].close;

  return {
    ticker: ticker.toUpperCase(),
    name: chartResult.meta?.longName || chartResult.meta?.shortName || `${ticker} Corp.`,
    sector: sectorKey,
    beta: sector.beta,
    history: trimmed,
    currentPrice: round2(livePrice),
    isLive: true,
    quoteTime: chartResult.meta?.regularMarketTime
      ? new Date(chartResult.meta.regularMarketTime * 1000).toISOString()
      : new Date().toISOString(),
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * @param {string} ticker
 */
export async function fetchStockHistory(ticker) {
  const normalized = ticker.toUpperCase();
  const cacheKey = `history_${normalized}`;
  const cached = await readCache(cacheKey, HISTORY_TTL_MS);
  if (cached) return cached;

  const yahoo = toYahooSymbol(normalized);
  const chart = await fetchYahooChart(yahoo);
  const stock = parseChartToStock(chart, normalized);
  await writeCache(cacheKey, stock, HISTORY_TTL_MS);
  return stock;
}

/**
 * @param {string} ticker
 */
export async function fetchLiveQuote(ticker) {
  const normalized = ticker.toUpperCase();
  const cacheKey = `quote_${normalized}`;
  const cached = await readCache(cacheKey, QUOTE_TTL_MS);
  if (cached) return cached;

  const stock = await fetchStockHistory(normalized);
  const quote = {
    ticker: normalized,
    price: stock.currentPrice,
    quoteTime: stock.quoteTime,
    name: stock.name,
  };
  await writeCache(cacheKey, quote, QUOTE_TTL_MS);
  return quote;
}

/**
 * @param {string[]} tickers
 * @param {number} [concurrency=6]
 */
export async function fetchLiveQuotes(tickers, concurrency = 6) {
  const unique = [...new Set(tickers.map((t) => t.toUpperCase()))];
  const results = await mapPool(unique, async (ticker) => {
    try {
      const quote = await fetchLiveQuote(ticker);
      return { ok: true, quote };
    } catch (err) {
      return { ok: false, ticker, error: err.message };
    }
  }, concurrency);

  const quotes = {};
  const failed = [];
  for (const r of results) {
    if (r.ok) quotes[r.quote.ticker] = r.quote;
    else failed.push({ ticker: r.ticker, error: r.error });
  }
  return { quotes, failed, fetchedAt: new Date().toISOString() };
}

/**
 * @param {string[]} tickers
 * @param {number} [concurrency=6]
 */
export async function fetchUniverseStocks(tickers, concurrency = 6) {
  const unique = [...new Set(tickers.map((t) => t.toUpperCase()))];
  const results = await mapPool(unique, async (ticker, index) => {
    try {
      const stock = await fetchStockHistory(ticker);
      return { ok: true, stock };
    } catch (err) {
      return { ok: false, ticker, error: err.message, index };
    }
  }, concurrency);

  const stocks = [];
  const failed = [];

  for (const r of results) {
    if (r.ok) stocks.push(r.stock);
    else failed.push({ ticker: r.ticker, error: r.error });
  }

  return {
    stocks,
    failed,
    fetchedAt: new Date().toISOString(),
    source: 'yahoo-finance',
  };
}

/**
 * @param {unknown[]} items
 * @param {(item: unknown, index: number) => Promise<unknown>} fn
 * @param {number} poolSize
 */
async function mapPool(items, fn, poolSize) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(poolSize, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
