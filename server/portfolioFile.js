/** Read/write portfolio JSON on disk — separate ledgers per market */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { MARKET_IDS } from '../src/config/markets.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PORTFOLIO_FILE = path.join(ROOT, 'data', 'portfolio.json');

/**
 * @param {unknown} data
 * @returns {import('../src/types.js').Position[]}
 */
export function normalizePositions(data) {
  const list = Array.isArray(data) ? data : data?.positions;
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
 * @param {unknown} parsed
 * @returns {Record<string, import('../src/types.js').Position[]>}
 */
export function parsePortfolioFile(parsed) {
  /** @type {Record<string, import('../src/types.js').Position[]>} */
  const result = {};
  for (const id of MARKET_IDS) {
    result[id] = [];
  }

  if (!parsed || typeof parsed !== 'object') return result;

  if (parsed.version === 2 && parsed.markets && typeof parsed.markets === 'object') {
    for (const id of MARKET_IDS) {
      result[id] = normalizePositions(parsed.markets[id]?.positions ?? []);
    }
    return result;
  }

  // v1 migration: legacy flat positions → US ledger
  result.US = normalizePositions(parsed);
  return result;
}

async function ensureDataDir() {
  await fs.mkdir(path.dirname(PORTFOLIO_FILE), { recursive: true });
}

/** @returns {Promise<{ exists: boolean, markets: Record<string, import('../src/types.js').Position[]> }>} */
export async function readPortfolioFromDisk() {
  await ensureDataDir();

  try {
    const raw = await fs.readFile(PORTFOLIO_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    const markets = parsePortfolioFile(parsed);
    return { exists: true, markets };
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
      const empty = {};
      for (const id of MARKET_IDS) empty[id] = [];
      return { exists: false, markets: empty };
    }
    throw err;
  }
}

/**
 * @param {string} marketId
 * @param {import('../src/types.js').Position[]} positions
 */
export async function writePortfolioToDisk(marketId, positions) {
  await ensureDataDir();

  const existing = await readPortfolioFromDisk();
  const markets = existing.markets;
  markets[marketId] = normalizePositions(positions);

  const payload = {
    version: 2,
    updatedAt: new Date().toISOString(),
    markets: Object.fromEntries(
      MARKET_IDS.map((id) => [
        id,
        {
          positions: (markets[id] ?? []).map(({ ticker, buyPrice, quantity, addedAt }) => ({
            ticker,
            buyPrice,
            quantity,
            addedAt,
          })),
        },
      ])
    ),
  };

  await fs.writeFile(PORTFOLIO_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
  return payload;
}
