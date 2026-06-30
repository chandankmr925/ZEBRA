/** Per-user portfolio files under data/users/{userId}/portfolio.json */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { MARKET_IDS } from '../src/config/markets.js';
import { normalizePositions, parsePortfolioFile, PORTFOLIO_FILE } from './portfolioFile.js';
import { USERS_DIR } from './auth/userStore.js';

/**
 * @param {string} userId
 */
function userPortfolioPath(userId) {
  return path.join(USERS_DIR, userId, 'portfolio.json');
}

/**
 * @param {string} userId
 * @returns {Promise<{ exists: boolean, markets: Record<string, import('../src/types.js').Position[]> }>}
 */
export async function readUserPortfolio(userId) {
  const filePath = userPortfolioPath(userId);

  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return { exists: true, markets: parsePortfolioFile(parsed) };
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
      const empty = Object.fromEntries(MARKET_IDS.map((id) => [id, []]));
      return { exists: false, markets: empty };
    }
    throw err;
  }
}

/**
 * @param {string} userId
 * @param {string} marketId
 * @param {import('../src/types.js').Position[]} positions
 */
export async function writeUserPortfolio(userId, marketId, positions) {
  const filePath = userPortfolioPath(userId);
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const existing = await readUserPortfolio(userId);
  const markets = existing.markets;
  markets[marketId] = normalizePositions(positions);

  const payload = {
    version: 2,
    userId,
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

  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
  return payload;
}

/**
 * Import legacy shared portfolio.json into a new user's file (one-time).
 * @param {string} userId
 */
export async function migrateLegacyPortfolioIfNeeded(userId) {
  const userPath = userPortfolioPath(userId);
  try {
    await fs.access(userPath);
    return false;
  } catch {
    /* user has no portfolio yet */
  }

  try {
    const raw = await fs.readFile(PORTFOLIO_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    const markets = parsePortfolioFile(parsed);
    const hasPositions = MARKET_IDS.some((id) => (markets[id]?.length ?? 0) > 0);
    if (!hasPositions) return false;

    await fs.mkdir(path.dirname(userPath), { recursive: true });
    const payload = {
      version: 2,
      userId,
      migratedFrom: 'portfolio.json',
      updatedAt: new Date().toISOString(),
      markets: Object.fromEntries(
        MARKET_IDS.map((id) => [
          id,
          { positions: markets[id] ?? [] },
        ])
      ),
    };
    await fs.writeFile(userPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
    return true;
  } catch {
    return false;
  }
}
