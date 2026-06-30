/** HTTP handlers for live market data API */

import {
  fetchLiveQuotes,
  fetchStockHistory,
  fetchUniverseStocks,
} from './marketData.js';

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
 * @param {import('http').ServerResponse} res
 * @param {number} status
 * @param {unknown} payload
 */
function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export async function handleMarketApi(req, res) {
  const url = new URL(req.url || '/', 'http://localhost');

  try {
    if (req.method === 'GET' && url.pathname === '/api/market/quotes') {
      const tickers = (url.searchParams.get('tickers') || '')
        .split(',')
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean);
      const market = (url.searchParams.get('market') || 'US').toUpperCase();

      if (tickers.length === 0) {
        sendJson(res, 400, { error: 'tickers query param required' });
        return;
      }

      const data = await fetchLiveQuotes(tickers, 6, market);
      sendJson(res, 200, data);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/market/history') {
      const ticker = (url.searchParams.get('ticker') || '').trim().toUpperCase();
      const market = (url.searchParams.get('market') || 'US').toUpperCase();
      if (!ticker) {
        sendJson(res, 400, { error: 'ticker query param required' });
        return;
      }

      const stock = await fetchStockHistory(ticker, market);
      sendJson(res, 200, stock);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/market/universe') {
      const body = await readJsonBody(req);
      const tickers = Array.isArray(body.tickers)
        ? body.tickers.map((t) => String(t).trim().toUpperCase()).filter(Boolean)
        : [];
      const market = String(body.market || 'US').toUpperCase();

      if (tickers.length === 0) {
        sendJson(res, 400, { error: 'tickers array required in body' });
        return;
      }

      const concurrency = Math.min(Math.max(Number(body.concurrency) || 6, 1), 12);
      const data = await fetchUniverseStocks(tickers, concurrency, market);
      sendJson(res, 200, data);
      return;
    }

    sendJson(res, 404, { error: 'Market API route not found' });
  } catch (err) {
    console.error('Market API error:', err);
    sendJson(res, 500, { error: err.message || 'Market data fetch failed' });
  }
}
