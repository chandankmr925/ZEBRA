/**
 * Production server: serves built app + portfolio file API.
 * Portfolio is persisted to data/portfolio.json on disk.
 */

import { createServer } from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleAuthApi } from './server/authApi.js';
import { handlePortfolioApi } from './server/portfolioApi.js';
import { handleMarketApi } from './server/marketApi.js';
import { handleRecommendApi } from './server/recommendApi.js';
import { handleExplainApi } from './server/explainApi.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');
const PORT = Number(process.env.PORT) || 4173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

async function serveStatic(req, res) {
  const urlPath = req.url?.split('?')[0] || '/';
  const rel = urlPath === '/' ? '/index.html' : urlPath;
  const filePath = path.normalize(path.join(DIST, rel));

  if (!filePath.startsWith(DIST)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.end(data);
  } catch {
    try {
      const fallback = await fs.readFile(path.join(DIST, 'index.html'));
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(fallback);
    } catch {
      res.statusCode = 404;
      res.end('Not found — run npm run build first');
    }
  }
}

const server = createServer((req, res) => {
  if (req.url?.startsWith('/api/auth')) {
    handleAuthApi(req, res);
    return;
  }
  if (req.url?.startsWith('/api/portfolio')) {
    handlePortfolioApi(req, res);
    return;
  }
  if (req.url?.startsWith('/api/market')) {
    handleMarketApi(req, res);
    return;
  }
  if (req.url?.startsWith('/api/recommend')) {
    handleRecommendApi(req, res);
    return;
  }
  if (req.url?.startsWith('/api/explain')) {
    handleExplainApi(req, res);
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`S&P 500 Screener running at http://localhost:${PORT}`);
  console.log(`User portfolios: ${path.join(__dirname, 'data', 'users')}`);
});
