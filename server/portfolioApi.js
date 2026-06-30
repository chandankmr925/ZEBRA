/** HTTP handlers for GET/PUT /api/portfolio */

import {
  readPortfolioFromDisk,
  writePortfolioToDisk,
  normalizePositions,
} from './portfolioFile.js';

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

  try {
    if (req.method === 'GET') {
      const data = await readPortfolioFromDisk();
      res.statusCode = 200;
      res.end(JSON.stringify(data));
      return;
    }

    if (req.method === 'PUT') {
      const body = await readJsonBody(req);
      const positions = normalizePositions(body);
      const saved = await writePortfolioToDisk(positions);
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, ...saved }));
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
  } catch (err) {
    console.error('Portfolio API error:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to access portfolio file on disk' }));
  }
}
