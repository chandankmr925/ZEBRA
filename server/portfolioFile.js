/** Read/write portfolio JSON on disk (project data/ folder) */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

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

async function ensureDataDir() {
  await fs.mkdir(path.dirname(PORTFOLIO_FILE), { recursive: true });
}

/** @returns {Promise<{ exists: boolean, positions: import('../src/types.js').Position[] }>} */
export async function readPortfolioFromDisk() {
  await ensureDataDir();

  try {
    const raw = await fs.readFile(PORTFOLIO_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return { exists: true, positions: normalizePositions(parsed) };
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
      return { exists: false, positions: [] };
    }
    throw err;
  }
}

/**
 * @param {import('../src/types.js').Position[]} positions
 */
export async function writePortfolioToDisk(positions) {
  await ensureDataDir();

  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    positions: positions.map(({ ticker, buyPrice, quantity, addedAt }) => ({
      ticker,
      buyPrice,
      quantity,
      addedAt,
    })),
  };

  await fs.writeFile(PORTFOLIO_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
  return payload;
}
