/** HTTP handlers for GET/PUT /api/portfolio (per authenticated user) */

import { requireAuth } from './auth/requestAuth.js';
import { normalizePositions } from './portfolioFile.js';
import { readUserPortfolio, writeUserPortfolio } from './userPortfolioFile.js';

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<unknown>}
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export async function handlePortfolioApi(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const url = new URL(req.url || '/', 'http://localhost');
  const market = (url.searchParams.get('market') || 'US').toUpperCase();

  try {
    const auth = await requireAuth(req);

    if (req.method === 'GET') {
      const data = await readUserPortfolio(auth.userId);
      const positions = data.markets[market] ?? data.markets.US ?? [];
      res.statusCode = 200;
      res.end(JSON.stringify({ exists: data.exists, market, positions, markets: data.markets }));
      return;
    }

    if (req.method === 'PUT') {
      const body = await readJsonBody(req);
      const marketId = String(body.market || market).toUpperCase();
      const positions = normalizePositions(body);
      const saved = await writeUserPortfolio(auth.userId, marketId, positions);
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, market: marketId, ...saved }));
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
  } catch (err) {
    const status = err.statusCode || 500;
    if (status >= 500) console.error('Portfolio API error:', err);
    res.statusCode = status;
    res.end(JSON.stringify({ error: err.message || 'Failed to access portfolio' }));
  }
}
